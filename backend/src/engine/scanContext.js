
import { createSession } from "../core/session.js";
import { createScope, isInScope } from "../core/scope.js";
import { createRateLimiter } from "../core/rateLimiter.js";
import { createProgressTracker } from "../core/progress.js";
import { logger } from "../core/logger.js";

const MAX_DISCOVERED_URLS = 10;
const MAX_DISCOVERED_URL_LENGTH = 2048;

const isPlainObject = (value) =>
  value !== null &&
  typeof value === "object" &&
  !Array.isArray(value);

const createContextError = (message, code) => {
  const error = new Error(message);
  error.code = code;
  return error;
};

const normalizeAuthenticatedRequest = ({
  authenticatedRequest,
  targetUrl,
}) => {
  if (
    authenticatedRequest === null ||
    authenticatedRequest === undefined
  ) {
    return null;
  }

  if (
    !isPlainObject(authenticatedRequest) ||
    typeof authenticatedRequest.authOrigin !== "string" ||
    typeof authenticatedRequest.resolveHeaders !== "function"
  ) {
    throw createContextError(
      "The authenticated request configuration is invalid.",
      "INVALID_AUTHENTICATED_REQUEST",
    );
  }

  let parsedTargetUrl;
  let parsedAuthOrigin;

  try {
    parsedTargetUrl = new URL(targetUrl);
    parsedAuthOrigin = new URL(authenticatedRequest.authOrigin);
  } catch {
    throw createContextError(
      "The authenticated request origin is invalid.",
      "INVALID_AUTHENTICATED_REQUEST",
    );
  }

  const authOrigin = authenticatedRequest.authOrigin;

  if (
    !["http:", "https:"].includes(parsedAuthOrigin.protocol) ||
    parsedAuthOrigin.username ||
    parsedAuthOrigin.password ||
    parsedAuthOrigin.origin !== authOrigin
  ) {
    throw createContextError(
      "The authenticated origin must be a normalized HTTP or HTTPS origin.",
      "INVALID_AUTHENTICATED_REQUEST",
    );
  }

  if (parsedTargetUrl.origin !== authOrigin) {
    throw createContextError(
      "The authenticated origin must match the scan target origin.",
      "AUTHENTICATED_ORIGIN_MISMATCH",
    );
  }

  return Object.freeze({
    authOrigin,
    resolveHeaders: authenticatedRequest.resolveHeaders,
  });
};

const normalizeDiscoveredUrls = ({ discoveredUrls, scope }) => {
  if (!Array.isArray(discoveredUrls)) {
    return [];
  }

  const normalizedUrls = [];
  const seen = new Set();

  for (const value of discoveredUrls) {
    if (
      typeof value !== "string" ||
      value.length === 0 ||
      value.length > MAX_DISCOVERED_URL_LENGTH
    ) {
      continue;
    }

    let parsedUrl;

    try {
      parsedUrl = new URL(value);
    } catch {
      continue;
    }

    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      continue;
    }

    if (parsedUrl.username || parsedUrl.password) {
      continue;
    }

    parsedUrl.hash = "";

    const normalizedUrl = parsedUrl.toString();

    if (seen.has(normalizedUrl)) {
      continue;
    }

    if (!isInScope(normalizedUrl, scope)) {
      continue;
    }

    if (parsedUrl.searchParams.size === 0) {
      continue;
    }

    seen.add(normalizedUrl);
    normalizedUrls.push(normalizedUrl);

    if (normalizedUrls.length >= MAX_DISCOVERED_URLS) {
      break;
    }
  }

  return normalizedUrls;
};

const createScanContext = ({
  scan,
  target,
  selection,
  signal,
  ownerId,
  options = {},
  discoveredUrls = [],
  scopeSnapshot = null,
  authenticatedRequest = null,
}) => {
  if (!scan?.id) {
    throw createContextError(
      "A scan ID is required.",
      "INVALID_SCAN_CONTEXT",
    );
  }

  if (typeof target?.url !== "string" || !target.url) {
    throw createContextError(
      "A target URL is required.",
      "INVALID_SCAN_TARGET",
    );
  }

  if (!ownerId) {
    throw createContextError(
      "An owner ID is required.",
      "INVALID_SCAN_CONTEXT",
    );
  }

  let parsedTargetUrl;

  try {
    parsedTargetUrl = new URL(target.url);
  } catch {
    throw createContextError(
      "The target URL is invalid.",
      "INVALID_SCAN_TARGET",
    );
  }

  if (!["http:", "https:"].includes(parsedTargetUrl.protocol)) {
    throw createContextError(
      "Only HTTP and HTTPS targets are supported.",
      "INVALID_SCAN_TARGET_PROTOCOL",
    );
  }

  if (parsedTargetUrl.username || parsedTargetUrl.password) {
    throw createContextError(
      "Target URLs must not contain embedded credentials.",
      "INVALID_SCAN_TARGET",
    );
  }

  if (
    !selection ||
    !Array.isArray(selection.selectedScannerIds) ||
    selection.selectedScannerIds.length === 0
  ) {
    throw createContextError(
      "At least one scanner must be selected.",
      "NO_SCANNERS_SELECTED",
    );
  }

  const scope = createScope(target.url, scopeSnapshot);

  if (!isInScope(target.url, scope)) {
    throw createContextError(
      "The target URL is outside the effective scan scope.",
      "TARGET_OUT_OF_SCOPE",
    );
  }

  const normalizedAuthRequest = normalizeAuthenticatedRequest({
    authenticatedRequest,
    targetUrl: target.url,
  });

  const normalizedDiscoveredUrls = normalizeDiscoveredUrls({
    discoveredUrls,
    scope,
  });

  const safeOptions = isPlainObject(options) ? options : {};

  /*
   * Authentication headers and cookies must come from the
   * worker-owned authenticated request resolver.
   */
  const session = createSession({
    headers: {},
    cookies: {},
  });

  const rateLimiter = createRateLimiter();

  // The tracker expects an options object, not a number.
  const progress = createProgressTracker({
    total: selection.selectedScannerIds.length,
  });

  const request = Object.freeze({
    authenticated: normalizedAuthRequest,
    scope,
    signal,
  });

  return {
    scan,
    target,
    selection,
    ownerId,
    options: safeOptions,
    signal,

    session,
    scope,
    discoveredUrls: normalizedDiscoveredUrls,

    authenticatedRequest: normalizedAuthRequest,
    request,

    rateLimiter,
    progress,
    logger,
  };
};

export { createScanContext, normalizeDiscoveredUrls };
