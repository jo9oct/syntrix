/* STATUS: UPDATED
 * File: src/engine/scanContext.js
 */

import { createSession } from "../core/session.js";
import { createScope, isInScope } from "../core/scope.js";
import { createRateLimiter } from "../core/rateLimiter.js";
import { createProgressTracker } from "../core/progress.js";
import { createLogger } from "../core/logger.js";

const MAX_DISCOVERED_TARGETS = 10;

const normalizeDiscoveredUrls = ({ urls = [], scope }) => {
  if (!Array.isArray(urls)) {
    return [];
  }

  const seen = new Set();
  const normalized = [];

  for (const value of urls) {
    if (
      normalized.length >= MAX_DISCOVERED_TARGETS ||
      typeof value !== "string"
    ) {
      break;
    }

    try {
      const url = new URL(value);

      if (
        !["http:", "https:"].includes(url.protocol) ||
        url.username ||
        url.password
      ) {
        continue;
      }

      url.hash = "";

      const candidate = url.toString();

      if (seen.has(candidate)) {
        continue;
      }

      /*
       * Discovered URLs must belong to the effective scope.
       * Do not rely on same-origin checks: a saved scope may
       * explicitly authorize additional hostnames or ports.
       */
      if (!isInScope(candidate, scope)) {
        continue;
      }

      /*
       * Preserve the existing behavior of accepting only
       * discovered URLs with query parameters.
       */
      if (!url.searchParams.size) {
        continue;
      }

      seen.add(candidate);
      normalized.push(candidate);
    } catch {
      // Ignore malformed or out-of-scope discovered URLs.
    }
  }

  return normalized;
};

const createScanContext = ({
  scan,
  target,
  selection,
  signal,
  ownerId,
  credentials,
  options = {},
  discoveredUrls = [],
  scopeSnapshot = null,
}) => {
  if (!scan?.id) {
    throw new Error("Scan context requires a scan ID.");
  }

  if (!target?.url) {
    throw new Error("Scan context requires a target URL.");
  }

  let parsedTarget;

  try {
    parsedTarget = new URL(target.url);
  } catch {
    throw new Error("Scan context requires a valid target URL.");
  }

  if (
    !["http:", "https:"].includes(parsedTarget.protocol) ||
    parsedTarget.username ||
    parsedTarget.password
  ) {
    throw new Error(
      "Scan context requires an HTTP or HTTPS URL without embedded credentials.",
    );
  }

  /*
   * Use the immutable snapshot captured when the scan was created.
   * This prevents later saved-scope edits from silently changing
   * the authorization boundary of an already queued scan.
   */
  const scope = createScope(target.url, scopeSnapshot);

  if (!isInScope(target.url, scope)) {
    const error = new Error("The scan target is outside the effective scope.");

    error.code = "SCAN_TARGET_OUT_OF_SCOPE";
    error.statusCode = 403;

    throw error;
  }

  const safeDiscoveredUrls = normalizeDiscoveredUrls({
    urls: discoveredUrls,
    scope,
  });

  const session = createSession({
    headers: options.headers ?? {},
    cookies: options.cookies ?? {},
  });

  const rateLimiter = createRateLimiter({
    requestsPerSecond: Number(options.requestsPerSecond ?? 2),
  });

  const progress = createProgressTracker({
    total: selection.selectedScannerIds.length,
  });

  const logger = createLogger({
    component: "scan-engine",
    scanId: scan.id,
  });

  return {
    scan: {
      id: scan.id,
      ownerId: scan.ownerId ?? ownerId,
    },

    target: {
      id: target.id,
      url: target.url,
      normalizedUrl: target.normalizedUrl ?? target.url,
      hostname: target.hostname ?? parsedTarget.hostname,
    },

    discoveredUrls: safeDiscoveredUrls,

    selection: {
      mode: selection.mode,
      recon: [...selection.recon],
      security: [...selection.security],
      selectedScannerIds: [...selection.selectedScannerIds],
    },

    ownerId,
    credentials: credentials ?? null,
    options: { ...options },
    signal,
    session,
    scope,
    rateLimiter,
    progress,
    logger,
  };
};

export { createScanContext, MAX_DISCOVERED_TARGETS };
