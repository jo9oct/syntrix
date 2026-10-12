
import mongoose from 'mongoose';
import { createHmac } from 'node:crypto';

import { getPlan } from '../access/plan.service.js';
import { createScope } from '../core/scope.js';
import {
  crawl,
  MAX_PATHS_HARD_LIMIT,
  MAX_DEPTH_HARD_LIMIT,
} from '../core/crawler.js';
import { discoverPageInputs } from '../discovery/inputDiscovery.js';
import * as scanRepository from '../database/repositories/scan.repository.js';
import * as crawlDataRepository from '../database/repositories/crawlData.repository.js';
import * as crawlPageRepository from '../database/repositories/crawlPage.repository.js';

const DEFAULT_PAGE_LIMIT = 50;
const MAX_PAGE_LIMIT = 100;

const parsePositiveInteger = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

const createServiceError = (code, message, statusCode) => {
  const error = new Error(message);
  error.code = code;
  error.statusCode = statusCode;
  return error;
};

const normalizeIds = ({ ownerId, scanId }) => {
  if (
    !mongoose.isValidObjectId(ownerId) ||
    !mongoose.isValidObjectId(scanId)
  ) {
    throw createServiceError(
      'INVALID_CRAWL_REFERENCE',
      'A valid owner ID and scan ID are required.',
      400,
    );
  }

  return {
    ownerId: new mongoose.Types.ObjectId(ownerId),
    scanId: new mongoose.Types.ObjectId(scanId),
  };
};

const normalizePagination = ({
  limit = DEFAULT_PAGE_LIMIT,
  skip = 0,
} = {}) => {
  const normalizedLimit = Number(limit);
  const normalizedSkip = Number(skip);

  if (
    !Number.isInteger(normalizedLimit) ||
    normalizedLimit < 1 ||
    normalizedLimit > MAX_PAGE_LIMIT
  ) {
    throw createServiceError(
      'INVALID_PAGINATION',
      `limit must be an integer between 1 and ${MAX_PAGE_LIMIT}.`,
      400,
    );
  }

  if (
    !Number.isInteger(normalizedSkip) ||
    normalizedSkip < 0 ||
    normalizedSkip > 100_000
  ) {
    throw createServiceError(
      'INVALID_PAGINATION',
      'skip must be an integer between 0 and 100000.',
      400,
    );
  }

  return { limit: normalizedLimit, skip: normalizedSkip };
};

const getPageKeySecret = () => {
  const secret = process.env.CRAWL_PAGE_KEY_SECRET;

  if (
    typeof secret !== 'string' ||
    Buffer.byteLength(secret, 'utf8') < 32
  ) {
    throw createServiceError(
      'CRAWL_PAGE_KEY_SECRET_MISSING',
      'CRAWL_PAGE_KEY_SECRET must be configured with at least 32 bytes.',
      500,
    );
  }

  return secret;
};

/**
 * Produces a stable identity for a URL without persisting the raw URL.
 * Fragments and credentials are excluded. Query key/value pairs are sorted
 * so query parameter ordering does not change page identity.
 */
const canonicalizeUrlForIdentity = (value) => {
  if (typeof value !== 'string') return null;

  try {
    const url = new URL(value);

    if (!['http:', 'https:'].includes(url.protocol)) return null;

    url.hash = '';
    url.username = '';
    url.password = '';

    const pairs = [...url.searchParams.entries()].sort(
      ([keyA, valueA], [keyB, valueB]) =>
        keyA.localeCompare(keyB) || valueA.localeCompare(valueB),
    );

    url.search = '';

    for (const [key, parameterValue] of pairs) {
      url.searchParams.append(key, parameterValue);
    }

    return url.toString();
  } catch {
    return null;
  }
};

const createPageKey = (value) => {
  const canonicalUrl = canonicalizeUrlForIdentity(value);

  if (!canonicalUrl) return null;

  return createHmac('sha256', getPageKeySecret())
    .update(canonicalUrl, 'utf8')
    .digest('hex');
};

/**
 * Persist only sanitized URLs: query values, fragments and credentials
 * are removed before URLs are saved or returned to API clients.
 */
const sanitizeUrl = (value) => {
  if (typeof value !== 'string') return null;

  try {
    const url = new URL(value);

    if (!['http:', 'https:'].includes(url.protocol)) return null;

    url.hash = '';
    url.username = '';
    url.password = '';

    for (const key of [...url.searchParams.keys()]) {
      url.searchParams.set(key, '');
    }

    return url.toString();
  } catch {
    return null;
  }
};

const getOrigin = (value) => {
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
};

const getContentType = (headers) => {
  if (!headers || typeof headers !== 'object') return null;

  const value = headers['content-type'] ?? headers['Content-Type'] ?? null;

  return typeof value === 'string' ? value.slice(0, 512) : null;
};

const normalizeStringArray = (values, maximumLength = 2000) => {
  if (!Array.isArray(values)) return [];

  return [
    ...new Set(
      values
        .filter((value) => typeof value === 'string' && value.length > 0)
        .map((value) => value.slice(0, maximumLength)),
    ),
  ];
};

const sanitizeDiscoveredInputs = ({ discovery, targetOrigin }) => {
  const forms = Array.isArray(discovery?.forms) ? discovery.forms : [];
  const inputs = Array.isArray(discovery?.inputs) ? discovery.inputs : [];
  const discoveredLinks = Array.isArray(discovery?.discoveredLinks)
    ? discovery.discoveredLinks
    : [];

  const safeForms = forms
    .map((form) => {
      const action = sanitizeUrl(form?.action);

      if (!action || getOrigin(action) !== targetOrigin) return null;

      return { ...form, action };
    })
    .filter(Boolean);

  // Save field metadata only; never save submitted field values.
  const safeInputs = inputs
    .filter(
      (input) =>
        input &&
        typeof input === 'object' &&
        typeof input.name === 'string' &&
        input.name.length > 0,
    )
    .map((input) => ({
      name: input.name.slice(0, 256),
      type: typeof input.type === 'string' ? input.type.slice(0, 64) : 'text',
      required: Boolean(input.required),
      ...(typeof input.autocomplete === 'string'
        ? { autocomplete: input.autocomplete.slice(0, 128) }
        : {}),
      ...(typeof input.inputMode === 'string'
        ? { inputMode: input.inputMode.slice(0, 64) }
        : {}),
      ...(typeof input.formMethod === 'string'
        ? { formMethod: input.formMethod.toUpperCase().slice(0, 16) }
        : {}),
      ...(typeof input.formAction === 'string' &&
      getOrigin(input.formAction) === targetOrigin
        ? { formAction: sanitizeUrl(input.formAction) }
        : {}),
    }));

  const safeLinks = normalizeStringArray(
    discoveredLinks
      .map(sanitizeUrl)
      .filter((url) => url && getOrigin(url) === targetOrigin),
  );

  return {
    forms: safeForms,
    inputs: safeInputs,
    queryParameterNames: normalizeStringArray(
      discovery?.queryParameterNames,
      256,
    ),
    discoveredLinks: safeLinks,
  };
};

const getPageStatus = (page) => {
  if (page?.status === 'failed') return 'failed';
  if (page?.status === 'success') return 'success';

  if (
    Number.isInteger(page?.statusCode) &&
    page.statusCode >= 200 &&
    page.statusCode < 400
  ) {
    return 'success';
  }

  return 'failed';
};

const getHardLimits = () => ({
  paths: parsePositiveInteger(
    process.env.MAX_CRAWL_PATHS_HARD_LIMIT,
    MAX_PATHS_HARD_LIMIT ?? 5000,
  ),
  depth: parsePositiveInteger(
    process.env.MAX_CRAWL_DEPTH_HARD_LIMIT,
    MAX_DEPTH_HARD_LIMIT ?? 20,
  ),
});

const resolveCrawlLimits = (plan) => {
  const hardLimits = getHardLimits();

  return {
    maxPaths: Math.min(
      plan.maxCrawlPaths ?? hardLimits.paths,
      hardLimits.paths,
    ),
    maxDepth: Math.min(
      plan.maxCrawlDepth ?? hardLimits.depth,
      hardLimits.depth,
    ),
    requestsPerSecond: parsePositiveInteger(plan.requestRateLimit, 2),
  };
};

const runCrawlAndPersist = async ({
  ownerId,
  scanId,
  targetUrl,
  plan: planName = 'free',
  headers = {},
  signal,
}) => {
  const ids = normalizeIds({ ownerId, scanId });

  if (typeof targetUrl !== 'string') {
    throw createServiceError(
      'INVALID_CRAWL_TARGET',
      'A valid HTTP or HTTPS target URL is required.',
      400,
    );
  }

  let parsedTarget;

  try {
    parsedTarget = new URL(targetUrl);
  } catch {
    throw createServiceError(
      'INVALID_CRAWL_TARGET',
      'The crawl target URL is invalid.',
      400,
    );
  }

  if (
    !['http:', 'https:'].includes(parsedTarget.protocol) ||
    parsedTarget.username ||
    parsedTarget.password
  ) {
    throw createServiceError(
      'INVALID_CRAWL_TARGET',
      'The crawl target must be an HTTP or HTTPS URL without embedded credentials.',
      400,
    );
  }

  const targetOrigin = parsedTarget.origin;
  const safeTargetUrl = sanitizeUrl(targetUrl);

  if (!safeTargetUrl) {
    throw createServiceError(
      'INVALID_CRAWL_TARGET',
      'The crawl target URL could not be sanitized.',
      400,
    );
  }

  // Fail before clearing existing crawl results if the secret is missing.
  getPageKeySecret();

  const plan = getPlan(planName);
  const { maxPaths, maxDepth, requestsPerSecond } = resolveCrawlLimits(plan);

  await crawlPageRepository.deleteByScan(ids);

  await crawlDataRepository.startSession({
    ...ids,
    targetUrl: safeTargetUrl,
    plan: plan.name,
    maxPaths,
    maxDepth,
    requestsPerSecond,
  });

  try {
    const scope = createScope(targetUrl);

    const result = await crawl({
      startUrl: targetUrl,
      scope,
      maxPaths,
      maxDepth,
      requestsPerSecond,
      headers,
      signal,

      onPage: async (page) => {
        const originalPageUrl = page?.url;
        const pageUrl = sanitizeUrl(originalPageUrl);
        const pageKey = createPageKey(originalPageUrl);

        if (
          !pageUrl ||
          !pageKey ||
          getOrigin(pageUrl) !== targetOrigin
        ) {
          return;
        }

        const status = getPageStatus(page);
        const contentType = getContentType(page?.headers);

        let discovered = {
          forms: [],
          inputs: [],
          queryParameterNames: [],
          discoveredLinks: [],
        };

        if (
          status === 'success' &&
          typeof page.body === 'string' &&
          contentType?.toLowerCase().includes('text/html')
        ) {
          const discovery = discoverPageInputs({
            html: page.body,
            pageUrl: originalPageUrl,
          });

          discovered = sanitizeDiscoveredInputs({
            discovery,
            targetOrigin,
          });
        } else {
          try {
            discovered.queryParameterNames = normalizeStringArray(
              [...new URL(originalPageUrl).searchParams.keys()],
              256,
            );
          } catch {
            discovered.queryParameterNames = [];
          }
        }

        await crawlPageRepository.upsertPage({
          ...ids,
          pageKey,
          url: pageUrl,
          depth:
            Number.isInteger(page?.depth) && page.depth >= 0
              ? page.depth
              : 0,
          status,
          statusCode: Number.isInteger(page?.statusCode)
            ? page.statusCode
            : null,
          contentType,
          discoveredLinks: discovered.discoveredLinks,
          queryParameterNames: discovered.queryParameterNames,
          forms: discovered.forms,
          inputs: discovered.inputs,
          errorCode:
            typeof page?.errorCode === 'string'
              ? page.errorCode.slice(0, 128)
              : null,
        });

        await crawlDataRepository.incrementPageCount({
          ...ids,
          succeeded: status === 'success',
        });
      },
    });

    const status =
      result?.cancelled || signal?.aborted ? 'cancelled' : 'completed';

    await crawlDataRepository.finishSession({ ...ids, status });

    return {
      ...result,
      status,
      plan: plan.name,
      maxPaths,
      maxDepth,
      requestsPerSecond,
    };
  } catch (error) {
    await crawlDataRepository
      .finishSession({
        ...ids,
        status: signal?.aborted ? 'cancelled' : 'failed',
        errorCode: String(error?.code ?? 'CRAWL_FAILED').slice(0, 128),
      })
      .catch(() => {});

    throw error;
  }
};

const assertOwnedScan = async ({ ownerId, scanId }) => {
  const ids = normalizeIds({ ownerId, scanId });
  const scan = await scanRepository.findById(ids.ownerId, ids.scanId);

  if (!scan) {
    throw createServiceError('SCAN_NOT_FOUND', 'Scan not found.', 404);
  }

  return ids;
};

const getCrawlSummary = async ({ ownerId, scanId }) => {
  const ids = await assertOwnedScan({ ownerId, scanId });
  const session = await crawlDataRepository.findByScan(ids);

  if (!session) {
    throw createServiceError(
      'CRAWL_NOT_FOUND',
      'Crawl data is not available for this scan.',
      404,
    );
  }

  return session;
};

const getCrawlPages = async ({
  ownerId,
  scanId,
  limit = DEFAULT_PAGE_LIMIT,
  skip = 0,
}) => {
  const pagination = normalizePagination({ limit, skip });
  const session = await getCrawlSummary({ ownerId, scanId });
  const ids = normalizeIds({ ownerId, scanId });

  const [pages, total] = await Promise.all([
    crawlPageRepository.listByScan({ ...ids, ...pagination }),
    crawlPageRepository.countByScan(ids),
  ]);

  return {
    scanId: String(session.scanId ?? scanId),
    pagination: {
      ...pagination,
      total,
      hasMore: pagination.skip + pages.length < total,
    },
    pages,
  };
};

const getCrawlInputs = async ({
  ownerId,
  scanId,
  limit = DEFAULT_PAGE_LIMIT,
  skip = 0,
}) => {
  const pagination = normalizePagination({ limit, skip });
  const session = await getCrawlSummary({ ownerId, scanId });
  const ids = normalizeIds({ ownerId, scanId });

  const [pages, total] = await Promise.all([
    crawlPageRepository.listInputsByScan({ ...ids, ...pagination }),
    crawlPageRepository.countInputPagesByScan(ids),
  ]);

  return {
    scanId: String(session.scanId ?? scanId),
    pagination: {
      ...pagination,
      total,
      hasMore: pagination.skip + pages.length < total,
    },
    pages,
  };
};

export {
  runCrawlAndPersist,
  getCrawlSummary,
  getCrawlPages,
  getCrawlInputs,
};
