const normalizeString = (value, maxLength = 10_000) => {
  if (typeof value !== "string") {
    return "";
  }

  return value
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .trim()
    .slice(0, maxLength);
};

const normalizeHeaderName = (value) =>
  normalizeString(value, 256).toLowerCase();

const normalizeHeaders = (headers = {}) => {
  const normalized = {};

  for (const [name, value] of Object.entries(headers)) {
    const normalizedName = normalizeHeaderName(name);

    if (normalizedName.length === 0) {
      continue;
    }

    if (Array.isArray(value)) {
      normalized[normalizedName] = value
        .map((item) => normalizeString(String(item), 4096))
        .join(", ");
    } else {
      normalized[normalizedName] = normalizeString(String(value), 4096);
    }
  }

  return normalized;
};

const normalizeMethod = (method) => {
  if (typeof method !== "string") {
    return "GET";
  }

  return method.trim().toUpperCase();
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
