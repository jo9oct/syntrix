// STATUS: UPDATED

const CONFIDENCE = Object.freeze({
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
});

const SENSITIVE_HEADERS = new Set([
  'authorization',
  'proxy-authorization',
  'cookie',
  'set-cookie',
  'x-api-key',
  'x-auth-token',
]);

const MAX_BODY_LENGTH = 10000;
const MAX_PAYLOAD_LENGTH = 4000;

const calculateConfidence = ({
  confirmed = false,
  repeated = false,
  differential = false,
} = {}) => {
  if (confirmed && repeated) {
    return CONFIDENCE.HIGH;
  }

  if (
    confirmed ||
    differential ||
    repeated
  ) {
    return CONFIDENCE.MEDIUM;
  }

  return CONFIDENCE.LOW;
};

const truncateValue = (
  value,
  maxLength = MAX_BODY_LENGTH,
) => {
  if (
    value === null ||
    value === undefined
  ) {
    return value;
  }

  const normalized =
    typeof value === 'string'
      ? value
      : JSON.stringify(value);

  if (
    normalized.length <=
    maxLength
  ) {
    return normalized;
  }

  return `${normalized.slice(
    0,
    maxLength,
  )}\n[TRUNCATED]`;
};

const redactHeaders = (
  headers = {},
) => {
  const sanitized = {};

  for (
    const [
      name,
      value,
    ] of Object.entries(headers)
  ) {
    if (
      SENSITIVE_HEADERS.has(
        name.toLowerCase(),
      )
    ) {
      sanitized[name] =
        '[REDACTED]';

      continue;
    }

    sanitized[name] = value;
  }

  return sanitized;
};

const sanitizeRequest = (
  request = {},
) => {
  return {
    method:
      request.method ||
      null,

    url:
      request.url ||
      null,

    headers:
      redactHeaders(
        request.headers ||
          {},
      ),

    body:
      truncateValue(
        request.body,
      ),
  };
};

const sanitizeResponse = (
  response = {},
) => {
  return {
    status:
      response.status ??
      response.statusCode ??
      null,

    statusCode:
      response.statusCode ??
      response.status ??
      null,

    headers:
      redactHeaders(
        response.headers ||
          {},
      ),

    body:
      truncateValue(
        response.body ??
          response.data,
      ),

    contentType:
      response.contentType ||
      response.headers?.[
        'content-type'
      ] ||
      null,
  };
};

const createSecurityEvidence = ({
  request = null,
  response = null,
  parameter = null,
  payload = null,
  description = null,
  confidence = null,
  metadata = {},
  findingId = null,
  findingFingerprint = null,
  findingKey = null,
  fingerprint = null,
  type = 'http_exchange',
} = {}) => {
  const sanitizedRequest =
    request
      ? sanitizeRequest(
          request,
        )
      : null;

  const sanitizedResponse =
    response
      ? sanitizeResponse(
          response,
        )
      : null;

  const requestHeaders =
    sanitizedRequest?.headers ||
    {};

  const responseHeaders =
    sanitizedResponse?.headers ||
    {};

  const method =
    sanitizedRequest?.method ||
    null;

  const url =
    sanitizedRequest?.url ||
    null;

  const statusCode =
    sanitizedResponse?.statusCode ??
    null;

  const bodyExcerpt =
    sanitizedResponse?.body ??
    sanitizedRequest?.body ??
    null;

  const summary =
    description ||
    (
      parameter ||
      payload ||
      confidence
    )
      ? [
          description,
          parameter
            ? `Parameter: ${parameter}`
            : null,
          payload
            ? `Payload: ${truncateValue(
                payload,
                MAX_PAYLOAD_LENGTH,
              )}`
            : null,
          confidence
            ? `Confidence: ${confidence}`
            : null,
        ]
          .filter(Boolean)
          .join('\n')
      : null;

  return {
    type,

    findingId,

    findingFingerprint,

    findingKey,

    fingerprint,

    request:
      sanitizedRequest,

    response:
      sanitizedResponse,

    method,

    url,

    statusCode,

    headers: {
      ...requestHeaders,
      ...responseHeaders,
    },

    bodyExcerpt,

    summary,

    sensitiveDataRedacted:
      true,

    metadata: {
      ...metadata,

      ...(parameter
        ? {
            parameter,
          }
        : {}),

      ...(payload
        ? {
            payload:
              truncateValue(
                payload,
                MAX_PAYLOAD_LENGTH,
              ),
          }
        : {}),

      ...(confidence
        ? {
            confidence,
          }
        : {}),

      ...(description
        ? {
            description,
          }
        : {}),
    },
  };
};

const buildEvidence = (
  input = {},
) => {
  return createSecurityEvidence(
    input,
  );
};

const createEvidence = (
  input = {},
) => {
  return createSecurityEvidence(
    input,
  );
};

export {
  CONFIDENCE,
  calculateConfidence,
  createSecurityEvidence,
  buildEvidence,
  createEvidence,
  sanitizeRequest,
  sanitizeResponse,
  redactHeaders,
  truncateValue,
};