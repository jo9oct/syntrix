// STATUS: UPDATED

import {
  normalizeHeaders,
  normalizeMethod,
} from '../utils/normalization.js';

const createRequest = ({
  url,
  method = 'GET',
  headers = {},
  body = undefined,
  timeoutMs,
  signal = undefined,
  metadata = {},
}) => {
  if (
    typeof url !== 'string' ||
    url.trim().length === 0
  ) {
    throw new TypeError(
      'Request URL is required.',
    );
  }

  const normalizedMethod =
    normalizeMethod(method);

  return Object.freeze({
    url:
      url.trim(),

    method:
      normalizedMethod,

    headers:
      normalizeHeaders(headers),

    body,

    timeoutMs,

    signal,

    metadata: {
      ...metadata,
    },
  });
};

const createJsonRequest = ({
  url,
  method = 'GET',
  headers = {},
  body,
  timeoutMs,
  signal = undefined,
  metadata = {},
}) =>
  createRequest({
    url,
    method,

    headers: {
      accept:
        'application/json',

      ...headers,
    },

    body,

    timeoutMs,

    signal,

    metadata,
  });

const createHeadRequest = ({
  url,
  headers = {},
  timeoutMs,
  signal = undefined,
  metadata = {},
}) =>
  createRequest({
    url,

    method:
      'HEAD',

    headers,

    timeoutMs,

    signal,

    metadata,
  });

export {
  createRequest,
  createJsonRequest,
  createHeadRequest,
};