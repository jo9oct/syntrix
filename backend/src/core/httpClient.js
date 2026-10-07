// STATUS: UPDATED

import axios from 'axios';

import environment from '../config/environment.js';

import {
  securityLimits,
  sensitiveHeaders,
} from '../config/security.js';

import {
  assertUrlInScope,
} from './scope.js';

import {
  isHttpUrl,
} from '../utils/url.js';

const redactHeaders = (
  headers = {},
) => {
  const output = {};

  for (
    const [
      key,
      value,
    ] of Object.entries(
      headers,
    )
  ) {
    if (
      sensitiveHeaders.has(
        key.toLowerCase(),
      )
    ) {
      output[key] =
        '[REDACTED]';
    } else {
      output[key] =
        value;
    }
  }

  return output;
};

const validateOutboundUrl = (
  url,
) => {
  if (
    typeof url !== 'string' ||
    !url.trim()
  ) {
    throw new Error(
      'Outbound URL is required.',
    );
  }

  if (
    url.length >
    securityLimits.maxUrlLength
  ) {
    throw new Error(
      'Outbound URL exceeds the maximum allowed length.',
    );
  }

  if (
    !isHttpUrl(url)
  ) {
    throw new Error(
      'Outbound requests must use HTTP or HTTPS.',
    );
  }

  return url;
};

const createHttpClient = ({
  scope = null,

  timeout =
    environment.http
      .timeoutMs,

  maxRedirects =
    securityLimits.maxRedirects,
} = {}) => {
  const client =
    axios.create({
      timeout,

      maxContentLength:
        environment.http
          .responseSizeLimitBytes,

      maxBodyLength:
        environment.http
          .responseSizeLimitBytes,

      maxRedirects,

      validateStatus:
        () => true,
    });

  client.interceptors.request.use(
    (config) => {
      const url =
        validateOutboundUrl(
          config.url,
        );

      if (scope) {
        assertUrlInScope(
          url,
          scope,
        );
      }

      config.url =
        url;

      return config;
    },
  );

  client.interceptors.response.use(
    (response) => {
      const responseUrl =
        response?.request
          ?.res?.responseUrl;

      if (
        responseUrl &&
        scope
      ) {
        assertUrlInScope(
          responseUrl,
          scope,
        );
      }

      return response;
    },
  );

  return client;
};

const executeRequest = async ({
  url,
  method = 'GET',
  headers = {},
  params,
  data,
  body,
  timeout,
  timeoutMs,
  signal,
  scope,
  maxRedirects,
  responseType = 'text',
} = {}) => {
  const normalizedUrl =
    validateOutboundUrl(
      url,
    );

  if (scope) {
    assertUrlInScope(
      normalizedUrl,
      scope,
    );
  }

  const resolvedTimeout =
    timeout ??
    timeoutMs ??
    environment.http
      .timeoutMs;

  const client =
    createHttpClient({
      scope,

      timeout:
        resolvedTimeout,

      maxRedirects:
        Number.isInteger(
          maxRedirects,
        )
          ? maxRedirects
          : securityLimits
              .maxRedirects,
    });

  const requestData =
    data !== undefined
      ? data
      : body;

  const response =
    await client.request({
      url:
        normalizedUrl,

      method:
        String(method)
          .toUpperCase(),

      headers,

      params,

      data:
        requestData,

      signal,

      responseType,
    });

  return {
    status:
      response.status,

    statusCode:
      response.status,

    headers:
      redactHeaders(
        response.headers || {},
      ),

    data:
      response.data,

    body:
      response.data,

    url:
      response?.request
        ?.res?.responseUrl ||
      normalizedUrl,

    contentType:
      response.headers
        ?.['content-type'] ||
      null,
  };
};

export {
  createHttpClient,
  executeRequest,
  validateOutboundUrl,
  redactHeaders,
};