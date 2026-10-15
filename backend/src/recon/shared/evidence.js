const SENSITIVE_HEADERS = new Set([
  "authorization",
  "proxy-authorization",
  "cookie",
  "set-cookie",
  "x-api-key",
  "x-auth-token",
]);

const sanitizeHeaders = (headers = {}) => {
  const result = {};

  for (const [key, value] of Object.entries(headers)) {
    const normalizedKey = key.toLowerCase();

    if (SENSITIVE_HEADERS.has(normalizedKey)) {
      result[key] = "[REDACTED]";
      continue;
    }

    if (Array.isArray(value)) {
      result[key] = value.slice(0, 10).map(String);
      continue;
    }

    result[key] = String(value).slice(0, 2000);
  }

  return result;
};

const sanitizeUrl = (value) => {
  if (typeof value !== "string") {
    return undefined;
  }

  try {
    const parsed = new URL(value);

    parsed.username = "";
    parsed.password = "";

    return parsed.toString();
  } catch {
    return undefined;
  }
};

const createRequestEvidence = ({ method, url, headers, body }) => ({
  type: "request",
  request: {
    method: String(method ?? "GET").toUpperCase(),
    url: sanitizeUrl(url),
    headers: sanitizeHeaders(headers),
    body: typeof body === "string" ? body.slice(0, 5000) : undefined,
  },
});

const createResponseEvidence = ({
  status,
  statusText,
  headers,
  body,
  contentType,
}) => ({
  type: "response",
  response: {
    status: Number.isInteger(status) ? status : undefined,
    statusText:
      typeof statusText === "string" ? statusText.slice(0, 500) : undefined,
    headers: sanitizeHeaders(headers),
    contentType:
      typeof contentType === "string" ? contentType.slice(0, 200) : undefined,
    body: typeof body === "string" ? body.slice(0, 10000) : undefined,
  },
});

const createExchangeEvidence = ({ request, response, metadata = {} }) => ({
  type: "http_exchange",
  request: createRequestEvidence(request),
  response: createResponseEvidence(response),
  metadata,
});

export {
  createExchangeEvidence,
  createRequestEvidence,
  createResponseEvidence,
  sanitizeHeaders,
  sanitizeUrl,
};
