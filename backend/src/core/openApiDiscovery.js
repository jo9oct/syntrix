// STATUS: CREATED
// File: src/core/openApiDiscovery.js

const DEFAULT_MAX_ENDPOINTS = 500;
const MAX_SOURCE_BYTES = 1024 * 1024;

const HTTP_METHODS = new Set([
  "get",
  "post",
  "put",
  "patch",
  "delete",
  "options",
  "head",
  "trace",
]);

const OPENAPI_PATH_PATTERN = /^\/(?!\/)/;

function isValidLimit(value) {
  return Number.isSafeInteger(value) && value > 0;
}

function isSafeBaseUrl(value) {
  if (typeof value !== "string" || !value.trim()) {
    return false;
  }

  try {
    const url = new URL(value);

    return (
      ["http:", "https:"].includes(url.protocol) &&
      !url.username &&
      !url.password
    );
  } catch {
    return false;
  }
}

function isSupportedDocument(document) {
  if (!document || typeof document !== "object" || Array.isArray(document)) {
    return false;
  }

  const isOpenApi3 =
    typeof document.openapi === "string" &&
    /^3\.\d+\.\d+(?:[-+].*)?$/.test(document.openapi);

  const isSwagger2 = document.swagger === "2.0";

  return isOpenApi3 || isSwagger2;
}

function isValidPath(path) {
  return (
    typeof path === "string" &&
    path.length > 0 &&
    path.length <= 2048 &&
    OPENAPI_PATH_PATTERN.test(path) &&
    !/[?#\\\u0000-\u001F\u007F]/.test(path) &&
    !path.startsWith("//") &&
    !/%2f|%5c/i.test(path)
  );
}

/**
 * Extracts documented endpoint paths and HTTP methods from OpenAPI 3
 * or Swagger 2 JSON specifications.
 *
 * This function parses metadata only. It does not make HTTP requests,
 * execute API operations, or follow external references.
 *
 * @param {object} options
 * @param {string} options.source JSON specification text
 * @param {string} options.baseUrl URL of the specification document
 * @param {number} [options.maxEndpoints=500] Maximum returned endpoints
 * @returns {{path: string, method: string}[]}
 */
export function extractOpenApiEndpoints({
  source,
  baseUrl,
  maxEndpoints = DEFAULT_MAX_ENDPOINTS,
} = {}) {
  if (
    typeof source !== "string" ||
    !source.trim() ||
    Buffer.byteLength(source, "utf8") > MAX_SOURCE_BYTES ||
    !isValidLimit(maxEndpoints) ||
    !isSafeBaseUrl(baseUrl)
  ) {
    return [];
  }

  let document;

  try {
    document = JSON.parse(source);
  } catch {
    return [];
  }

  if (!isSupportedDocument(document)) {
    return [];
  }

  const { paths } = document;

  if (!paths || typeof paths !== "object" || Array.isArray(paths)) {
    return [];
  }

  const endpoints = [];
  const seen = new Set();

  for (const [path, pathItem] of Object.entries(paths)) {
    if (!isValidPath(path)) {
      continue;
    }

    if (!pathItem || typeof pathItem !== "object" || Array.isArray(pathItem)) {
      continue;
    }

    for (const [key, operation] of Object.entries(pathItem)) {
      const method = key.toLowerCase();

      if (!HTTP_METHODS.has(method)) {
        continue;
      }

      if (
        !operation ||
        typeof operation !== "object" ||
        Array.isArray(operation)
      ) {
        continue;
      }

      const identity = `${method.toUpperCase()} ${path}`;

      if (seen.has(identity)) {
        continue;
      }

      seen.add(identity);
      endpoints.push({
        path,
        method: method.toUpperCase(),
      });

      if (endpoints.length >= maxEndpoints) {
        return endpoints;
      }
    }
  }

  return endpoints;
}
