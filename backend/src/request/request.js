// STATUS: UPDATED

import {
  executeRequest,
} from '../core/httpClient.js';

import {
  createRequest,
} from '../core/requestBuilder.js';

const request = async (
  options = {},
) => {
  const requestDefinition =
    createRequest(options);

  const startedAt =
    Date.now();

  const response =
    await executeRequest(
      requestDefinition,
    );

  return {
    ...response,

    durationMs:
      Date.now() -
      startedAt,

    request: {
      url:
        requestDefinition.url,

      method:
        requestDefinition.method,

      headers:
        requestDefinition.headers,
    },
  };
};

const get = async (
  url,
  options = {},
) =>
  request({
    ...options,

    url,

    method:
      'GET',
  });

const post = async (
  url,
  body,
  options = {},
) =>
  request({
    ...options,

    url,

    method:
      'POST',

    body,
  });

const head = async (
  url,
  options = {},
) =>
  request({
    ...options,

    url,

    method:
      'HEAD',
  });

export {
  request,
  get,
  post,
  head,
};