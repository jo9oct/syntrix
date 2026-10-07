import {
  createSession,
} from '../core/session.js';
import {
  createScope,
} from '../core/scope.js';
import {
  createRateLimiter,
} from '../core/rateLimiter.js';
import {
  createProgressTracker,
} from '../core/progress.js';
import {
  createLogger,
} from '../core/logger.js';

const createScanContext = ({
  scan,
  target,
  selection,
  signal,
  ownerId,
  credentials,
  options = {},
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

  const rateLimiter = createRateLimiter({
    requestsPerSecond:
      Number(options.requestsPerSecond ?? 2),
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
      normalizedUrl:
        target.normalizedUrl ?? target.url,
      hostname:
        target.hostname ??
        new URL(target.url).hostname,
    },

    selection: {
      mode: selection.mode,
      recon: [...selection.recon],
      security: [...selection.security],
      selectedScannerIds: [
        ...selection.selectedScannerIds,
      ],
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
};