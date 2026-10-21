import mongoose from "mongoose";
import { createHmac } from "node:crypto";

import { getPlan } from "../access/plan.service.js";
import { createScope, isInScope } from "../core/scope.js";

import {
  crawl,
  MAX_PATHS_HARD_LIMIT,
  MAX_DEPTH_HARD_LIMIT,
} from "../core/crawler.js";

import { get } from "../request/request.js";

import {
  discoverPageInputs,
  mergeDiscoveryResults,
} from "../discovery/inputDiscovery.js";

import * as scanRepository from "../database/repositories/scan.repository.js";
import * as crawlDataRepository from "../database/repositories/crawlData.repository.js";
import * as crawlPageRepository from "../database/repositories/crawlPage.repository.js";

const DEFAULT_PAGE_LIMIT = 50;
const MAX_PAGE_LIMIT = 100;

const MAX_FORMS_PER_PAGE = 100;
const MAX_INPUTS_PER_FORM = 200;
const MAX_TOTAL_INPUTS_PER_PAGE = 500;
const MAX_API_REQUESTS_PER_PAGE = 500;
const MAX_PARAMETER_NAMES = 200;
const MAX_OPENAPI_ENDPOINTS_PER_PAGE = 500;

const MAX_SELECT_OPTIONS = 100;
const MAX_ACCEPT_ITEMS = 32;

const ALLOWED_INPUT_TAGS = new Set(["input", "textarea", "select", "button"]);

const ALLOWED_FORM_METHODS = new Set(["GET", "POST", "DIALOG"]);

const ALLOWED_API_METHODS = new Set([
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "OPTIONS",
  "HEAD",
]);

const ALLOWED_API_RESOURCE_TYPES = new Set(["fetch", "xhr"]);

const ALLOWED_OPENAPI_METHODS = new Set([
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "OPTIONS",
  "HEAD",
  "TRACE",
]);

const SENSITIVE_HEADERS = new Set([
  "authorization",
  "proxy-authorization",
  "cookie",
  "set-cookie",
  "x-api-key",
  "x-auth-token",
]);

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
  if (!mongoose.isValidObjectId(ownerId) || !mongoose.isValidObjectId(scanId)) {
    throw createServiceError(
      "INVALID_CRAWL_REFERENCE",
      "A valid owner ID and scan ID are required.",
      400,
    );
  }

  return {
    ownerId: new mongoose.Types.ObjectId(ownerId),
    scanId: new mongoose.Types.ObjectId(scanId),
  };
};

const normalizePagination = ({ limit = DEFAULT_PAGE_LIMIT, skip = 0 } = {}) => {
  const normalizedLimit = Number(limit);
  const normalizedSkip = Number(skip);

  if (
    !Number.isInteger(normalizedLimit) ||
    normalizedLimit < 1 ||
    normalizedLimit > MAX_PAGE_LIMIT
  ) {
    throw createServiceError(
      "INVALID_PAGINATION",
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
      "INVALID_PAGINATION",
      "skip must be an integer between 0 and 100000.",
      400,
    );
  }

  return {
    limit: normalizedLimit,
    skip: normalizedSkip,
  };
};

const getPageKeySecret = () => {
  const secret = process.env.CRAWL_PAGE_KEY_SECRET;

  if (typeof secret !== "string" || Buffer.byteLength(secret, "utf8") < 32) {
    throw createServiceError(
      "CRAWL_PAGE_KEY_SECRET_MISSING",
      "CRAWL_PAGE_KEY_SECRET must be configured with at least 32 bytes.",
      500,
    );
  }

  return secret;
};

const canonicalizeUrlForIdentity = (value) => {
  if (typeof value !== "string") {
    return null;
  }

  try {
    const url = new URL(value);

    if (
      !["http:", "https:"].includes(url.protocol) ||
      url.username ||
      url.password
    ) {
      return null;
    }

    url.hash = "";

    const pairs = [...url.searchParams.entries()].sort(
      ([keyA, valueA], [keyB, valueB]) =>
        keyA.localeCompare(keyB) || valueA.localeCompare(valueB),
    );

    url.search = "";

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

  if (!canonicalUrl) {
    return null;
  }

  return createHmac("sha256", getPageKeySecret())
    .update(canonicalUrl, "utf8")
    .digest("hex");
};

/**
 * Remove query values and fragments before persistence.
 * Preserve parameter names, including repeated parameters.
 */
const sanitizeUrl = (value) => {
  if (typeof value !== "string") {
    return null;
  }

  try {
    const url = new URL(value);

    if (
      !["http:", "https:"].includes(url.protocol) ||
      url.username ||
      url.password
    ) {
      return null;
    }

    url.hash = "";

    const parameterNames = [...url.searchParams.keys()];

    url.search = "";

    for (const name of parameterNames) {
      url.searchParams.append(name, "");
    }

    return url.toString();
  } catch {
    return null;
  }
};

const getContentType = (headers) => {
  if (!headers || typeof headers !== "object") {
    return null;
  }

  const value = headers["content-type"] ?? headers["Content-Type"] ?? null;

  return typeof value === "string" ? value.slice(0, 512) : null;
};

const normalizeStringArray = (
  values,
  maximumLength = 2000,
  maximumItems = 1000,
) => {
  if (!Array.isArray(values)) {
    return [];
  }

  return [
    ...new Set(
      values
        .filter((value) => typeof value === "string" && value.trim().length > 0)
        .map((value) => value.trim().slice(0, maximumLength)),
    ),
  ].slice(0, maximumItems);
};

/**
 * Persist input metadata only.
 * Never persist submitted values, passwords, cookies, or tokens.
 */
const sanitizeInputMetadata = (input) => {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return null;
  }

  const tag = typeof input.tag === "string" ? input.tag.toLowerCase() : null;

  if (!ALLOWED_INPUT_TAGS.has(tag)) {
    return null;
  }

  const safeOptionalString = (value, maxLength) => {
    if (typeof value !== "string" || !value.trim()) {
      return null;
    }

    return value.trim().slice(0, maxLength);
  };

  const safeBoolean = (value) => value === true;

  const safeNonNegativeInteger = (value) =>
    Number.isSafeInteger(value) && value >= 0 ? value : null;

  const safeStringArray = (value, maxItems, maxLength) => {
    if (!Array.isArray(value)) {
      return [];
    }

    const result = [];
    const seen = new Set();

    for (const item of value) {
      if (typeof item !== "string") {
        continue;
      }

      const safeItem = item.trim().slice(0, maxLength);

      if (!safeItem || seen.has(safeItem)) {
        continue;
      }

      seen.add(safeItem);
      result.push(safeItem);

      if (result.length >= maxItems) {
        break;
      }
    }

    return result;
  };

  const safeOptions = (value) => {
    if (!Array.isArray(value)) {
      return [];
    }

    const result = [];
    const seen = new Set();

    for (const option of value.slice(0, MAX_SELECT_OPTIONS)) {
      if (!option || typeof option !== "object" || Array.isArray(option)) {
        continue;
      }

      if (
        typeof option.value !== "string" ||
        typeof option.label !== "string"
      ) {
        continue;
      }

      const safeOption = {
        value: option.value.slice(0, 256),
        label: option.label.slice(0, 256),
        selected: safeBoolean(option.selected),
      };

      const signature = JSON.stringify(safeOption);

      if (seen.has(signature)) {
        continue;
      }

      seen.add(signature);
      result.push(safeOption);
    }

    return result;
  };

  return {
    tag,
    name: safeOptionalString(input.name, 512),
    type: safeOptionalString(input.type, 64),
    id: safeOptionalString(input.id, 256),
    label: safeOptionalString(input.label, 512),
    ariaLabel: safeOptionalString(input.ariaLabel, 512),
    placeholder: safeOptionalString(input.placeholder, 512),
    formId: safeOptionalString(input.formId, 256),
    required: safeBoolean(input.required),
    disabled: safeBoolean(input.disabled),
    autocomplete: safeOptionalString(input.autocomplete, 128),
    pattern: safeOptionalString(input.pattern, 512),
    min: safeOptionalString(input.min, 128),
    max: safeOptionalString(input.max, 128),
    step: safeOptionalString(input.step, 128),
    minlength: safeNonNegativeInteger(input.minlength),
    maxlength: safeNonNegativeInteger(input.maxlength),
    readonly: safeBoolean(input.readonly),
    multiple: safeBoolean(input.multiple),
    accept: safeStringArray(input.accept, MAX_ACCEPT_ITEMS, 256),
    options: safeOptions(input.options),
  };
};

const deduplicateInputs = (inputs, limit) => {
  if (!Array.isArray(inputs) || !Number.isSafeInteger(limit) || limit <= 0) {
    return [];
  }

  const seen = new Set();
  const result = [];

  for (const input of inputs) {
    const safeInput = sanitizeInputMetadata(input);

    if (!safeInput) {
      continue;
    }

    const signature = JSON.stringify(safeInput);

    if (seen.has(signature)) {
      continue;
    }

    seen.add(signature);
    result.push(safeInput);

    if (result.length >= limit) {
      break;
    }
  }

  return result;
};

const sanitizeDiscoveredInputs = ({ discovery, scope }) => {
  const forms = Array.isArray(discovery?.forms) ? discovery.forms : [];
  const inputs = Array.isArray(discovery?.inputs) ? discovery.inputs : [];

  let totalFormInputs = 0;

  const safeForms = forms
    .slice(0, MAX_FORMS_PER_PAGE)
    .map((form) => {
      if (!form || typeof form !== "object" || Array.isArray(form)) {
        return null;
      }

      const action = sanitizeUrl(form.action);

      if (!action || !isInScope(action, scope)) {
        return null;
      }

      const rawMethod =
        typeof form.method === "string" ? form.method.toUpperCase() : "GET";

      const method = ALLOWED_FORM_METHODS.has(rawMethod) ? rawMethod : "GET";

      const remainingCapacity = Math.max(
        0,
        MAX_TOTAL_INPUTS_PER_PAGE - totalFormInputs,
      );

      const formInputs = deduplicateInputs(
        form.inputs,
        Math.min(MAX_INPUTS_PER_FORM, remainingCapacity),
      );

      totalFormInputs += formInputs.length;

      return {
        id:
          typeof form.id === "string"
            ? form.id.trim().slice(0, 256) || null
            : null,
        action,
        method,
        inputs: formInputs,
      };
    })
    .filter(Boolean);

  const safeInputs = deduplicateInputs(
    inputs,
    Math.max(0, MAX_TOTAL_INPUTS_PER_PAGE - totalFormInputs),
  );

  const rawDiscoveredLinks = Array.isArray(discovery?.discoveredLinks)
    ? discovery.discoveredLinks
    : [];

  const discoveredLinks = normalizeStringArray(
    rawDiscoveredLinks
      .map(sanitizeUrl)
      .filter((url) => url && isInScope(url, scope)),
    2000,
    1000,
  );

  return {
    forms: safeForms,
    inputs: safeInputs,
    queryParameterNames: normalizeStringArray(
      discovery?.queryParameterNames,
      256,
      MAX_PARAMETER_NAMES,
    ),
    discoveredLinks,
  };
};

const sanitizeApiRequests = ({ apiRequests, scope }) => {
  if (!Array.isArray(apiRequests)) {
    return [];
  }

  const safeRequests = [];
  const seen = new Set();

  for (const request of apiRequests.slice(0, MAX_API_REQUESTS_PER_PAGE)) {
    if (!request || typeof request !== "object" || Array.isArray(request)) {
      continue;
    }

    const method =
      typeof request.method === "string" ? request.method.toUpperCase() : "";

    const resourceType =
      typeof request.resourceType === "string"
        ? request.resourceType.toLowerCase()
        : "";

    if (
      !ALLOWED_API_METHODS.has(method) ||
      !ALLOWED_API_RESOURCE_TYPES.has(resourceType)
    ) {
      continue;
    }

    const url = sanitizeUrl(request.url);

    if (!url || !isInScope(url, scope)) {
      continue;
    }

    const queryParameterNames = normalizeStringArray(
      request.queryParameterNames,
      256,
      MAX_PARAMETER_NAMES,
    );

    const bodyParameterNames = normalizeStringArray(
      request.bodyParameterNames,
      256,
      MAX_PARAMETER_NAMES,
    );

    const contentType =
      typeof request.contentType === "string"
        ? request.contentType.slice(0, 256)
        : null;

    const statusCode =
      Number.isInteger(request.statusCode) &&
      request.statusCode >= 100 &&
      request.statusCode <= 599
        ? request.statusCode
        : null;

    const safeRequest = {
      url,
      method,
      resourceType,
      contentType,
      queryParameterNames,
      bodyParameterNames,
      statusCode,
    };

    const signature = JSON.stringify(safeRequest);

    if (seen.has(signature)) {
      continue;
    }

    seen.add(signature);
    safeRequests.push(safeRequest);
  }

  return safeRequests;
};

const sanitizeOpenApiEndpoints = (endpoints) => {
  if (!Array.isArray(endpoints)) {
    return [];
  }

  const safeEndpoints = [];
  const seen = new Set();

  for (const endpoint of endpoints) {
    if (!endpoint || typeof endpoint !== "object" || Array.isArray(endpoint)) {
      continue;
    }

    const path = endpoint.path;

    if (
      typeof path !== "string" ||
      path.length === 0 ||
      path.length > 2048 ||
      !path.startsWith("/") ||
      path.startsWith("//") ||
      /[?#\\\u0000-\u001F\u007F]/.test(path) ||
      /%2f|%5c/i.test(path)
    ) {
      continue;
    }

    const method =
      typeof endpoint.method === "string" ? endpoint.method.toUpperCase() : "";

    if (!ALLOWED_OPENAPI_METHODS.has(method)) {
      continue;
    }

    const signature = `${method} ${path}`;

    if (seen.has(signature)) {
      continue;
    }

    seen.add(signature);
    safeEndpoints.push({ path, method });

    if (safeEndpoints.length >= MAX_OPENAPI_ENDPOINTS_PER_PAGE) {
      break;
    }
  }

  return safeEndpoints;
};

const getPageStatus = (page) => {
  if (page?.status === "failed") {
    return "failed";
  }

  if (page?.status === "success") {
    return "success";
  }

  if (
    Number.isInteger(page?.statusCode) &&
    page.statusCode >= 200 &&
    page.statusCode < 400
  ) {
    return "success";
  }

  return "failed";
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

/**
 * Create a request function for crawler HTTP discovery.
 *
 * Browser-managed cookies are selected by Chromium for the requested URL.
 * For separate HTTP requests, retrieve cookies for that exact URL only.
 * Cookies are never shared with another origin.
 *
 * The underlying default transport is the validated request layer.
 */

const createCrawlRequestPage = ({
  scope,
  targetOrigin,
  browserContext,
  requestTransport = get,
}) => {
  return async (value, options = {}) => {
    if (options.signal?.aborted) {
      throw createServiceError(
        "CRAWL_CANCELLED",
        "The crawl was cancelled.",
        499,
      );
    }

    let url;

    try {
      url = new URL(value);
    } catch {
      throw createServiceError(
        "INVALID_CRAWL_REQUEST_URL",
        "A discovered crawl URL is invalid.",
        400,
      );
    }

    if (
      !["http:", "https:"].includes(url.protocol) ||
      url.username ||
      url.password
    ) {
      throw createServiceError(
        "INVALID_CRAWL_REQUEST_URL",
        "A discovered crawl URL must use HTTP or HTTPS without embedded credentials.",
        400,
      );
    }

    if (!isInScope(url.toString(), scope)) {
      throw createServiceError(
        "CRAWL_REQUEST_OUT_OF_SCOPE",
        "The discovered crawl URL is outside the allowed scope.",
        403,
      );
    }

    const sameOrigin = url.origin === targetOrigin;
    const safeHeaders = {};

    if (options.headers && typeof options.headers === "object") {
      for (const [name, headerValue] of Object.entries(options.headers)) {
        if (typeof name !== "string") {
          continue;
        }

        const normalizedName = name.toLowerCase();

        // Never forward caller-supplied authentication headers.
        if (SENSITIVE_HEADERS.has(normalizedName)) {
          continue;
        }

        if (
          typeof headerValue === "string" ||
          typeof headerValue === "number"
        ) {
          safeHeaders[name] = String(headerValue);
        }
      }
    }

    // Only the exact authenticated target origin may receive its cookies.
    if (sameOrigin && browserContext) {
      let cookies;

      try {
        cookies = await browserContext.cookies(url.toString());
      } catch {
        const error = new Error(
          "Authenticated crawl cookies could not be retrieved.",
        );

        error.code = "AUTHENTICATED_COOKIE_LOOKUP_FAILED";
        throw error;
      }

      if (options.signal?.aborted) {
        throw createServiceError(
          "CRAWL_CANCELLED",
          "The crawl was cancelled.",
          499,
        );
      }

      const cookieHeader = cookies
        .filter(
          (cookie) =>
            typeof cookie.name === "string" &&
            typeof cookie.value === "string" &&
            !/[\r\n;]/.test(cookie.name) &&
            !/[\r\n]/.test(cookie.value),
        )
        .map((cookie) => `${cookie.name}=${cookie.value}`)
        .join("; ");

      if (cookieHeader) {
        safeHeaders.Cookie = cookieHeader;
      }
    }

    return requestTransport(url.toString(), {
      ...options,
      scope,
      signal: options.signal,
      headers: safeHeaders,
    });
  };
};

const runCrawlAndPersist = async ({
  ownerId,
  scanId,
  targetUrl,
  plan: planName = "free",
  headers = {},
  signal,
  scopeSnapshot = null,
  browserContext = null,
  requestPage: customRequestPage,
}) => {
  const ids = normalizeIds({ ownerId, scanId });

  if (typeof targetUrl !== "string") {
    throw createServiceError(
      "INVALID_CRAWL_TARGET",
      "A valid HTTP or HTTPS target URL is required.",
      400,
    );
  }

  let parsedTarget;

  try {
    parsedTarget = new URL(targetUrl);
  } catch {
    throw createServiceError(
      "INVALID_CRAWL_TARGET",
      "The crawl target URL is invalid.",
      400,
    );
  }

  if (
    !["http:", "https:"].includes(parsedTarget.protocol) ||
    parsedTarget.username ||
    parsedTarget.password
  ) {
    throw createServiceError(
      "INVALID_CRAWL_TARGET",
      "The crawl target must be an HTTP or HTTPS URL without embedded credentials.",
      400,
    );
  }

  const safeTargetUrl = sanitizeUrl(targetUrl);

  if (!safeTargetUrl) {
    throw createServiceError(
      "INVALID_CRAWL_TARGET",
      "The crawl target URL could not be sanitized.",
      400,
    );
  }

  /*
   * Build and validate scope before deleting or creating crawl data.
   */
  let scope;

  try {
    scope = createScope(targetUrl, scopeSnapshot);
  } catch {
    throw createServiceError(
      "INVALID_CRAWL_SCOPE",
      "The effective crawl scope could not be created.",
      403,
    );
  }

  if (!isInScope(targetUrl, scope)) {
    throw createServiceError(
      "CRAWL_TARGET_OUT_OF_SCOPE",
      "The crawl target is outside the selected saved scope.",
      403,
    );
  }

  getPageKeySecret();

  const plan = getPlan(planName);
  const { maxPaths, maxDepth, requestsPerSecond } = resolveCrawlLimits(plan);

  /*
   * Only create the authenticated HTTP wrapper when an authenticated
   * browser context was supplied. Ordinary crawls keep their old behavior.
   *
   * A custom request function can be supplied for controlled testing or
   * dependency injection; production should use the validated default.
   */
  const authenticatedRequestPage = browserContext
    ? createCrawlRequestPage({
        scope,
        targetOrigin: parsedTarget.origin,
        browserContext,
        requestTransport: customRequestPage ?? get,
      })
    : customRequestPage;

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
    const result = await crawl({
      startUrl: targetUrl,
      scope,
      maxPaths,
      maxDepth,
      requestsPerSecond,
      headers,
      signal,
      browserContext,
      ...(authenticatedRequestPage
        ? { requestPage: authenticatedRequestPage }
        : {}),

      onPage: async (page) => {
        const originalPageUrl = page?.url;
        const pageUrl = sanitizeUrl(originalPageUrl);
        const pageKey = createPageKey(originalPageUrl);

        /*
         * Recheck scope before persisting any discovered page.
         */
        if (!pageUrl || !pageKey || !isInScope(pageUrl, scope)) {
          return;
        }

        const status = getPageStatus(page);
        const contentType = getContentType(page?.headers);

        let staticDiscovery = {
          forms: [],
          inputs: [],
          queryParameterNames: [],
          discoveredLinks: [],
        };

        if (
          status === "success" &&
          typeof page.body === "string" &&
          contentType?.toLowerCase().includes("text/html")
        ) {
          staticDiscovery = discoverPageInputs({
            html: page.body,
            pageUrl: originalPageUrl,
          });
        } else {
          try {
            staticDiscovery.queryParameterNames = [
              ...new URL(originalPageUrl).searchParams.keys(),
            ];
          } catch {
            staticDiscovery.queryParameterNames = [];
          }
        }

        const mergedDiscovery = mergeDiscoveryResults(
          {
            ...staticDiscovery,
            pageUrl: originalPageUrl,
          },
          {
            pageUrl: originalPageUrl,
            inputs: page?.dynamicInputs || [],
            forms: page?.dynamicForms || [],
            discoveredLinks: page?.discoveredLinks || [],
            apiRequests: page?.apiRequests || [],
          },
        );

        const discovered = sanitizeDiscoveredInputs({
          discovery: mergedDiscovery,
          scope,
        });

        const apiRequests = sanitizeApiRequests({
          apiRequests: mergedDiscovery.apiRequests,
          scope,
        });

        await crawlPageRepository.upsertPage({
          ...ids,
          pageKey,
          url: pageUrl,
          depth:
            Number.isInteger(page?.depth) && page.depth >= 0 ? page.depth : 0,
          status,
          statusCode: Number.isInteger(page?.statusCode)
            ? page.statusCode
            : null,
          contentType,
          discoveredLinks: discovered.discoveredLinks,
          queryParameterNames: discovered.queryParameterNames,
          forms: discovered.forms,
          inputs: discovered.inputs,
          apiRequests,
          errorCode:
            typeof page?.errorCode === "string"
              ? page.errorCode.slice(0, 128)
              : null,
        });

        await crawlDataRepository.incrementPageCount({
          ...ids,
          succeeded: status === "success",
        });
      },
    });

    /*
     * OpenAPI metadata is attached after onPage has run.
     * Update existing records without incrementing page counters again.
     */
    for (const page of result?.pages ?? []) {
      if (signal?.aborted) {
        break;
      }

      if (typeof page?.url !== "string") {
        continue;
      }

      const pageUrl = sanitizeUrl(page.url);
      const pageKey = createPageKey(page.url);

      if (!pageUrl || !pageKey || !isInScope(pageUrl, scope)) {
        continue;
      }

      const openApiEndpoints = sanitizeOpenApiEndpoints(page.openApiEndpoints);

      await crawlPageRepository.updateOpenApiEndpoints({
        ...ids,
        pageKey,
        openApiEndpoints,
      });
    }

    const status =
      result?.cancelled || signal?.aborted ? "cancelled" : "completed";

    await crawlDataRepository.finishSession({
      ...ids,
      status,
    });

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
        status: signal?.aborted ? "cancelled" : "failed",
        errorCode: String(error?.code ?? "CRAWL_FAILED").slice(0, 128),
      })
      .catch(() => {});

    throw error;
  }
};

const assertOwnedScan = async ({ ownerId, scanId }) => {
  const ids = normalizeIds({ ownerId, scanId });

  const scan = await scanRepository.findById(ids.ownerId, ids.scanId);

  if (!scan) {
    throw createServiceError("SCAN_NOT_FOUND", "Scan not found.", 404);
  }

  return ids;
};

const getCrawlSummary = async ({ ownerId, scanId }) => {
  const ids = await assertOwnedScan({ ownerId, scanId });

  const session = await crawlDataRepository.findByScan(ids);

  if (!session) {
    throw createServiceError(
      "CRAWL_NOT_FOUND",
      "Crawl data is not available for this scan.",
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
    crawlPageRepository.listByScan({
      ...ids,
      ...pagination,
    }),
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
    crawlPageRepository.listInputsByScan({
      ...ids,
      ...pagination,
    }),
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

export { runCrawlAndPersist, getCrawlSummary, getCrawlPages, getCrawlInputs };
