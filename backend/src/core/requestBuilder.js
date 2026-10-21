// STATUS: UPDATED
// File: src/core/requestBuilder.js

import { normalizeHeaders, normalizeMethod } from "../utils/normalization.js";

const normalizeAuthOrigin = (value) => {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value !== "string" || !value.trim()) {
    throw new TypeError("Authenticated request origin is invalid.");
  }

  let parsed;

  try {
    parsed = new URL(value);
  } catch {
    throw new TypeError("Authenticated request origin is invalid.");
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
    throw new TypeError(
      "Authenticated request origin must be a canonical HTTP or HTTPS origin.",
    );
  }

  return parsed.origin;
};

const validateAuthenticationOptions = ({ authOrigin, resolveHeaders }) => {
  if (resolveHeaders !== null && typeof resolveHeaders !== "function") {
    throw new TypeError("resolveHeaders must be a function when provided.");
  }

  const normalizedAuthOrigin = normalizeAuthOrigin(authOrigin);

  if (normalizedAuthOrigin && resolveHeaders === null) {
    throw new TypeError(
      "An authenticated origin requires a trusted header resolver.",
    );
  }

  if (normalizedAuthOrigin === null && resolveHeaders !== null) {
    throw new TypeError(
      "A trusted header resolver requires an authenticated origin.",
    );
  }

  return {
    authOrigin: normalizedAuthOrigin,
    resolveHeaders,
  };
};

const createRequest = ({
  url,
  method = "GET",
  headers = {},
  body = undefined,
  data = undefined,
  params = undefined,
  timeoutMs,
  signal = undefined,
  scope = null,
  maxRedirects,
  responseType = "text",
  metadata = {},

  // Internal-only options. Supply these from trusted application code.
  authOrigin = null,
  resolveHeaders = null,
}) => {
  if (typeof url !== "string" || url.trim().length === 0) {
    throw new TypeError("Request URL is required.");
  }

  if (
    metadata === null ||
    typeof metadata !== "object" ||
    Array.isArray(metadata)
  ) {
    throw new TypeError("Request metadata must be an object.");
  }

  const authenticationOptions = validateAuthenticationOptions({
    authOrigin,
    resolveHeaders,
  });

  const normalizedMethod = normalizeMethod(method);

  return Object.freeze({
    url: url.trim(),
    method: normalizedMethod,
    headers: normalizeHeaders(headers),
    body,
    data,
    params,
    timeoutMs,
    signal,
    scope,
    maxRedirects,
    responseType,
    metadata: { ...metadata },
    ...authenticationOptions,
  });
};

const createJsonRequest = ({
  url,
  method = "GET",
  headers = {},
  body,
  data,
  params,
  timeoutMs,
  signal = undefined,
  scope = null,
  maxRedirects,
  metadata = {},
  authOrigin = null,
  resolveHeaders = null,
}) =>
  createRequest({
    url,
    method,
    headers: {
      accept: "application/json",
      ...headers,
    },
    body,
    data,
    params,
    timeoutMs,
    signal,
    scope,
    maxRedirects,
    responseType: "json",
    metadata,
    authOrigin,
    resolveHeaders,
  });

const createHeadRequest = ({
  url,
  headers = {},
  timeoutMs,
  signal = undefined,
  scope = null,
  maxRedirects,
  metadata = {},
  authOrigin = null,
  resolveHeaders = null,
}) =>
  createRequest({
    url,
    method: "HEAD",
    headers,
    timeoutMs,
    signal,
    scope,
    maxRedirects,
    metadata,
    authOrigin,
    resolveHeaders,
  });

export { createRequest, createJsonRequest, createHeadRequest };
