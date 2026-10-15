// STATUS: UPDATED
// File: src/core/scope.js

import { ScopeViolationError } from "../utils/errors.js";
import { normalizeUrl, getOrigin } from "../utils/url.js";

const getEffectivePort = (url) => {
  const parsed = new URL(url);

  if (parsed.port) {
    return Number(parsed.port);
  }

  return parsed.protocol === "https:" ? 443 : 80;
};

const normalizeHostname = (hostname) => {
  return String(hostname ?? "")
    .trim()
    .toLowerCase()
    .replace(/\.$/, "");
};

const hostnameMatches = (hostname, allowedHostname, includeSubdomains) => {
  const normalizedHostname = normalizeHostname(hostname);
  const normalizedAllowedHostname = normalizeHostname(allowedHostname);

  if (!normalizedHostname || !normalizedAllowedHostname) {
    return false;
  }

  if (normalizedHostname === normalizedAllowedHostname) {
    return true;
  }

  return (
    includeSubdomains === true &&
    normalizedHostname.endsWith(`.${normalizedAllowedHostname}`)
  );
};

const normalizeScope = (targetUrl, allowedOrigins = []) => {
  const normalizedTarget = normalizeUrl(targetUrl);
  const targetOrigin = getOrigin(normalizedTarget);

  // A missing optional origin list means the target origin only.
  if (allowedOrigins == null) {
    allowedOrigins = [];
  }

  if (!Array.isArray(allowedOrigins)) {
    throw new ScopeViolationError("Allowed origins must be an array.");
  }

  const origins = new Set([targetOrigin]);

  for (const origin of allowedOrigins) {
    try {
      origins.add(getOrigin(origin));
    } catch {
      // Ignore invalid additional origins.
      // The normalized target origin remains permitted.
      continue;
    }
  }

  return {
    targetUrl: normalizedTarget,
    targetOrigin,
    origin: targetOrigin,
    allowedOrigins: [...origins],
    mode: "origins",
  };
};

const createSavedScope = (targetUrl, snapshot) => {
  if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) {
    throw new ScopeViolationError("The saved scope snapshot is invalid.");
  }

  const normalizedTarget = normalizeUrl(targetUrl);

  // Validate that the normalized target is a valid URL.
  new URL(normalizedTarget);

  const hostnames = Array.isArray(snapshot.hostnames)
    ? snapshot.hostnames.map(normalizeHostname).filter(Boolean)
    : [];

  const ports = Array.isArray(snapshot.ports) ? snapshot.ports.map(Number) : [];

  if (
    hostnames.length === 0 ||
    ports.length === 0 ||
    ports.some((port) => !Number.isInteger(port) || port < 1 || port > 65535) ||
    typeof snapshot.includeSubdomains !== "boolean"
  ) {
    throw new ScopeViolationError("The saved scope snapshot is invalid.");
  }

  const targetOrigin = getOrigin(normalizedTarget);

  const scope = {
    targetUrl: normalizedTarget,
    targetOrigin,
    origin: targetOrigin,
    allowedOrigins: [],
    mode: "saved-hostnames",
    hostnames: [...new Set(hostnames)],
    ports: [...new Set(ports)],
    includeSubdomains: snapshot.includeSubdomains,
    scopeId: snapshot.scopeId,
    schemaVersion: snapshot.schemaVersion ?? 1,
  };

  if (!isInScope(normalizedTarget, scope)) {
    throw new ScopeViolationError("The target URL is outside the saved scope.");
  }

  return scope;
};

const isInScope = (url, scope) => {
  if (!scope) {
    return false;
  }

  try {
    const normalizedUrl = normalizeUrl(url);
    const parsedUrl = new URL(normalizedUrl);

    if (scope.mode === "saved-hostnames") {
      if (
        !Array.isArray(scope.hostnames) ||
        !Array.isArray(scope.ports) ||
        typeof scope.includeSubdomains !== "boolean"
      ) {
        return false;
      }

      const hostname = normalizeHostname(parsedUrl.hostname);
      const port = getEffectivePort(normalizedUrl);

      const hostnameAllowed = scope.hostnames.some((allowedHostname) =>
        hostnameMatches(hostname, allowedHostname, scope.includeSubdomains),
      );

      return hostnameAllowed && scope.ports.includes(port);
    }

    if (!Array.isArray(scope.allowedOrigins)) {
      return false;
    }

    const origin = getOrigin(normalizedUrl);

    return scope.allowedOrigins.includes(origin);
  } catch {
    return false;
  }
};

// Compatibility alias for callers using the isUrlInScope name.
const isUrlInScope = (url, scope) => {
  return isInScope(url, scope);
};

const assertInScope = (url, scope) => {
  if (!isInScope(url, scope)) {
    throw new ScopeViolationError(
      `URL is outside the permitted scan scope: ${url}`,
    );
  }

  return true;
};

/**
 * Compatibility alias used by src/core/httpClient.js.
 */
const assertUrlInScope = (url, scope) => {
  return assertInScope(url, scope);
};

const createScope = (targetUrl, allowedOrigins = []) => {
  // Explicit null/undefined means no additional origins.
  if (allowedOrigins == null) {
    return normalizeScope(targetUrl, []);
  }

  // An object represents a saved scope snapshot.
  if (typeof allowedOrigins === "object" && !Array.isArray(allowedOrigins)) {
    return createSavedScope(targetUrl, allowedOrigins);
  }

  return normalizeScope(targetUrl, allowedOrigins);
};

export {
  normalizeScope,
  createScope,
  isInScope,
  isUrlInScope,
  assertInScope,
  assertUrlInScope,
};
