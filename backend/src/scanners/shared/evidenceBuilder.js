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
const REDACTED = '[REDACTED]';

const calculateConfidence = ({
  confirmed = false,
  repeated = false,
  differential = false,
} = {}) => {
  if (confirmed && repeated) {
    return CONFIDENCE.HIGH;
  }

  if (confirmed || differential || repeated) {
    return CONFIDENCE.MEDIUM;
  }

  return CONFIDENCE.LOW;
};

const truncateValue = (value, maxLength = MAX_BODY_LENGTH) => {
  if (value === null || value === undefined) {
    return value;
  }

  let normalized;

  try {
    normalized =
      typeof value === 'string'
        ? value
        : JSON.stringify(value);
  } catch {
    normalized = '[UNSERIALIZABLE]';
  }

  if (typeof normalized !== 'string') {
    normalized = String(normalized);
  }

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength)}\n[TRUNCATED]`;
};

/**
 * Remove credentials and query values before an URL is persisted.
 * Query parameter names remain available for debugging.
 */
const sanitizeUrl = (value) => {
  if (typeof value !== 'string' || !value.trim()) {
    return null;
  }

  try {
    const url = new URL(value);

    if (!['http:', 'https:'].includes(url.protocol)) {
      return '[REDACTED_URL]';
    }

    url.username = '';
    url.password = '';

    for (const key of new Set(url.searchParams.keys())) {
      url.searchParams.set(key, '');
    }

    url.hash = '';

    return url.toString();
  } catch {
    return '[REDACTED_URL]';
  }
};

const redactHeaders = (headers = {}) => {
  const sanitized = {};

  for (const [name, value] of Object.entries(headers)) {
    if (SENSITIVE_HEADERS.has(name.toLowerCase())) {
      sanitized[name] = REDACTED;
      continue;
    }

    sanitized[name] = value;
  }

  return sanitized;
};

const sanitizeRequest = (request = {}) => ({
  method: request.method || null,
  url: sanitizeUrl(request.url),
  headers: redactHeaders(request.headers || {}),
  body: request.body === null || request.body === undefined
    ? request.body
    : REDACTED,
});

const sanitizeResponse = (response = {}) => ({
  status: response.status ?? response.statusCode ?? null,
  statusCode: response.statusCode ?? response.status ?? null,
  headers: redactHeaders(response.headers || {}),
  body: response.body !== undefined || response.data !== undefined
    ? REDACTED
    : null,
  contentType:
    response.contentType ||
    response.headers?.['content-type'] ||
    null,
});

const sanitizeMetadata = (metadata = {}) => {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return {};
  }

  const sanitized = {};

  for (const [key, value] of Object.entries(metadata)) {
    const normalizedKey = key.toLowerCase();

    if (
      normalizedKey.includes('url') ||
      normalizedKey.includes('payload') ||
      normalizedKey.includes('password') ||
      normalizedKey.includes('secret') ||
      normalizedKey.includes('token') ||
      normalizedKey.includes('authorization') ||
      normalizedKey.includes('cookie') ||
      normalizedKey.includes('requestbody') ||
      normalizedKey.includes('responsebody') ||
      normalizedKey.includes('rawrequest') ||
      normalizedKey.includes('rawresponse')
    ) {
      sanitized[key] = REDACTED;
      continue;
    }

    if (
      value &&
      typeof value === 'object' &&
      !Array.isArray(value)
    ) {
      sanitized[key] = sanitizeMetadata(value);
      continue;
    }

    if (Array.isArray(value)) {
      sanitized[key] = value.map((item) =>
        item && typeof item === 'object'
          ? sanitizeMetadata(item)
          : item
      );
      continue;
    }

    sanitized[key] = value;
  }

  return sanitized;
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
  const sanitizedRequest = request
    ? sanitizeRequest(request)
    : null;

  const sanitizedResponse = response
    ? sanitizeResponse(response)
    : null;

  const method = sanitizedRequest?.method || null;
  const url = sanitizedRequest?.url || null;

  const statusCode =
    sanitizedResponse?.statusCode ?? null;

  const summary = [
    description,
    parameter ? `Parameter: ${parameter}` : null,
    payload ? 'Payload: [REDACTED]' : null,
    confidence ? `Confidence: ${confidence}` : null,
  ]
    .filter(Boolean)
    .join('\n') || null;

  return {
    type,
    findingId,
    findingFingerprint,
    findingKey,
    fingerprint,

    request: sanitizedRequest,
    response: sanitizedResponse,

    method,
    url,
    statusCode,

    headers: {
      ...(sanitizedRequest?.headers || {}),
      ...(sanitizedResponse?.headers || {}),
    },

    bodyExcerpt: '[REDACTED]',

    summary,

    sensitiveDataRedacted: true,

    metadata: {
      ...sanitizeMetadata(metadata),

      ...(parameter ? { parameter } : {}),
      ...(payload ? { payload: REDACTED } : {}),
      ...(confidence ? { confidence } : {}),
      ...(description ? { description } : {}),
    },
  };
};

const buildEvidence = (input = {}) =>
  createSecurityEvidence(input);

const createEvidence = (input = {}) =>
  createSecurityEvidence(input);

export {
  CONFIDENCE,
  calculateConfidence,
  createSecurityEvidence,
  buildEvidence,
  createEvidence,
  sanitizeUrl,
  sanitizeRequest,
  sanitizeResponse,
  redactHeaders,
  truncateValue,
};