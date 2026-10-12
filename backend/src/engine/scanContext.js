// STATUS: UPDATED

import { createSession } from '../core/session.js';
import { createScope } from '../core/scope.js';
import { createRateLimiter } from '../core/rateLimiter.js';
import { createProgressTracker } from '../core/progress.js';
import { createLogger } from '../core/logger.js';

const MAX_DISCOVERED_TARGETS = 10;

const normalizeDiscoveredUrls = ({
  urls = [],
  targetUrl,
  scope,
}) => {
  if (!Array.isArray(urls)) {
    return [];
  }

  const rootOrigin = new URL(targetUrl).origin;
  const seen = new Set([targetUrl]);
  const normalized = [];

  for (const value of urls) {
    if (
      normalized.length >= MAX_DISCOVERED_TARGETS ||
      typeof value !== 'string'
    ) {
      break;
    }

    try {
      const url = new URL(value);

      if (
        !['http:', 'https:'].includes(url.protocol) ||
        url.username ||
        url.password ||
        url.origin !== rootOrigin ||
        !url.searchParams.size
      ) {
        continue;
      }

      url.hash = '';

      const candidate = url.toString();

      if (seen.has(candidate)) {
        continue;
      }

      if (typeof scope?.assertInScope === 'function') {
        scope.assertInScope(candidate);
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
}) => {
  if (!scan?.id) {
    throw new Error('Scan context requires a scan ID.');
  }

  if (!target?.url) {
    throw new Error('Scan context requires a target URL.');
  }

  const session = createSession({
    headers: options.headers ?? {},
    cookies: options.cookies ?? {},
  });

  const scope = createScope(target.url);

  const safeDiscoveredUrls = normalizeDiscoveredUrls({
    urls: discoveredUrls,
    targetUrl: target.url,
    scope,
  });

  const rateLimiter = createRateLimiter({
    requestsPerSecond: Number(options.requestsPerSecond ?? 2),
  });

  const progress = createProgressTracker({
    total: selection.selectedScannerIds.length,
  });

  const logger = createLogger({
    component: 'scan-engine',
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
      hostname: target.hostname ?? new URL(target.url).hostname,
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

    options: {
      ...options,
    },

    signal,
    session,
    scope,
    rateLimiter,
    progress,
    logger,
  };
};

export {
  createScanContext,
  MAX_DISCOVERED_TARGETS,
};