// STATUS: UPDATED

import { normalizeHeaders, normalizeMethod } from "../utils/normalization.js";

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
}) => {
  if (typeof url !== "string" || url.trim().length === 0) {
    throw new TypeError("Request URL is required.");
  }

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
  });

const createHeadRequest = ({
  url,
  headers = {},
  timeoutMs,
  signal = undefined,
  scope = null,
  maxRedirects,
  metadata = {},
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
  });

export { createRequest, createJsonRequest, createHeadRequest };
