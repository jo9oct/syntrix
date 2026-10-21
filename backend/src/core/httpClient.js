
/*
 * STATUS: UPDATED
 * File: src/core/httpClient.js
 */

import http from "node:http";
import https from "node:https";
import net from "node:net";
import axios from "axios";

import environment from "../config/environment.js";
import { securityLimits, sensitiveHeaders } from "../config/security.js";

import { assertUrlInScope } from "./scope.js";
import { isHttpUrl } from "../utils/url.js";
import {
  assertSafeAddress,
  resolveHostname,
} from "../recon/shared/resolver.js";
import { followRedirects } from "./redirectFlow.js";

const MIN_REQUEST_TIMEOUT_MS = 100;
const MAX_REQUEST_TIMEOUT_MS = 120000;

const AUTHENTICATION_HEADER_NAMES = new Set([
  ...[...sensitiveHeaders].map((name) => String(name).toLowerCase()),
  "authorization",
  "proxy-authorization",
  "cookie",
  "set-cookie",
  "x-api-key",
  "x-access-token",
  "x-refresh-token",
  "x-auth-token",
  "x-csrf-token",
  "x-xsrf-token",
  "x-forwarded-authorization",
]);

const normalizeOrigin = (value) => {
  if (typeof value !== "string" || !value.trim()) {
    return null;
  }

  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
};

const normalizeHostname = (value) => {
  if (typeof value !== "string") {
    throw new Error("Hostname is invalid.");
  }

  let hostname = value.trim().toLowerCase();

  if (hostname.startsWith("[") && hostname.endsWith("]")) {
    hostname = hostname.slice(1, -1);
  }

  return hostname.replace(/\.$/, "");
};

const getUrlHostname = (value) =>
  normalizeHostname(new URL(value).hostname);

const createCancellationError = () => {
  const error = new Error("Request was cancelled.");

  error.name = "AbortError";
  error.code = "ERR_CANCELED";

  return error;
};

const throwIfAborted = (signal) => {
  if (signal?.aborted) {
    throw createCancellationError();
  }
};

/*
 * DNS lookup cannot be cancelled directly through Node's lookup API.
 * Stop waiting when the signal aborts. A late DNS result must never
 * initiate a network request.
 */
const resolveHostnameWithSignal = (hostname, signal) => {
  throwIfAborted(signal);

  if (!signal) {
    return resolveHostname(hostname);
  }

  return new Promise((resolve, reject) => {
    let settled = false;

    const cleanup = () => {
      signal.removeEventListener("abort", onAbort);
    };

    const finish = (callback, value) => {
      if (settled) {
        return;
      }

      settled = true;
      cleanup();
      callback(value);
    };

    const onAbort = () => {
      finish(reject, createCancellationError());
    };

    signal.addEventListener("abort", onAbort, { once: true });

    if (signal.aborted) {
      onAbort();
      return;
    }

    Promise.resolve()
      .then(() => resolveHostname(hostname))
      .then(
        (result) => finish(resolve, result),
        (error) => finish(reject, error),
      );
  });
};

const redactHeaders = (headers = {}) => {
  const output = Object.create(null);

  if (
    !headers ||
    typeof headers !== "object" ||
    Array.isArray(headers)
  ) {
    return output;
  }

  for (const [key, value] of Object.entries(headers)) {
    output[key] = AUTHENTICATION_HEADER_NAMES.has(
      key.toLowerCase(),
    )
      ? "[REDACTED]"
      : value;
  }

  return output;
};

const validateTimeout = (value) => {
  if (
    !Number.isSafeInteger(value) ||
    value < MIN_REQUEST_TIMEOUT_MS ||
    value > MAX_REQUEST_TIMEOUT_MS
  ) {
    throw new RangeError(
      `Request timeout must be an integer between ${MIN_REQUEST_TIMEOUT_MS} and ${MAX_REQUEST_TIMEOUT_MS} milliseconds.`,
    );
  }

  return value;
};

const validateOutboundUrl = (value) => {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error("Outbound URL is required.");
  }

  if (value.length > securityLimits.maxUrlLength) {
    throw new Error("Outbound URL exceeds the maximum allowed length.");
  }

  let parsed;

  try {
    parsed = new URL(value);
  } catch {
    throw new Error("Outbound URL is invalid.");
  }

  if (
    !isHttpUrl(value) ||
    !["http:", "https:"].includes(parsed.protocol)
  ) {
    throw new Error("Outbound requests must use HTTP or HTTPS.");
  }

  if (parsed.username || parsed.password) {
    throw new Error(
      "Outbound URLs must not contain embedded credentials.",
    );
  }

  return parsed.href;
};

const validateAuthenticatedOrigin = (value) => {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error("Authenticated request origin is invalid.");
  }

  let parsed;

  try {
    parsed = new URL(value);
  } catch {
    throw new Error("Authenticated request origin is invalid.");
  }

  if (
    !["http:", "https:"].includes(parsed.protocol) ||
    parsed.username ||
    parsed.password ||
    parsed.pathname !== "/" ||
    parsed.search ||
    parsed.hash ||
    parsed.origin !== value
  ) {
    throw new Error(
      "Authenticated request origin must be a canonical HTTP or HTTPS origin.",
    );
  }

  return parsed.origin;
};

const validateRedirectDestination = async ({
  location,
  currentUrl,
  scope = null,
  signal,
} = {}) => {
  throwIfAborted(signal);

  if (
    typeof location !== "string" ||
    !location.trim() ||
    typeof currentUrl !== "string" ||
    !currentUrl.trim()
  ) {
    throw new Error("Redirect destination is invalid.");
  }

  let nextUrl;

  try {
    nextUrl = new URL(location, currentUrl).href;
  } catch {
    throw new Error("Redirect destination is invalid.");
  }

  nextUrl = validateOutboundUrl(nextUrl);

  if (scope) {
    assertUrlInScope(nextUrl, scope);
  }

  await resolveHostnameWithSignal(getUrlHostname(nextUrl), signal);

  throwIfAborted(signal);

  return nextUrl;
};

/*
 * Fail closed if a base agent is used without request-specific,
 * validated DNS addresses. executeRequest creates a pinned agent
 * for each outbound request.
 */
const createFailClosedLookup = () =>
  (hostname, _options, callback) => {
    let normalizedHostname;

    try {
      normalizedHostname = normalizeHostname(hostname);

      // Private and prohibited IP literals must produce the
      // application's standard SSRF protection error.
      if (net.isIP(normalizedHostname) !== 0) {
        assertSafeAddress(normalizedHostname);
      }
    } catch (error) {
      callback(error);
      return;
    }

    const error = new Error(
      "A validated, request-specific DNS address is required.",
    );

    error.code = "ERR_INVALID_ARG_VALUE";
    callback(error);
  };

/*
 * Only addresses in the validated set can be returned.
 * The URL hostname remains unchanged for Host headers, TLS certificate
 * validation, and TLS SNI. Only the socket destination is pinned.
 */

const createPinnedLookup = (expectedHostname, validatedAddresses) => {
  const expected = normalizeHostname(expectedHostname);

  if (
    !expected ||
    !Array.isArray(validatedAddresses) ||
    validatedAddresses.length === 0
  ) {
    throw new Error(
      "A validated hostname and address set are required.",
    );
  }

  const uniqueAddresses = [...new Set(validatedAddresses)];

  for (const address of uniqueAddresses) {
    assertSafeAddress(address);
  }

  return (hostname, options, callback) => {
    let requestedHostname;

    try {
      requestedHostname = normalizeHostname(hostname);
    } catch (error) {
      callback(error);
      return;
    }

    if (requestedHostname !== expected) {
      const error = new Error(
        "The connection hostname does not match the validated hostname.",
      );
      error.code = "ERR_INVALID_ARG_VALUE";
      callback(error);
      return;
    }

    const family =
      typeof options === "number" ? options : options?.family || 0;

    const compatible = uniqueAddresses.filter((address) => {
      const addressFamily = net.isIP(address);
      return family === 0 || family === addressFamily;
    });

    if (compatible.length === 0) {
      const error = new Error(
        "No validated address matches the requested IP family.",
      );
      error.code = "ENOTFOUND";
      callback(error);
      return;
    }

    // Recheck DNS at connection time. Never use the newly resolved
    // addresses as socket destinations.
    resolveHostname(expected)
      .then(({ addresses }) => {
        const freshAddresses = [...new Set(addresses)];

        // Reject any change in the DNS address set. resolveHostname
        // also rejects private or otherwise prohibited addresses.
        if (
          freshAddresses.length !== uniqueAddresses.length ||
          freshAddresses.some(
            (address) => !uniqueAddresses.includes(address),
          )
        ) {
          const error = new Error(
            "The target DNS addresses changed after validation.",
          );
          error.code = "SSRF_TARGET_BLOCKED";
          error.statusCode = 403;
          throw error;
        }

        if (typeof options === "object" && options?.all) {
          callback(
            null,
            compatible.map((address) => ({
              address,
              family: net.isIP(address),
            })),
          );
          return;
        }

        callback(null, compatible[0], net.isIP(compatible[0]));
      })
      .catch((error) => {
        callback(error);
      });
  };
};

const createHttpClient = ({
  timeout = environment.http.timeoutMs,
} = {}) => {
  const validatedTimeout = validateTimeout(timeout);
  const lookup = createFailClosedLookup();

  const httpAgent = new http.Agent({
    keepAlive: false,
    lookup,
  });

  const httpsAgent = new https.Agent({
    keepAlive: false,
    lookup,
  });

  try {
    const client = axios.create({
      proxy: false,
      timeout: validatedTimeout,
      maxContentLength: environment.http.responseSizeLimitBytes,
      maxBodyLength: Math.min(
        securityLimits.maxRequestBodyBytes,
        environment.http.responseSizeLimitBytes,
      ),
      maxRedirects: 0,
      validateStatus: () => true,
      httpAgent,
      httpsAgent,
    });

    return { client, httpAgent, httpsAgent };
  } catch (error) {
    httpAgent.destroy();
    httpsAgent.destroy();

    throw error;
  }
};

const validateHeaderName = (name) => {
  if (
    typeof name !== "string" ||
    !/^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/.test(name)
  ) {
    throw new TypeError("An HTTP header name is invalid.");
  }

  return name;
};

const validateHeaderValue = (value, maxLength) => {
  if (
    typeof value !== "string" &&
    typeof value !== "number" &&
    typeof value !== "boolean"
  ) {
    throw new TypeError("An HTTP header value is invalid.");
  }

  const normalized = String(value);

  if (/[\r\n]/.test(normalized)) {
    throw new TypeError(
      "An HTTP header value contains invalid characters.",
    );
  }

  if (normalized.length > maxLength) {
    throw new TypeError(
      "An HTTP header value exceeds the allowed length.",
    );
  }

  return normalized;
};

const validateCookieHeader = (value) => {
  if (
    typeof value !== "string" ||
    /[\r\n]/.test(value) ||
    value.length > securityLimits.maxHeaderValueLength
  ) {
    throw new TypeError("The authenticated Cookie header is invalid.");
  }

  if (value.length === 0) {
    return "";
  }

  /*
   * RFC cookie-octet characters. Excludes whitespace, semicolons,
   * commas, double quotes, and backslashes from cookie values.
   */
  const validCookieName = /^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/;
  const validCookieValue = /^[\x21\x23-\x2B\x2D-\x3A\x3C-\x5B\x5D-\x7E]*$/;
  const seenNames = new Set();

  for (const pair of value.split(";")) {
    const separator = pair.indexOf("=");

    if (separator <= 0) {
      throw new TypeError(
        "The authenticated Cookie header contains an invalid cookie pair.",
      );
    }

    const name = pair.slice(0, separator).trim();
    const cookieValue = pair.slice(separator + 1).trim();

    if (
      !validCookieName.test(name) ||
      !validCookieValue.test(cookieValue) ||
      seenNames.has(name)
    ) {
      throw new TypeError(
        "The authenticated Cookie header contains an invalid cookie pair.",
      );
    }

    seenNames.add(name);
  }

  return value;
};

const resolveRequestHeaders = async ({
  url,
  headers,
  authOrigin,
  resolveHeaders,
  signal,
}) => {
  throwIfAborted(signal);

  const hasAuthenticatedTransport =
    authOrigin !== null &&
    typeof resolveHeaders === "function";

  const baseHeaders = Object.create(null);

  if (headers !== null && headers !== undefined) {
    if (
      typeof headers !== "object" ||
      Array.isArray(headers)
    ) {
      throw new TypeError("Request headers must be an object.");
    }

    for (const [rawName, value] of Object.entries(headers)) {
      const name = validateHeaderName(rawName);
      const lowerName = name.toLowerCase();

      /*
       * When authenticated transport is configured, never trust
       * caller-supplied authentication headers. The trusted resolver
       * is the only source of session cookies.
       */
      if (
        hasAuthenticatedTransport &&
        AUTHENTICATION_HEADER_NAMES.has(lowerName)
      ) {
        continue;
      }

      baseHeaders[name] = validateHeaderValue(
        value,
        securityLimits.maxHeaderValueLength,
      );
    }
  }

  /*
   * Authentication is only available on the exact origin.
   * Other in-scope URLs receive ordinary, non-authentication headers.
   */
  if (
    !hasAuthenticatedTransport ||
    normalizeOrigin(url) !== authOrigin
  ) {
    return baseHeaders;
  }

  throwIfAborted(signal);

  const additionalHeaders = await resolveHeaders({
    url,
    signal,
  });

  throwIfAborted(signal);

  if (
    !additionalHeaders ||
    typeof additionalHeaders !== "object" ||
    Array.isArray(additionalHeaders)
  ) {
    throw new TypeError("Authenticated headers must be an object.");
  }

  const cookieValues = [];

  for (const [rawName, value] of Object.entries(additionalHeaders)) {
    const name = validateHeaderName(rawName);

    if (name.toLowerCase() !== "cookie") {
      throw new TypeError(
        "Authenticated transport may provide only a Cookie header.",
      );
    }

    cookieValues.push(validateCookieHeader(value));
  }

  if (cookieValues.length > 1) {
    throw new TypeError(
      "Authenticated transport returned multiple Cookie headers.",
    );
  }

  if (cookieValues.length === 0 || cookieValues[0] === "") {
    return baseHeaders;
  }

  const effectiveHeaders = Object.create(null);

  for (const [name, value] of Object.entries(baseHeaders)) {
    if (name.toLowerCase() !== "cookie") {
      effectiveHeaders[name] = value;
    }
  }

  effectiveHeaders.Cookie = cookieValues[0];

  return effectiveHeaders;
};

const executeRequest = async ({
  url,
  method = "GET",
  headers = {},
  params,
  data,
  body,
  timeout,
  timeoutMs,
  signal,
  scope,
  maxRedirects,
  responseType = "text",
  authOrigin = null,
  resolveHeaders = null,
} = {}) => {
  const resolvedTimeout = validateTimeout(
    timeout ?? timeoutMs ?? environment.http.timeoutMs,
  );

  if (
    resolveHeaders !== null &&
    typeof resolveHeaders !== "function"
  ) {
    throw new TypeError(
      "resolveHeaders must be a function when provided.",
    );
  }

  let normalizedAuthOrigin = null;

  if (authOrigin !== null) {
    normalizedAuthOrigin = validateAuthenticatedOrigin(authOrigin);
  }

  if (normalizedAuthOrigin && resolveHeaders === null) {
    throw new Error(
      "An authenticated origin requires a trusted header resolver.",
    );
  }

  if (resolveHeaders !== null && normalizedAuthOrigin === null) {
    throw new Error(
      "A trusted header resolver requires an authenticated origin.",
    );
  }

  if (
    maxRedirects !== undefined &&
    (!Number.isInteger(maxRedirects) ||
      maxRedirects < 0 ||
      maxRedirects > securityLimits.maxRedirects)
  ) {
    throw new RangeError(
      `maxRedirects must be an integer between 0 and ${securityLimits.maxRedirects}.`,
    );
  }

  const redirectLimit = maxRedirects ?? securityLimits.maxRedirects;
  const initialUrl = validateOutboundUrl(url);

  if (scope) {
    assertUrlInScope(initialUrl, scope);
  }

  throwIfAborted(signal);

  const { client, httpAgent, httpsAgent } = createHttpClient({
    timeout: resolvedTimeout,
  });

  try {
    const result = await followRedirects({
      initialUrl,
      initialMethod: method,
      initialHeaders: headers,
      initialData: data !== undefined ? data : body,
      initialParams: params,
      maxRedirects: redirectLimit,

      request: async ({
        url: requestUrl,
        method: requestMethod,
        headers: requestHeaders,
        data: requestData,
        params: requestParams,
      }) => {
        throwIfAborted(signal);

        const validatedUrl = validateOutboundUrl(requestUrl);

        if (scope) {
          assertUrlInScope(validatedUrl, scope);
        }

        const parsedUrl = new URL(validatedUrl);
        const hostname = getUrlHostname(validatedUrl);

        /*
         * Resolve and validate DNS for each outbound request.
         * The socket may connect only to addresses in this validated set.
         */
        const resolved = await resolveHostnameWithSignal(
          hostname,
          signal,
        );

        throwIfAborted(signal);

        if (
          !resolved ||
          !Array.isArray(resolved.addresses) ||
          resolved.addresses.length === 0
        ) {
          throw new Error(
            "The target did not resolve to a validated address.",
          );
        }

        const pinnedLookup = createPinnedLookup(
          hostname,
          resolved.addresses,
        );

        const requestAgent =
          parsedUrl.protocol === "https:"
            ? new https.Agent({
                keepAlive: false,
                lookup: pinnedLookup,
              })
            : new http.Agent({
                keepAlive: false,
                lookup: pinnedLookup,
              });

        try {
          /*
           * Resolve headers only after the destination URL has been
           * validated, scoped, and DNS-checked. The resolver is invoked
           * only when the URL origin exactly matches authOrigin.
           */
          const effectiveHeaders = await resolveRequestHeaders({
            url: validatedUrl,
            headers: requestHeaders,
            authOrigin: normalizedAuthOrigin,
            resolveHeaders,
            signal,
          });

          throwIfAborted(signal);

          return await client.request({
            url: validatedUrl,
            method: requestMethod,
            headers: effectiveHeaders,
            params: requestParams,
            data: requestData,
            signal,
            responseType,
            maxRedirects: 0,
            ...(parsedUrl.protocol === "https:"
              ? { httpsAgent: requestAgent }
              : { httpAgent: requestAgent }),
          });
        } finally {
          requestAgent.destroy();
        }
      },

      validateDestination: ({ location, currentUrl }) =>
        validateRedirectDestination({
          location,
          currentUrl,
          scope,
          signal,
        }),
    });

    throwIfAborted(signal);

    const response = result.response;

    return {
      status: response.status,
      statusCode: response.status,
      headers: redactHeaders(response.headers || {}),
      data: response.data,
      body: response.data,
      url: response.request?.res?.responseUrl || result.url,
      contentType: response.headers?.["content-type"] || null,
    };
  } finally {
    httpAgent.destroy();
    httpsAgent.destroy();
  }
};

export {
  createHttpClient,
  executeRequest,
  validateOutboundUrl,
  validateRedirectDestination,
  validateTimeout,
  redactHeaders,
};
