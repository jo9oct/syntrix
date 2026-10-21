
/*
 * STATUS: UPDATED
 * File: src/request/request.js
 */

import { executeRequest } from "../core/httpClient.js";
import { createRequest } from "../core/requestBuilder.js";

const SENSITIVE_HEADERS = new Set([
  "authorization",
  "proxy-authorization",
  "cookie",
  "set-cookie",
  "x-api-key",
  "x-auth-token",
  "x-access-token",
  "x-csrf-token",
  "x-xsrf-token",
]);

const SENSITIVE_HEADER_PATTERN =
  /(?:token|secret|password|credential|session|auth)/i;

const isSensitiveHeader = (name) => {
  const normalized = String(name).toLowerCase();

  return (
    SENSITIVE_HEADERS.has(normalized) ||
    SENSITIVE_HEADER_PATTERN.test(normalized)
  );
};

const redactRequestHeaders = (headers = {}) => {
  if (
    !headers ||
    typeof headers !== "object" ||
    Array.isArray(headers)
  ) {
    return {};
  }

  const sanitized = {};

  for (const [name, value] of Object.entries(headers)) {
    sanitized[name] = isSensitiveHeader(name)
      ? "[REDACTED]"
      : value;
  }

  return sanitized;
};

const sanitizeRequestUrl = (value) => {
  try {
    const url = new URL(value);

    if (!["http:", "https:"].includes(url.protocol)) {
      return null;
    }

    // Never expose embedded URL credentials or fragments.
    url.username = "";
    url.password = "";
    url.hash = "";

    // Redact query values while retaining parameter names.
    for (const name of [...url.searchParams.keys()]) {
      url.searchParams.set(name, "[REDACTED]");
    }

    return url.toString();
  } catch {
    return null;
  }
};

const validateTrustedTransport = ({
  authOrigin,
  resolveHeaders,
}) => {
  if (
    authOrigin !== null &&
    (typeof authOrigin !== "string" || !authOrigin.trim())
  ) {
    throw new TypeError(
      "authOrigin must be a non-empty string when provided.",
    );
  }

  if (
    resolveHeaders !== null &&
    typeof resolveHeaders !== "function"
  ) {
    throw new TypeError(
      "resolveHeaders must be a function when provided.",
    );
  }

  if (authOrigin === null && resolveHeaders !== null) {
    throw new Error(
      "authOrigin is required when authenticated headers are resolved.",
    );
  }

  if (authOrigin !== null && resolveHeaders === null) {
    throw new Error(
      "A trusted header resolver is required for authenticated requests.",
    );
  }

  if (authOrigin === null) {
    return;
  }

  let parsedOrigin;

  try {
    parsedOrigin = new URL(authOrigin);
  } catch {
    throw new Error("Authenticated request origin is invalid.");
  }

  if (
    !["http:", "https:"].includes(parsedOrigin.protocol) ||
    parsedOrigin.username ||
    parsedOrigin.password ||
    parsedOrigin.pathname !== "/" ||
    parsedOrigin.search ||
    parsedOrigin.hash ||
    parsedOrigin.origin !== authOrigin
  ) {
    throw new Error(
      "Authenticated request origin must be a canonical HTTP or HTTPS origin.",
    );
  }
};

const request = async (options = {}) => {
  if (
    !options ||
    typeof options !== "object" ||
    Array.isArray(options)
  ) {
    throw new TypeError("Request options must be an object.");
  }

  /*
   * Internal transport controls must only be supplied by trusted
   * application code, never copied from user API input.
   */
  const {
    authOrigin = null,
    resolveHeaders = null,
    ...requestOptions
  } = options;

  validateTrustedTransport({
    authOrigin,
    resolveHeaders,
  });

  const requestDefinition = createRequest(requestOptions);

  const startedAt = Date.now();

  const response = await executeRequest({
    ...requestDefinition,
    authOrigin,
    resolveHeaders,
    data:
      requestDefinition.data !== undefined
        ? requestDefinition.data
        : requestDefinition.body,
  });

  return {
    ...response,
    durationMs: Date.now() - startedAt,
    request: {
      url: sanitizeRequestUrl(requestDefinition.url),
      method: requestDefinition.method,
      headers: redactRequestHeaders(requestDefinition.headers),
    },
  };
};

const get = (url, options = {}) =>
  request({
    ...options,
    url,
    method: "GET",
  });

const post = (url, body, options = {}) =>
  request({
    ...options,
    url,
    method: "POST",
    body,
  });

const head = (url, options = {}) =>
  request({
    ...options,
    url,
    method: "HEAD",
  });

export { request, get, post, head };
