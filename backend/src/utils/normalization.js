// STATUS: UPDATED
// File: src/utils/normalization.js

const normalizeString = (value, maxLength = 10_000) => {
  if (typeof value !== "string") {
    return "";
  }

  if (!Number.isSafeInteger(maxLength) || maxLength < 0) {
    throw new TypeError("maxLength must be a non-negative safe integer.");
  }

  return value.trim().slice(0, maxLength);
};

const normalizeHeaderName = (value) => {
  if (typeof value !== "string") {
    throw new TypeError("HTTP header names must be strings.");
  }

  const name = value.trim();

  if (
    name.length === 0 ||
    name.length > 256 ||
    !/^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/.test(name)
  ) {
    throw new TypeError("Invalid HTTP header name.");
  }

  return name.toLowerCase();
};

const normalizeHeaderValue = (value) => {
  const normalized = String(value);

  if (/[\r\n]/.test(normalized)) {
    throw new TypeError(
      "HTTP header values must not contain CR or LF characters.",
    );
  }

  if (normalized.length > 4096) {
    throw new TypeError("HTTP header value exceeds the allowed length.");
  }

  return normalized.trim();
};

const normalizeHeaders = (headers = {}) => {
  if (
    headers === null ||
    typeof headers !== "object" ||
    Array.isArray(headers)
  ) {
    throw new TypeError("HTTP headers must be an object.");
  }

  const normalized = Object.create(null);

  for (const [name, value] of Object.entries(headers)) {
    const normalizedName = normalizeHeaderName(name);

    if (value === undefined || value === null) {
      continue;
    }

    if (Object.hasOwn(normalized, normalizedName)) {
      throw new TypeError(
        `Duplicate HTTP header after normalization: ${normalizedName}.`,
      );
    }

    if (Array.isArray(value)) {
      normalized[normalizedName] = value.map(normalizeHeaderValue).join(", ");
    } else {
      normalized[normalizedName] = normalizeHeaderValue(value);
    }
  }

  return normalized;
};

const normalizeMethod = (method) => {
  if (typeof method !== "string") {
    throw new TypeError("HTTP method must be a string.");
  }

  const normalized = method.trim().toUpperCase();

  if (!/^[A-Z!#$%&'*+\-.^_`|~0-9]+$/.test(normalized)) {
    throw new TypeError("Invalid HTTP method.");
  }

  return normalized;
};

const normalizeScannerId = (scannerId) => {
  if (typeof scannerId !== "string") {
    return "";
  }

  return scannerId.trim().toLowerCase().replace(/\s+/g, "-");
};

export {
  normalizeString,
  normalizeHeaderName,
  normalizeHeaders,
  normalizeMethod,
  normalizeScannerId,
};
