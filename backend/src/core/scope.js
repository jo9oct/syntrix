import {
  ScopeViolationError,
} from '../utils/errors.js';

import {
  normalizeUrl,
  getOrigin,
} from '../utils/url.js';

const normalizeScope = (
  targetUrl,
  allowedOrigins = [],
) => {
  const normalizedTarget =
    normalizeUrl(targetUrl);

  const targetOrigin =
    getOrigin(normalizedTarget);

  const origins = new Set([
    targetOrigin,
  ]);

  for (
    const origin of allowedOrigins
  ) {
    try {
      origins.add(
        getOrigin(origin),
      );
    } catch {
      continue;
    }
  }

  return {
    targetUrl:
      normalizedTarget,

    targetOrigin,

    origin:
      targetOrigin,

    allowedOrigins:
      [...origins],
  };
};

const isInScope = (
  url,
  scope,
) => {
  if (
    !scope ||
    !Array.isArray(
      scope.allowedOrigins,
    )
  ) {
    return false;
  }

  try {
    const normalizedUrl =
      normalizeUrl(url);

    const origin =
      getOrigin(normalizedUrl);

    return scope.allowedOrigins.includes(
      origin,
    );
  } catch {
    return false;
  }
};

const assertInScope = (
  url,
  scope,
) => {
  if (
    !isInScope(
      url,
      scope,
    )
  ) {
    throw new ScopeViolationError(
      `URL is outside the permitted scan scope: ${url}`,
    );
  }

  return true;
};

/*
 * Compatibility alias used by
 * src/core/httpClient.js.
 *
 * Keep assertInScope as the original
 * public function and expose this alias
 * so both existing and hardened code
 * use the same scope implementation.
 */
const assertUrlInScope = (
  url,
  scope,
) => {
  return assertInScope(
    url,
    scope,
  );
};

const createScope = (
  targetUrl,
  allowedOrigins = [],
) => {
  return normalizeScope(
    targetUrl,
    allowedOrigins,
  );
};

const isUrlInScope = (
  url,
  scope,
) => {
  return isInScope(
    url,
    scope,
  );
};

export {
  normalizeScope,
  createScope,
  isInScope,
  isUrlInScope,
  assertInScope,
  assertUrlInScope,
};