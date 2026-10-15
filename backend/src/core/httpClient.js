/* STATUS: UPDATED */
/* FILE: src/core/httpClient.js */

import http from "node:http";
import https from "node:https";
import axios from "axios";

import environment from "../config/environment.js";

import { securityLimits, sensitiveHeaders } from "../config/security.js";

import { assertUrlInScope } from "./scope.js";
import { isHttpUrl } from "../utils/url.js";
import { resolveHostname } from "../recon/shared/resolver.js";

import { followRedirects, prepareRedirectRequest } from "./redirectFlow.js";

const MIN_REQUEST_TIMEOUT_MS = 100;
const MAX_REQUEST_TIMEOUT_MS = 120000;

const redactHeaders = (headers = {}) => {
  const output = {};

  for (const [key, value] of Object.entries(headers)) {
    output[key] = sensitiveHeaders.has(key.toLowerCase())
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

  if (!isHttpUrl(value) || !["http:", "https:"].includes(parsed.protocol)) {
    throw new Error("Outbound requests must use HTTP or HTTPS.");
  }

  if (parsed.username || parsed.password) {
    throw new Error("Outbound URLs must not contain embedded credentials.");
  }

  return parsed.href;
};

const validateRedirectDestination = async ({
  location,
  currentUrl,
  scope = null,
} = {}) => {
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

  await resolveHostname(new URL(nextUrl).hostname);

  return nextUrl;
};

/**
 * Validate DNS answers before Node connects.
 * Preserve the hostname for TLS certificate verification and SNI.
 */
const createValidatedLookup = () => (hostname, options, callback) => {
  resolveHostname(hostname)
    .then(({ addresses }) => {
      const family = options?.family || 0;

      const compatible = addresses.filter((address) => {
        const version = address.includes(":") ? 6 : 4;

        return !family || version === family;
      });

      if (!compatible.length) {
        const error = new Error(
          "No validated address matches the requested IP family.",
        );

        error.code = "ENOTFOUND";
        callback(error);
        return;
      }

      if (options?.all) {
        callback(
          null,
          compatible.map((address) => ({
            address,
            family: address.includes(":") ? 6 : 4,
          })),
        );

        return;
      }

      const address = compatible[0];

      callback(null, address, address.includes(":") ? 6 : 4);
    })
    .catch((error) => callback(error));
};

const createHttpClient = ({ timeout = environment.http.timeoutMs } = {}) => {
  const validatedTimeout = validateTimeout(timeout);
  const lookup = createValidatedLookup();

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

    return {
      client,
      httpAgent,
      httpsAgent,
    };
  } catch (error) {
    httpAgent.destroy();
    httpsAgent.destroy();

    throw error;
  }
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
} = {}) => {
  const resolvedTimeout = validateTimeout(
    timeout ?? timeoutMs ?? environment.http.timeoutMs,
  );

  const redirectLimit =
    Number.isInteger(maxRedirects) && maxRedirects >= 0
      ? Math.min(maxRedirects, securityLimits.maxRedirects)
      : securityLimits.maxRedirects;

  const initialUrl = validateOutboundUrl(url);

  if (scope) {
    assertUrlInScope(initialUrl, scope);
  }

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
        if (signal?.aborted) {
          const error = new Error("Request was cancelled.");
          error.name = "AbortError";
          error.code = "ERR_CANCELED";

          throw error;
        }

        const validatedUrl = validateOutboundUrl(requestUrl);

        if (scope) {
          assertUrlInScope(validatedUrl, scope);
        }

        // Validate DNS before every outbound request.
        await resolveHostname(new URL(validatedUrl).hostname);

        return client.request({
          url: validatedUrl,
          method: requestMethod,
          headers: requestHeaders,
          params: requestParams,
          data: requestData,
          signal,
          responseType,
          maxRedirects: 0,
        });
      },

      validateDestination: ({ location, currentUrl }) =>
        validateRedirectDestination({
          location,
          currentUrl,
          scope,
        }),

      onRedirect: (redirect) => prepareRedirectRequest(redirect),
    });

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
