import {
  normalizeHeaders,
  normalizeString,
} from '../utils/normalization.js';

const parseResponse = (
  response,
) => {
  const body =
    typeof response?.body ===
    'string'
      ? response.body
      : String(
          response?.body ?? '',
        );

  const headers =
    normalizeHeaders(
      response?.headers ?? {},
    );

  return {
    statusCode:
      Number.isInteger(
        response?.statusCode,
      )
        ? response.statusCode
        : null,

    statusMessage:
      normalizeString(
        response?.statusMessage ??
          '',
        512,
      ),

    headers,

    body,

    bodyLength:
      Buffer.byteLength(
        body,
        'utf8',
      ),

    contentType:
      headers[
        'content-type'
      ] ?? null,

    server:
      headers.server ?? null,

    location:
      headers.location ?? null,

    hasBody:
      body.length > 0,
  };
};

const getHeader = (
  response,
  name,
) => {
  const headers =
    normalizeHeaders(
      response?.headers ?? {},
    );

  return (
    headers[
      String(name).toLowerCase()
    ] ?? null
  );
};

const getStatusClass = (
  statusCode,
) => {
  if (
    !Number.isInteger(
      statusCode,
    )
  ) {
    return 'unknown';
  }

  if (statusCode >= 100 && statusCode < 200) {
    return '1xx';
  }

  if (statusCode >= 200 && statusCode < 300) {
    return '2xx';
  }

  if (statusCode >= 300 && statusCode < 400) {
    return '3xx';
  }

  if (statusCode >= 400 && statusCode < 500) {
    return '4xx';
  }

  if (statusCode >= 500 && statusCode < 600) {
    return '5xx';
  }

  return 'unknown';
};

export {
  parseResponse,
  getHeader,
  getStatusClass,
};