// STATUS: UPDATED

import { get } from '../request/request.js';
import { createRateLimiter } from './rateLimiter.js';
import { normalizeUrl } from '../utils/url.js';
import { discoverLinks } from '../discovery/discovery.js';
import { assertInScope } from './scope.js';

const MAX_PATHS_HARD_LIMIT = 5000;
const MAX_DEPTH_HARD_LIMIT = 20;

const createAbortError = () => {
  const error = new Error('Crawling was cancelled.');
  error.name = 'AbortError';
  error.code = 'CRAWL_CANCELLED';
  return error;
};

const normalizeRequestError = (error, signal) => {
  if (signal?.aborted || error?.code === 'CRAWL_CANCELLED') {
    return 'CRAWL_CANCELLED';
  }

  const code = String(error?.code ?? '').toUpperCase();
  const name = String(error?.name ?? '').toUpperCase();

  if (
    code === 'ECONNABORTED' ||
    code === 'ETIMEDOUT' ||
    code === 'ESOCKETTIMEDOUT' ||
    name === 'TIMEOUTERROR'
  ) {
    return 'CRAWL_TIMEOUT';
  }

  if (
    code === 'ENOTFOUND' ||
    code === 'EAI_AGAIN' ||
    code === 'EAI_FAIL'
  ) {
    return 'CRAWL_DNS_FAILED';
  }

  if (
    code === 'ECONNREFUSED' ||
    code === 'ECONNRESET' ||
    code === 'EHOSTUNREACH' ||
    code === 'ENETUNREACH'
  ) {
    return 'CRAWL_CONNECTION_FAILED';
  }

  return 'CRAWL_REQUEST_FAILED';
};

const classifyHttpStatus = (statusCode) => {
  if (
    Number.isInteger(statusCode) &&
    statusCode >= 200 &&
    statusCode < 400
  ) {
    return {
      status: 'success',
      errorCode: null,
    };
  }

  if (
    Number.isInteger(statusCode) &&
    statusCode >= 400 &&
    statusCode <= 599
  ) {
    return {
      status: 'failed',
      errorCode: `HTTP_${statusCode}`,
    };
  }

  return {
    status: 'failed',
    errorCode: 'CRAWL_INVALID_RESPONSE',
  };
};

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
  if (typeof startUrl !== 'string' || !scope) {
    throw new TypeError('startUrl and scope are required.');
  }

  if (
    !Number.isInteger(maxPaths) ||
    maxPaths < 1 ||
    maxPaths > MAX_PATHS_HARD_LIMIT
  ) {
    throw new TypeError(
      `maxPaths must be between 1 and ${MAX_PATHS_HARD_LIMIT}.`,
    );
  }

  if (
    !Number.isInteger(maxDepth) ||
    maxDepth < 0 ||
    maxDepth > MAX_DEPTH_HARD_LIMIT
  ) {
    throw new TypeError(
      `maxDepth must be between 0 and ${MAX_DEPTH_HARD_LIMIT}.`,
    );
  }

  const limiter = createRateLimiter({
    requestsPerSecond,
  });

  const visited = new Set();
  const queued = new Set();

  const firstUrl = normalizeUrl(startUrl);

  assertInScope(firstUrl, scope);

  const queue = [{
    url: firstUrl,
    depth: 0,
  }];

  queued.add(firstUrl);

  const results = [];

  while (queue.length > 0 && visited.size < maxPaths) {
    if (signal?.aborted) {
      break;
    }

    const current = queue.shift();

    if (visited.has(current.url)) {
      continue;
    }

    if (current.depth > maxDepth) {
      continue;
    }

    assertInScope(current.url, scope);

    visited.add(current.url);

    await limiter.acquire();

    if (signal?.aborted) {
      break;
    }

    let response;

    try {
      response = await get(current.url, {
        headers,
        signal,
      });
    } catch (error) {
      const failedPage = {
        url: current.url,
        depth: current.depth,
        status: 'failed',
        statusCode: null,
        headers: {},
        body: null,
        errorCode: normalizeRequestError(error, signal),
      };

      results.push(failedPage);

      if (typeof onPage === 'function') {
        await onPage(failedPage);
      }

      if (signal?.aborted) {
        break;
      }

      continue;
    }

    const statusCode = Number.isInteger(response?.statusCode)
      ? response.statusCode
      : Number.isInteger(response?.status)
        ? response.status
        : null;

    const classification = classifyHttpStatus(statusCode);

    const responseHeaders =
      response?.headers &&
      typeof response.headers === 'object'
        ? response.headers
        : {};

    const isHtml = String(
      responseHeaders['content-type'] ??
      responseHeaders['Content-Type'] ??
      response?.contentType ??
      '',
    ).toLowerCase().includes('text/html');

    const body = typeof response?.body === 'string'
      ? response.body
      : '';

    const page = {
      url: current.url,
      depth: current.depth,
      status: classification.status,
      statusCode,
      headers: responseHeaders,
      body: classification.status === 'success' ? body : null,
      errorCode: classification.errorCode,
    };

    results.push(page);

    if (typeof onPage === 'function') {
      await onPage(page);
    }

    // Never extract application inputs from HTTP error responses.
    if (
      classification.status !== 'success' ||
      current.depth >= maxDepth ||
      !body ||
      !isHtml
    ) {
      continue;
    }

    const discovered = discoverLinks({
      html: body,
      baseUrl: current.url,
      sameOrigin: true,
    });

    for (const discoveredUrl of discovered) {
      let normalized;

      try {
        normalized = normalizeUrl(discoveredUrl);
        assertInScope(normalized, scope);
      } catch {
        continue;
      }

      if (visited.has(normalized) || queued.has(normalized)) {
        continue;
      }

      if (visited.size + queue.length >= maxPaths) {
        break;
      }

      queue.push({
        url: normalized,
        depth: current.depth + 1,
      });

      queued.add(normalized);
    }
  }

  return {
    pages: results.map((page) => ({
      url: page.url,
      depth: page.depth,
      status: page.status,
      statusCode: page.statusCode,
      errorCode: page.errorCode,
    })),
    visited: visited.size,
    cancelled: Boolean(signal?.aborted),
  };
};

export {
  crawl,
  MAX_PATHS_HARD_LIMIT,
  MAX_DEPTH_HARD_LIMIT,
};