import {
  get,
} from '../request/request.js';

import {
  createRateLimiter,
} from './rateLimiter.js';

import {
  normalizeUrl,
} from '../utils/url.js';

import {
  discoverLinks,
} from './discovery.js';

import {
  assertInScope,
} from './scope.js';

const crawl = async ({
  startUrl,
  scope,
  maxPaths = 25,
  maxDepth = 2,
  requestsPerSecond = 2,
  headers = {},
  signal,
  onPage = null,
} = {}) => {
  if (
    typeof startUrl !==
      'string' ||
    !scope
  ) {
    throw new TypeError(
      'startUrl and scope are required.',
    );
  }

  const limiter =
    createRateLimiter({
      requestsPerSecond,
    });

  const visited =
    new Set();

  const queue = [
    {
      url:
        normalizeUrl(
          startUrl,
        ),
      depth: 0,
    },
  ];

  const results = [];

  while (
    queue.length > 0 &&
    visited.size < maxPaths
  ) {
    if (
      signal?.aborted
    ) {
      break;
    }

    const current =
      queue.shift();

    if (
      visited.has(
        current.url,
      )
    ) {
      continue;
    }

    if (
      current.depth >
      maxDepth
    ) {
      continue;
    }

    assertInScope(
      current.url,
      scope,
    );

    visited.add(
      current.url,
    );

    await limiter.acquire();

    let response;

    try {
      response = await get(
        current.url,
        {
          headers,
          signal,
        },
      );
    } catch (error) {
      results.push({
        url:
          current.url,
        depth:
          current.depth,
        error,
      });

      continue;
    }

    const page = {
      url:
        current.url,

      depth:
        current.depth,

      statusCode:
        response.statusCode,

      headers:
        response.headers,

      body:
        response.body,
    };

    results.push(page);

    if (
      typeof onPage ===
      'function'
    ) {
      await onPage(
        page,
      );
    }

    if (
      current.depth >=
      maxDepth
    ) {
      continue;
    }

    const discovered =
      discoverLinks({
        html:
          response.body,
        baseUrl:
          current.url,
        sameOrigin: true,
      });

    for (
      const discoveredUrl of
      discovered
    ) {
      if (
        visited.has(
          discoveredUrl,
        )
      ) {
        continue;
      }

      if (
        queue.length +
          visited.size >=
        maxPaths
      ) {
        break;
      }

      if (
        !scope.allowedOrigins.includes(
          new URL(
            discoveredUrl,
          ).origin,
        )
      ) {
        continue;
      }

      queue.push({
        url:
          discoveredUrl,
        depth:
          current.depth + 1,
      });
    }
  }

  return {
    pages: results,
    visited:
      visited.size,
  };
};

export {
  crawl,
};