
/* STATUS: UPDATED
 * File: src/core/redirectFlow.js
 */

import { sensitiveHeaders } from "../config/security.js";

const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);

const FORBIDDEN_REDIRECT_HEADERS = new Set([
  "host",
  "content-length",
]);

const ADDITIONAL_SENSITIVE_HEADERS = new Set([
  "authorization",
  "proxy-authorization",
  "cookie",
  "cookie2",
  "set-cookie",
  "x-api-key",
  "x-auth-token",
  "x-access-token",
  "x-refresh-token",
  "x-csrf-token",
  "x-xsrf-token",
  "x-forwarded-authorization",
]);

const REDIRECT_METHODS_TO_GET = new Set([301, 302]);

const isRedirectStatus = (status) => REDIRECT_STATUSES.has(status);

const isSensitiveHeader = (name) => {
  const normalizedName = name.toLowerCase();

  return (
    sensitiveHeaders.has(normalizedName) ||
    ADDITIONAL_SENSITIVE_HEADERS.has(normalizedName)
  );
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

const validateHeadersObject = (headers) => {
  if (
    headers === null ||
    typeof headers !== "object" ||
    Array.isArray(headers)
  ) {
    throw new TypeError("HTTP request headers must be an object.");
  }
};

const stripSensitiveHeaders = (headers = {}) => {
  validateHeadersObject(headers);

  const result = Object.create(null);

  for (const [key, value] of Object.entries(headers)) {
    validateHeaderName(key);

    const normalizedKey = key.toLowerCase();

    if (
      isSensitiveHeader(normalizedKey) ||
      FORBIDDEN_REDIRECT_HEADERS.has(normalizedKey)
    ) {
      continue;
    }

    result[key] = value;
  }

  return result;
};

const removeContentLength = (headers = {}) => {
  validateHeadersObject(headers);

  const result = Object.create(null);

  for (const [key, value] of Object.entries(headers)) {
    validateHeaderName(key);

    if (key.toLowerCase() !== "content-length") {
      result[key] = value;
    }
  }

  return result;
};

const normalizeMethod = (method) => {
  if (typeof method !== "string" || !method.trim()) {
    throw new TypeError("HTTP request method is invalid.");
  }

  const normalized = method.trim().toUpperCase();

  if (!/^[!#$%&'*+\-.^_`|~0-9A-Z]+$/.test(normalized)) {
    throw new TypeError("HTTP request method is invalid.");
  }

  return normalized;
};


const normalizeHeaders = (headers = {}) => {
  validateHeadersObject(headers);

  const normalized = Object.create(null);
  const seenNames = new Set();

  for (const [name, value] of Object.entries(headers)) {
    validateHeaderName(name);

    const lowerName = name.toLowerCase();

    if (seenNames.has(lowerName)) {
      throw new TypeError(
        `Duplicate HTTP header after normalization: ${lowerName}.`,
      );
    }

    seenNames.add(lowerName);

    if (
      typeof value !== "string" &&
      typeof value !== "number" &&
      typeof value !== "boolean"
    ) {
      throw new TypeError(
        `HTTP header value for "${lowerName}" is invalid.`,
      );
    }

    const normalizedValue = String(value);

    if (/[\r\n]/.test(normalizedValue)) {
      throw new TypeError(
        `HTTP header value for "${lowerName}" contains invalid characters.`,
      );
    }

    // Preserve original spelling; use lowercase only for validation.
    normalized[name] = normalizedValue;
  }

  return normalized;
};

const normalizeRedirectUrl = (value, message) => {
  if (typeof value !== "string" || !value.trim()) {
    throw new TypeError(message);
  }

  let parsed;

  try {
    parsed = new URL(value);
  } catch {
    throw new TypeError(message);
  }

  if (
    !["http:", "https:"].includes(parsed.protocol) ||
    parsed.username ||
    parsed.password
  ) {
    throw new TypeError(message);
  }

  return parsed;
};

const prepareRedirectRequest = ({
  response,
  currentUrl,
  nextUrl,
  method,
  headers = {},
  data,
  params,
} = {}) => {
  const previous = normalizeRedirectUrl(
    currentUrl,
    "Current redirect URL is invalid.",
  );

  const next = normalizeRedirectUrl(
    nextUrl,
    "Next redirect URL is invalid.",
  );

  let nextMethod = normalizeMethod(method || "GET");
  let nextHeaders = normalizeHeaders(headers);
  let nextData = data;
  let nextParams = params;

  // Sensitive headers must never cross origins.
  if (previous.origin !== next.origin) {
    nextHeaders = stripSensitiveHeaders(nextHeaders);
  }

  const status = response?.status;

  // HTTP 303 changes every non-HEAD method to GET.
  if (status === 303 && nextMethod !== "HEAD") {
    nextMethod = "GET";
    nextData = undefined;
    nextParams = undefined;
    nextHeaders = stripSensitiveHeaders(nextHeaders);
  } else if (
    REDIRECT_METHODS_TO_GET.has(status) &&
    nextMethod === "POST"
  ) {
    // HTTP 301/302 commonly convert POST to GET.
    nextMethod = "GET";
    nextData = undefined;
    nextParams = undefined;
    nextHeaders = stripSensitiveHeaders(nextHeaders);
  }

  // The HTTP client must calculate a fresh content length if needed.
  nextHeaders = removeContentLength(nextHeaders);

  return {
    method: nextMethod,
    headers: nextHeaders,
    data: nextData,
    params: nextParams,
  };
};

const validateRedirectState = (state, fallback) => {
  if (!state || typeof state !== "object" || Array.isArray(state)) {
    throw new TypeError("Redirect callback returned invalid state.");
  }

  const method = normalizeMethod(state.method ?? fallback.method);

  const headers = normalizeHeaders(
    state.headers ?? fallback.headers,
  );

  const data = Object.hasOwn(state, "data")
    ? state.data
    : fallback.data;

  const params = Object.hasOwn(state, "params")
    ? state.params
    : fallback.params;

  return {
    method,
    headers,
    data,
    params,
  };
};

const followRedirects = async ({
  initialUrl,
  initialMethod = "GET",
  initialHeaders = {},
  initialData,
  initialParams,
  maxRedirects = 5,
  request,
  validateDestination,
  onRedirect,
} = {}) => {
  if (typeof request !== "function") {
    throw new TypeError("A request function is required.");
  }

  if (typeof validateDestination !== "function") {
    throw new TypeError("A redirect validator is required.");
  }

  if (
    !Number.isInteger(maxRedirects) ||
    maxRedirects < 0 ||
    maxRedirects > 20
  ) {
    throw new TypeError(
      "maxRedirects must be an integer between 0 and 20.",
    );
  }

  let currentUrl = normalizeRedirectUrl(
    initialUrl,
    "Initial request URL is invalid.",
  ).toString();

  let currentMethod = normalizeMethod(initialMethod);
  let currentHeaders = normalizeHeaders(initialHeaders);
  let currentData = initialData;
  let currentParams = initialParams;
  let redirectCount = 0;

  while (true) {
    const response = await request({
      url: currentUrl,
      method: currentMethod,
      headers: currentHeaders,
      data: currentData,
      params: currentParams,
    });

    const location = response?.headers?.location;

    if (
      !isRedirectStatus(response?.status) ||
      typeof location !== "string" ||
      !location.trim()
    ) {
      return {
        response,
        url: currentUrl,
        redirectCount,
      };
    }

    if (redirectCount >= maxRedirects) {
      const error = new Error("Maximum redirect count exceeded.");

      error.code = "MAX_REDIRECTS_EXCEEDED";
      throw error;
    }

    // The destination must pass the caller's scope, URL, and safety checks
    // before another outbound request is made.
    const validatedDestination = await validateDestination({
      location,
      currentUrl,
    });

    const nextUrl = normalizeRedirectUrl(
      validatedDestination,
      "Redirect validator returned an invalid URL.",
    ).toString();

    const previousOrigin = new URL(currentUrl).origin;
    const nextOrigin = new URL(nextUrl).origin;

    const redirectState = prepareRedirectRequest({
      response,
      currentUrl,
      nextUrl,
      method: currentMethod,
      headers: currentHeaders,
      data: currentData,
      params: currentParams,
    });

    let nextState = redirectState;

    if (typeof onRedirect === "function") {
      const callbackState = await onRedirect({
        response,
        currentUrl,
        nextUrl,
        method: redirectState.method,
        headers: { ...redirectState.headers },
        data: redirectState.data,
        params: redirectState.params,
      });

      if (callbackState !== undefined && callbackState !== null) {
        nextState = validateRedirectState(
          callbackState,
          redirectState,
        );
      }
    }

    // Enforce security again after the callback so it cannot re-add
    // cookies, authorization headers, or other sensitive credentials.
    if (previousOrigin !== nextOrigin) {
      nextState.headers = stripSensitiveHeaders(nextState.headers);
    }

    // Never allow callbacks to restore a stale content length or host.
    nextState.headers = removeContentLength(nextState.headers);

    currentMethod = nextState.method;
    currentHeaders = nextState.headers;
    currentData = nextState.data;
    currentParams = nextState.params;
    currentUrl = nextUrl;

    redirectCount += 1;
  }
};

export {
  followRedirects,
  prepareRedirectRequest,
};
