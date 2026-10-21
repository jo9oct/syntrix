
/* STATUS: UPDATED
 * File: src/jobs/scan.job.js
 */

import { UnrecoverableError, Worker } from "bullmq";

import environment from "../config/environment.js";
import { redisConnection, scanQueue } from "../config/queue.js";
import { executeScan } from "../engine/scanEngine.js";

import {
  attachFindingFingerprints,
  correlateFindings,
  createEvidenceFingerprint,
} from "../analysis/fingerprint/fingerprint.js";

import {
  calculateRisk,
  sortFindingsByRisk,
} from "../analysis/risk/risk.js";

import { evaluateCompanyRules } from "../analysis/companyRules/companyRuleEvaluator.js";

import { getPlan } from "../access/plan.service.js";
import { resolveEffectivePlanName } from "../access/subscription.service.js";

import * as scanRepository from "../database/repositories/scan.repository.js";
import * as targetRepository from "../database/repositories/target.repository.js";
import * as findingRepository from "../database/repositories/finding.repository.js";
import * as evidenceRepository from "../database/repositories/evidence.repository.js";
import * as fingerprintRepository from "../database/repositories/fingerprint.repository.js";
import * as verificationRepository from "../database/repositories/verification.repository.js";
import * as guestSessionRepository from "../database/repositories/guestSession.repository.js";

import {
  getCredentials,
  deleteCredentials,
} from "../services/credentialVault.service.js";

import {
  createAuthenticatedBrowserSession,
} from "../services/authenticatedBrowserSession.service.js";

import { analyzeAndPersistFindings } from "../services/aiAnalysis.service.js";

import {
  createAndPersistComparisonForScan,
} from "../services/scanComparison.service.js";

import {
  normalizeSelection,
  normalizeCompanyRuleIds,
  getSelectedScannerIds,
} from "../validators/scan.validator.js";

import {
  notifyScanStarted,
  notifyScanCompleted,
  notifyScanFailed,
} from "../notifications/notification.service.js";

import {
  recordScanStarted,
  recordScanCompleted,
  recordScanFailed,
  recordScanCancelled,
} from "../metrics/scan.metrics.js";

import { runCrawlAndPersist } from "../services/crawl.service.js";

import {
  assertScanWritable,
  assertScanCanFinish,
  buildScannerOutcomes,
  isDeletedScanError,
} from "../services/scanWorkerGuard.service.js";

const SCAN_JOB_NAME = "security-scan";

const TERMINAL_SCAN_ERROR_CODES = new Set([
  "SCAN_CREDENTIALS_EXPIRED",
  "SCAN_CREDENTIAL_REFERENCE_MISSING",
  "AUTHENTICATION_SCANNING_NOT_AVAILABLE",
  "CREDENTIAL_ENCRYPTION_KEY_INVALID",
  "SUBSCRIPTION_USER_REQUIRED",
  "SUBSCRIPTION_USER_NOT_FOUND",
  "SUBSCRIPTION_ACCOUNT_INACTIVE",
  "SCAN_TARGET_NOT_FOUND",
  "NO_SCANNERS_SELECTED",
  "GUEST_SESSION_EXPIRED",
  "SCAN_STATUS_TRANSITION_FAILED",
]);

const AUTHENTICATION_ERROR_CODES = new Set([
  "AUTH_INVALID_TARGET",
  "AUTH_CREDENTIALS_INVALID",
  "AUTH_COOKIE_INVALID",
  "AUTH_SESSION_UNCONFIRMED",
  "AUTH_LOGIN_FORM_NOT_FOUND",
  "AUTH_LOGIN_UNCONFIRMED",
  "AUTH_FORM_FILL_FAILED",
  "AUTH_CROSS_ORIGIN_REDIRECT",
  "AUTH_CAPTCHA_REQUIRED",
  "AUTH_MFA_REQUIRED",
  "AUTHENTICATION_FAILED",
  "AUTHENTICATED_COOKIE_RESOLUTION_FAILED",
  "AUTHENTICATED_CRAWL_FAILED",
  "INVALID_AUTHENTICATED_SESSION",
]);

const REDACTED_VALUE = "[REDACTED]";

const SENSITIVE_KEY_PATTERN =
  /password|passwd|secret|token|authorization|cookie|session|credential|api[-_]?key|access[-_]?key|refresh[-_]?token|client[-_]?secret|private[-_]?key/i;

const SENSITIVE_HEADER_NAMES = new Set([
  "authorization",
  "proxy-authorization",
  "cookie",
  "cookie2",
  "set-cookie",
  "x-api-key",
  "x-auth-token",
  "x-access-token",
  "x-refresh-token",
  "x-csrf-token",
  "x-xsrf-token",
  "x-forwarded-authorization",
]);

const createWorkerError = (message, statusCode, code) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
};

const createGuestSessionExpiredError = () =>
  createWorkerError(
    "The guest session has expired.",
    410,
    "GUEST_SESSION_EXPIRED",
  );

const createComparisonRetryError = (cause) => {
  const error = new Error(
    "Automatic scan comparison failed and must be retried.",
    { cause },
  );

  error.code = cause?.code ?? "SCAN_COMPARISON_FAILED";
  error.scanComparisonRetry = true;

  return error;
};

const isAuthenticationError = (error) =>
  AUTHENTICATION_ERROR_CODES.has(error?.code) ||
  String(error?.code ?? "").startsWith("AUTH_");

const isCancellationError = (error) =>
  error?.name === "AbortError" ||
  error?.code === "REQUEST_CANCELLED" ||
  error?.code === "AUTH_CANCELLED" ||
  error?.code === "SCAN_CANCELLED";

const getAuthenticationFailureMessage = (error) => {
  const messages = {
    AUTH_COOKIE_INVALID:
      "The supplied session cookie format is invalid.",

    AUTH_SESSION_UNCONFIRMED:
      "The session cookie could not be confirmed as authenticated.",

    AUTH_LOGIN_UNCONFIRMED:
      "The login attempt could not be confirmed. Credentials may be incorrect or another login step may be required.",

    AUTH_LOGIN_FORM_NOT_FOUND:
      "The expected login form was not found.",

    AUTH_CROSS_ORIGIN_REDIRECT:
      "Authentication redirected to another origin. Authentication credentials were not forwarded to that destination.",

    AUTH_CAPTCHA_REQUIRED:
      "The target requires CAPTCHA verification.",

    AUTH_MFA_REQUIRED:
      "The target requires multi-factor authentication.",

    AUTH_FORM_FILL_FAILED:
      "The login form could not be completed automatically.",

    AUTH_INVALID_TARGET:
      "The authentication target URL is invalid or unsupported.",

    AUTHENTICATED_COOKIE_RESOLUTION_FAILED:
      "The authenticated session cookies could not be retrieved.",

    AUTHENTICATED_CRAWL_FAILED:
      "Authenticated crawling failed. Publicly accessible pages will be scanned where possible.",

    AUTHENTICATION_FAILED:
      "The authenticated session could not be established.",

    INVALID_AUTHENTICATED_SESSION:
      "The authenticated session was invalid and could not be used.",
  };

  return (
    messages[error?.code] ??
    "Authentication could not be confirmed. Publicly accessible pages will be scanned where possible."
  );
};

const createAuthenticationStatus = ({
  status,
  message,
  errorCode = null,
  authenticatedCoverageConfirmed = false,
}) => ({
  status,
  message,
  errorCode,
  authenticatedCoverageConfirmed,
  updatedAt: new Date(),
});

const logEvent = (event, details = {}) => {
  console.info(
    JSON.stringify({
      event,
      ...details,
    }),
  );
};

const logFailure = (event, details = {}) => {
  console.error(
    JSON.stringify({
      event,
      ...details,
    }),
  );
};

const isPlainObject = (value) =>
  value !== null &&
  typeof value === "object" &&
  !Array.isArray(value);

const normalizeFindingKey = (value) => {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();

  return normalized.length > 0 ? normalized : null;
};

/*
 * Authenticated request-header resolver.
 *
 * Cookies are resolved only for the exact authenticated origin.
 * The HTTP client must independently validate scope, destination,
 * redirects, and DNS before using this resolver.
 */

const createAuthenticatedHeaderResolver = (authenticatedSession) => {
  if (
    !authenticatedSession?.context ||
    typeof authenticatedSession.targetOrigin !== "string"
  ) {
    throw createWorkerError(
      "The authenticated browser session is invalid.",
      500,
      "INVALID_AUTHENTICATED_SESSION",
    );
  }

  let authenticatedOrigin;

  try {
    const parsedOrigin = new URL(authenticatedSession.targetOrigin);

    if (
      !["http:", "https:"].includes(parsedOrigin.protocol) ||
      parsedOrigin.username ||
      parsedOrigin.password ||
      parsedOrigin.origin !== authenticatedSession.targetOrigin
    ) {
      throw new Error("Invalid authenticated origin.");
    }

    authenticatedOrigin = parsedOrigin.origin;
  } catch {
    throw createWorkerError(
      "The authenticated browser origin is invalid.",
      500,
      "INVALID_AUTHENTICATED_SESSION",
    );
  }

  return async ({ url, signal } = {}) => {
    if (signal?.aborted) {
      const error = new Error("Authenticated request was cancelled.");
      error.code = "REQUEST_CANCELLED";
      throw error;
    }

    if (typeof url !== "string" || !url) {
      throw new TypeError("Authenticated request URL is required.");
    }

    let requestUrl;

    try {
      requestUrl = new URL(url);
    } catch {
      throw new TypeError("Authenticated request URL is invalid.");
    }

    if (!["http:", "https:"].includes(requestUrl.protocol)) {
      throw new Error("Unsupported authenticated request protocol.");
    }

    // A different scheme, hostname, or port means a different origin.
    if (requestUrl.origin !== authenticatedOrigin) {
      return {};
    }

    let cookies;

    try {
      cookies = await authenticatedSession.context.cookies(
        requestUrl.toString(),
      );
    } catch {
      const error = new Error(
        "Could not resolve authenticated browser cookies.",
      );

      error.code = "AUTHENTICATED_COOKIE_RESOLUTION_FAILED";
      throw error;
    }

    if (signal?.aborted) {
      const error = new Error("Authenticated request was cancelled.");
      error.code = "REQUEST_CANCELLED";
      throw error;
    }

    if (!Array.isArray(cookies)) {
      const error = new Error("Authenticated browser cookies are invalid.");
      error.code = "AUTHENTICATED_COOKIE_RESOLUTION_FAILED";
      throw error;
    }

    const cookieHeader = cookies
      .filter(
        (cookie) =>
          cookie &&
          typeof cookie.name === "string" &&
          cookie.name.length > 0 &&
          !/[;=\r\n]/.test(cookie.name) &&
          typeof cookie.value === "string" &&
          !/[\r\n]/.test(cookie.value),
      )
      .map((cookie) => `${cookie.name}=${cookie.value}`)
      .join("; ");

    return cookieHeader ? { cookie: cookieHeader } : {};
  };
};

/*
 * Redaction helpers.
 */

const redactHeaders = (headers) => {
  if (!isPlainObject(headers)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(headers).map(([name, value]) => [
      name,
      SENSITIVE_HEADER_NAMES.has(name.toLowerCase()) ||
      SENSITIVE_KEY_PATTERN.test(name)
        ? REDACTED_VALUE
        : typeof value === "string"
          ? value.slice(0, 8192)
          : value,
    ]),
  );
};

const redactUrl = (value) => {
  if (typeof value !== "string" || value.length === 0) {
    return value ?? null;
  }

  try {
    const url = new URL(value);

    url.username = "";
    url.password = "";

    for (const key of [...url.searchParams.keys()]) {
      url.searchParams.set(key, REDACTED_VALUE);
    }

    url.hash = "";

    return url.toString().slice(0, 2048);
  } catch {
    return "[URL REDACTED]";
  }
};

const redactText = (value) => {
  if (typeof value !== "string") {
    return value;
  }

  let output = value;

  output = output.replace(
    /(["']?(?:password|passwd|secret|token|authorization|cookie|credential|api[-_]?key|access[-_]?key|refresh[-_]?token|client[-_]?secret|private[-_]?key)["']?\s*[:=]\s*)(["']?)[^"',\s&}]+/gi,
    `$1${REDACTED_VALUE}`,
  );

  output = output.replace(
    /\b(Basic|Bearer)\s+[A-Za-z0-9._~+/=-]+/gi,
    `$1 ${REDACTED_VALUE}`,
  );

  output = output.replace(
    /\b(cookie|set-cookie)\s*:\s*[^\r\n]*/gi,
    `$1: ${REDACTED_VALUE}`,
  );

  return output.slice(0, 20_000);
};

const redactValue = (value, key = "", depth = 0) => {
  if (SENSITIVE_KEY_PATTERN.test(key)) {
    return REDACTED_VALUE;
  }

  if (value === null || value === undefined) {
    return value ?? null;
  }

  if (depth > 8) {
    return "[TRUNCATED]";
  }

  if (typeof value === "string") {
    return redactText(value);
  }

  if (Array.isArray(value)) {
    return value
      .slice(0, 100)
      .map((item) => redactValue(item, key, depth + 1));
  }

  if (isPlainObject(value)) {
    return Object.fromEntries(
      Object.entries(value)
        .slice(0, 200)
        .map(([childKey, childValue]) => [
          childKey,
          redactValue(childValue, childKey, depth + 1),
        ]),
    );
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return value;
  }

  return String(value).slice(0, 1000);
};

const sanitizeJobOptions = (options) => {
  if (!isPlainObject(options)) {
    return {};
  }

  const sanitize = (value, depth = 0) => {
    if (depth > 8) {
      return undefined;
    }

    if (Array.isArray(value)) {
      return value
        .slice(0, 100)
        .map((item) => sanitize(item, depth + 1))
        .filter((item) => item !== undefined);
    }

    if (!isPlainObject(value)) {
      if (
        typeof value === "string" &&
        /^(Basic|Bearer)\s+/i.test(value.trim())
      ) {
        return REDACTED_VALUE;
      }

      return value;
    }

    const output = {};

    for (const [key, childValue] of Object.entries(value).slice(0, 200)) {
      // Do not put credentials or session material in the queue payload.
      if (SENSITIVE_KEY_PATTERN.test(key)) {
        continue;
      }

      if (key.toLowerCase() === "headers" && isPlainObject(childValue)) {
        const safeHeaders = {};

        for (const [headerName, headerValue] of Object.entries(childValue)) {
          if (
            SENSITIVE_HEADER_NAMES.has(headerName.toLowerCase()) ||
            SENSITIVE_KEY_PATTERN.test(headerName)
          ) {
            continue;
          }

          safeHeaders[headerName] = sanitize(headerValue, depth + 1);
        }

        output[key] = safeHeaders;
        continue;
      }

      const sanitizedValue = sanitize(childValue, depth + 1);

      if (sanitizedValue !== undefined) {
        output[key] = sanitizedValue;
      }
    }

    return output;
  };

  return sanitize(options) ?? {};
};

const normalizeBody = (body) => {
  if (body === undefined || body === null) {
    return null;
  }

  const sanitized = redactValue(body);

  if (typeof sanitized === "string") {
    return sanitized.slice(0, 20_000);
  }

  try {
    return JSON.stringify(sanitized).slice(0, 20_000);
  } catch {
    return "[BODY REDACTED]";
  }
};

const normalizeParameters = (parameters) =>
  isPlainObject(parameters) ? redactValue(parameters) : {};

const getContentType = (headers) => {
  if (!isPlainObject(headers)) {
    return null;
  }

  const value =
    headers["content-type"] ??
    headers["Content-Type"] ??
    null;

  return typeof value === "string" ? value.slice(0, 512) : null;
};

const getBodyLength = (body) => {
  if (body === undefined || body === null) {
    return null;
  }

  if (typeof body === "string") {
    return body.length;
  }

  try {
    return JSON.stringify(body).length;
  } catch {
    return null;
  }
};

/*
 * Guest-session and scan-state validation.
 */

const assertGuestSessionActive = async ({ ownerId, isGuest }) => {
  if (!isGuest) {
    return;
  }

  const session = await guestSessionRepository.findByGuestOwnerId(ownerId);

  if (
    !session ||
    !session.expiresAt ||
    new Date(session.expiresAt).getTime() <= Date.now()
  ) {
    throw createGuestSessionExpiredError();
  }
};

const assertWorkerCanContinue = async ({
  ownerId,
  scanId,
  isGuest = false,
}) => {
  await assertGuestSessionActive({ ownerId, isGuest });
  await assertScanWritable({ ownerId, scanId });
};

const resolveWorkerPlan = async ({ ownerId, isGuest }) => {
  const planName = await resolveEffectivePlanName({
    userId: ownerId,
    isGuest,
  });

  return getPlan(planName);
};

/*
 * Scanner selection.
 */

const buildEngineSelection = (selection) => {
  const normalizedSelection = normalizeSelection(selection);
  const selectedScannerIds = getSelectedScannerIds(normalizedSelection);

  if (selectedScannerIds.length === 0) {
    throw createWorkerError(
      "Scan selection is mandatory. At least one scanner must be selected.",
      400,
      "NO_SCANNERS_SELECTED",
    );
  }

  return {
    mode: "selected",
    recon: [...normalizedSelection.recon],
    security: [...normalizedSelection.security],
    selectedScannerIds,
  };
};

/*
 * Enqueue a scan.
 *
 * BullMQ receives only the temporary credential reference, never the
 * plaintext credentials or the cookie header.
 */

const enqueueScanJob = async ({
  ownerId,
  scanId,
  targetId,
  target,
  selection,
  companyRuleIds = [],
  scopeSnapshot = null,
  options = {},
  credentialReference = null,
  isGuest = false,
  plan = "free",
}) => {
  if (!ownerId || !scanId || !targetId || !target?.url || !selection) {
    throw new Error(
      "ownerId, scanId, targetId, target.url, and selection are required.",
    );
  }

  const engineSelection = buildEngineSelection(selection);
  const normalizedCompanyRuleIds = normalizeCompanyRuleIds(companyRuleIds);
  const acceptedPlan = getPlan(isGuest ? "free" : plan);

  if (isGuest && credentialReference) {
    throw createWorkerError(
      "Guest scans cannot use authenticated scanning.",
      403,
      "AUTHENTICATION_SCANNING_NOT_AVAILABLE",
    );
  }

  if (
    normalizedCompanyRuleIds.length > 0 &&
    (isGuest || acceptedPlan.integrations?.companyRules !== true)
  ) {
    throw createWorkerError(
      "Company security rules are available only on the Enterprise plan.",
      403,
      "FEATURE_NOT_AVAILABLE",
    );
  }

  if (
    credentialReference !== null &&
    (typeof credentialReference !== "string" ||
      credentialReference.length === 0)
  ) {
    throw new TypeError(
      "credentialReference must be a non-empty string.",
    );
  }

  if (
    credentialReference &&
    acceptedPlan.authenticationScanning !== true
  ) {
    throw createWorkerError(
      "Authentication scanning is not available on the current plan.",
      403,
      "AUTHENTICATION_SCANNING_NOT_AVAILABLE",
    );
  }

  const safeOptions = sanitizeJobOptions(options);

  return scanQueue.add(
    SCAN_JOB_NAME,
    {
      ownerId,
      scanId,
      targetId,

      target: {
        url: target.url,
        hostname: target.hostname ?? null,
        normalizedUrl: target.normalizedUrl ?? null,
      },

      selection: engineSelection,
      companyRuleIds: normalizedCompanyRuleIds,

      scopeSnapshot: scopeSnapshot
        ? {
            ...scopeSnapshot,
            scopeId: String(scopeSnapshot.scopeId),
          }
        : null,

      options: safeOptions,
      credentialReference,
      isGuest: Boolean(isGuest),
    },
    {
      jobId: `scan:${scanId}`,
    },
  );
};

/*
 * Evidence-to-finding association.
 */

const getFindingKey = (finding) =>
  normalizeFindingKey(finding?.fingerprint) ??
  normalizeFindingKey(
    `${finding?.scannerId ?? ""}:${finding?.title ?? ""}`,
  );

const extractFindingTitleFromKey = (findingKey) => {
  const normalized = normalizeFindingKey(findingKey);

  if (!normalized) {
    return null;
  }

  const separatorIndex = normalized.lastIndexOf(":");

  if (separatorIndex === -1) {
    return null;
  }

  return normalizeFindingKey(normalized.slice(separatorIndex + 1));
};

const resolveFindingId = ({ item, findingIds }) => {
  if (item?.findingId) {
    return item.findingId;
  }

  for (const key of [
    item?.findingFingerprint,
    item?.findingKey,
    item?.fingerprint,
  ]) {
    const normalized = normalizeFindingKey(key);

    if (normalized && findingIds.has(normalized)) {
      return findingIds.get(normalized);
    }
  }

  return null;
};

const findMatchingFindingIds = ({ item, findings, findingIds }) => {
  const explicitId = resolveFindingId({ item, findingIds });

  if (explicitId) {
    return [explicitId];
  }

  const findingFingerprint = normalizeFindingKey(item?.findingFingerprint);
  const evidenceFingerprint = normalizeFindingKey(item?.fingerprint);
  const findingKey = normalizeFindingKey(item?.findingKey);

  const evidenceTitle =
    normalizeFindingKey(item?.title) ??
    extractFindingTitleFromKey(findingKey);

  const evidenceDescription = normalizeFindingKey(item?.description);

  if (findingFingerprint || evidenceFingerprint) {
    const fingerprint = findingFingerprint ?? evidenceFingerprint;

    const matches = findings.filter(
      (finding) => normalizeFindingKey(finding.fingerprint) === fingerprint,
    );

    if (matches.length > 0) {
      return matches
        .map((finding) => findingIds.get(getFindingKey(finding)))
        .filter(Boolean);
    }
  }

  if (evidenceTitle) {
    let matches = findings.filter(
      (finding) => normalizeFindingKey(finding.title) === evidenceTitle,
    );

    if (matches.length > 1 && item?.scannerId) {
      matches = matches.filter(
        (finding) => finding.scannerId === item.scannerId,
      );
    }

    if (matches.length === 1) {
      const id = findingIds.get(getFindingKey(matches[0]));
      if (id) return [id];
    }
  }

  if (evidenceDescription) {
    const matches = findings.filter(
      (finding) =>
        normalizeFindingKey(finding.description) === evidenceDescription,
    );

    if (matches.length === 1) {
      const id = findingIds.get(getFindingKey(matches[0]));
      if (id) return [id];
    }
  }

  // Match evidence to a unique finding using scanner-specific metadata.
  const evidenceParameter = normalizeFindingKey(item?.metadata?.parameter);
  const evidenceTechnique = normalizeFindingKey(item?.metadata?.technique);

  if (evidenceParameter || evidenceTechnique) {
    const matches = findings.filter((finding) => {
      const findingParameter = normalizeFindingKey(
        finding?.metadata?.parameter,
      );
      const findingTechnique = normalizeFindingKey(
        finding?.metadata?.technique,
      );

      return (
        (!item?.scannerId ||
          normalizeFindingKey(finding?.scannerId) ===
            normalizeFindingKey(item.scannerId)) &&
        (!evidenceParameter || findingParameter === evidenceParameter) &&
        (!evidenceTechnique || findingTechnique === evidenceTechnique)
      );
    });

    if (matches.length === 1) {
      const id = findingIds.get(getFindingKey(matches[0]));
      if (id) return [id];
    }
  }

  if (
    findingKey ||
    findingFingerprint ||
    evidenceFingerprint ||
    evidenceTitle ||
    evidenceDescription
  ) {
    return [];
  }

  if (item?.scannerId) {
    return findings
      .filter(
        (finding) =>
          normalizeFindingKey(finding.scannerId) ===
          normalizeFindingKey(item.scannerId),
      )
      .map((finding) => findingIds.get(getFindingKey(finding)))
      .filter(Boolean);
  }

  return [];
};

/*
 * Evidence normalization and persistence.
 */

const buildPersistedEvidence = ({
  item,
  findingId,
  scannerId,
  targetId,
}) => {
  const sourceRequest = isPlainObject(item?.request) ? item.request : null;
  const sourceResponse = isPlainObject(item?.response) ? item.response : null;

  const requestMethod = item?.method ?? sourceRequest?.method ?? null;

  const rawRequestUrl = item?.url ?? sourceRequest?.url ?? null;
  const requestUrl = redactUrl(rawRequestUrl);

  const requestHeaders = redactHeaders(
    item?.requestHeaders ??
      sourceRequest?.headers ??
      (item?.type === "request" ? item?.headers : null),
  );

  const requestBody = normalizeBody(
    item?.requestBody ?? sourceRequest?.body,
  );

  const requestParameters = normalizeParameters(
    item?.parameters ?? sourceRequest?.parameters,
  );

  const responseStatusCode =
    item?.statusCode ??
    sourceResponse?.statusCode ??
    sourceResponse?.status ??
    null;

  const responseHeaders = redactHeaders(
    item?.responseHeaders ??
      sourceResponse?.headers ??
      (item?.type === "response" || item?.type === "http_exchange"
        ? item?.headers
        : null),
  );

  const responseBody = normalizeBody(
    item?.responseBody ?? sourceResponse?.body ?? item?.bodyExcerpt,
  );

  const rawSummary = item?.summary ?? item?.description ?? null;

  const summary =
    typeof rawSummary === "string"
      ? redactText(rawSummary).slice(0, 5000)
      : null;

  const rawObservationDescription =
    item?.observation?.description ??
    (typeof item?.observation === "string" ? item.observation : null) ??
    item?.description ??
    summary ??
    null;

  const rawObservationExpected =
    item?.observation?.expected ?? item?.expected ?? null;

  const rawObservationActual =
    item?.observation?.actual ?? item?.actual ?? null;

  const effectiveMethod = requestMethod ?? sourceResponse?.method ?? null;

  const effectiveUrl = redactUrl(
    rawRequestUrl ?? sourceResponse?.url ?? null,
  );

  const effectiveHeaders =
    Object.keys(responseHeaders).length > 0
      ? responseHeaders
      : requestHeaders;

  const sourceMetadata = isPlainObject(item?.metadata)
    ? redactValue(item.metadata)
    : {};

  const metadata = {
    ...sourceMetadata,
    scannerId,
    targetId,

    ...(item?.parameter != null
      ? {
          parameter: redactText(String(item.parameter)).slice(0, 500),
        }
      : {}),

    ...(item?.payload != null
      ? {
          payload: redactText(String(item.payload)).slice(0, 2000),
        }
      : {}),

    ...(item?.confidence != null ? { confidence: item.confidence } : {}),
    ...(item?.cwe != null ? { cwe: item.cwe } : {}),
    ...(item?.owasp != null ? { owasp: item.owasp } : {}),
  };

  const validTypes = new Set([
    "request",
    "response",
    "http_exchange",
    "comparison",
    "header",
    "body",
    "dns",
    "certificate",
    "metadata",
  ]);

  const evidenceType = validTypes.has(item?.type)
    ? item.type
    : "http_exchange";

  return {
    ownerId: undefined,
    scanId: undefined,

    findingId: findingId ?? null,
    scannerId,
    type: evidenceType,

    request: {
      method: requestMethod,
      url: requestUrl,
      headers: requestHeaders,
      body: requestBody,
      parameters: requestParameters,
    },

    response: {
      statusCode: responseStatusCode,
      headers: responseHeaders,
      bodySnippet: responseBody,
      contentType: getContentType(responseHeaders),
      bodyLength: getBodyLength(
        sourceResponse?.body ?? item?.bodyExcerpt,
      ),
    },

    observation: {
      description:
        typeof rawObservationDescription === "string"
          ? redactText(rawObservationDescription).slice(0, 10_000)
          : null,

      expected:
        typeof rawObservationExpected === "string"
          ? redactText(rawObservationExpected).slice(0, 10_000)
          : null,

      actual:
        typeof rawObservationActual === "string"
          ? redactText(rawObservationActual).slice(0, 10_000)
          : null,
    },

    method: effectiveMethod,
    url: effectiveUrl,
    statusCode: responseStatusCode,
    headers: effectiveHeaders,

    bodyExcerpt: responseBody ?? requestBody,
    summary,
    fingerprint: item?.fingerprint ?? null,

    sensitiveDataRedacted: true,
    metadata,
  };
};

const persistEvidenceForFinding = async ({
  ownerId,
  scanId,
  targetId,
  scannerId,
  item,
  findingId = null,
  isGuest = false,
}) => {
  await assertWorkerCanContinue({ ownerId, scanId, isGuest });

  const evidence = buildPersistedEvidence({
    item,
    findingId,
    scannerId,
    targetId,
  });

  evidence.ownerId = ownerId;
  evidence.scanId = scanId;

  evidence.fingerprint = createEvidenceFingerprint({
    scannerId,

    findingFingerprint:
      item?.findingFingerprint ||
      item?.findingKey ||
      findingId ||
      item?.fingerprint ||
      null,

    requestMethod: evidence.request?.method ?? evidence.method ?? null,
    requestUrl: evidence.request?.url ?? evidence.url ?? null,
    responseStatus:
      evidence.response?.statusCode ?? evidence.statusCode ?? null,
    evidenceType: evidence.type,
    parameter: evidence.metadata?.parameter ?? null,
    observation:
      evidence.observation?.description ?? evidence.summary ?? null,
    expected: evidence.observation?.expected ?? null,
    actual: evidence.observation?.actual ?? null,
    requestParameters: evidence.request?.parameters ?? null,
    requestBody: evidence.request?.body ?? null,
    responseBodySnippet:
      evidence.response?.bodySnippet ?? evidence.bodyExcerpt ?? null,
    payload: evidence.metadata?.payload ?? null,
  });

  await assertWorkerCanContinue({ ownerId, scanId, isGuest });

  const persistedEvidence = await evidenceRepository.upsertByFingerprint({
    evidence,
  });

  if (persistedEvidence?._id && findingId) {
    await assertWorkerCanContinue({ ownerId, scanId, isGuest });

    await findingRepository.addEvidenceId(
      ownerId,
      findingId,
      persistedEvidence._id,
    );
  }

  return persistedEvidence;
};

/*
 * Persist scan results.
 */

const persistScanResults = async ({
  ownerId,
  scanId,
  targetId,
  results,
  isGuest = false,
}) => {
  const {
    findings = [],
    evidence = [],
    fingerprints = [],
    verificationRecords = [],
  } = results;

  await assertWorkerCanContinue({ ownerId, scanId, isGuest });

  const normalizedFindings = attachFindingFingerprints(findings);
  const orderedFindings = sortFindingsByRisk(normalizedFindings);

  logEvent("scan.results.persisting", {
    scanId,
    findingCount: orderedFindings.length,
    evidenceCount: evidence.length,
    fingerprintCount: fingerprints.length,
    verificationCount: verificationRecords.length,
  });

  const findingGroups = correlateFindings(orderedFindings);
  const findingIds = new Map();
  const persistedFindings = [];
  const persistedFindingFingerprints = new Set();

  for (const finding of orderedFindings) {
    await assertWorkerCanContinue({ ownerId, scanId, isGuest });

    const findingKey = getFindingKey(finding);
    const fingerprint = normalizeFindingKey(finding.fingerprint);

    if (!fingerprint) {
      throw new Error("Cannot persist a finding without a fingerprint.");
    }

    let persistedFindingId = findingIds.get(fingerprint);

    if (!persistedFindingId) {
      const existingFinding = await findingRepository.findByFingerprint(
        ownerId,
        scanId,
        fingerprint,
      );

      if (existingFinding?._id) {
        persistedFindingId = existingFinding._id.toString();

        if (!persistedFindingFingerprints.has(fingerprint)) {
          persistedFindings.push(existingFinding);
          persistedFindingFingerprints.add(fingerprint);
        }
      }
    }

    if (!persistedFindingId) {
      await assertWorkerCanContinue({ ownerId, scanId, isGuest });

      const safeFinding = redactValue(finding);

      const createdFinding = await findingRepository.create({
        ...safeFinding,
        ownerId,
        scanId,
        targetId,
      });

      if (!createdFinding?._id) {
        throw new Error(`Failed to persist finding: ${fingerprint}`);
      }

      persistedFindingId = createdFinding._id.toString();

      if (!persistedFindingFingerprints.has(fingerprint)) {
        persistedFindings.push(createdFinding);
        persistedFindingFingerprints.add(fingerprint);
      }
    }

    findingIds.set(fingerprint, persistedFindingId);

    if (findingKey) {
      findingIds.set(findingKey, persistedFindingId);
    }
  }

  let persistedEvidenceCount = 0;
  const persistedEvidence = [];

  for (const item of evidence) {
    await assertWorkerCanContinue({ ownerId, scanId, isGuest });

    const findingIdList = findMatchingFindingIds({
      item,
      findings: orderedFindings,
      findingIds,
    });

    const evidenceFindingIds =
      findingIdList.length > 0 ? findingIdList : [null];

    for (const findingId of evidenceFindingIds) {
      await assertWorkerCanContinue({ ownerId, scanId, isGuest });

      const evidenceDocument = await persistEvidenceForFinding({
        ownerId,
        scanId,
        targetId,
        scannerId: item?.scannerId ?? "unknown",
        item,
        findingId,
        isGuest,
      });

      if (evidenceDocument?._id) {
        persistedEvidenceCount += 1;
        persistedEvidence.push(evidenceDocument);
      }
    }
  }

  for (const fingerprint of fingerprints) {
    await assertWorkerCanContinue({ ownerId, scanId, isGuest });

    await fingerprintRepository.create({
      ...redactValue(fingerprint),
      ownerId,
      scanId,
      targetId,
    });
  }

  let persistedVerificationCount = 0;

  for (const verification of verificationRecords) {
    await assertWorkerCanContinue({ ownerId, scanId, isGuest });

    const findingId =
      verification.findingId ||
      findingIds.get(verification.findingFingerprint) ||
      null;

    if (!findingId) {
      continue;
    }

    await verificationRepository.create({
      ...redactValue(verification),
      ownerId,
      scanId,
      findingId,
    });

    persistedVerificationCount += 1;
  }

  return {
    findings: orderedFindings,
    persistedFindings,
    persistedEvidence,
    findingGroups,
    findingCount: orderedFindings.length,
    evidenceCount: persistedEvidenceCount,
    fingerprintCount: fingerprints.length,
    verificationCount: persistedVerificationCount,
  };
};

/*
 * Enterprise company-rule evaluation.
 */

const evaluateEnterpriseCompanyRules = async ({
  ownerId,
  isGuest,
  plan,
  companyRuleIds = [],
  scannerResults,
}) => {
  if (isGuest) {
    return {
      enabled: false,
      rulesEvaluated: 0,
      violatedRules: 0,
      findings: [],
      evaluations: [],
    };
  }

  const planDefinition = getPlan(plan ?? "free");

  if (
    planDefinition.integrations?.companyRules !== true ||
    !Array.isArray(companyRuleIds) ||
    companyRuleIds.length === 0
  ) {
    return {
      enabled: false,
      rulesEvaluated: 0,
      violatedRules: 0,
      findings: [],
      evaluations: [],
    };
  }

  const result = await evaluateCompanyRules({
    ownerId,
    companyRuleIds,
    scannerResults: scannerResults || [],
  });

  return {
    enabled: true,
    ...result,
  };
};

const buildDeletedScanResult = ({ scanId, ownerId, targetId }) => ({
  scanId,
  ownerId,
  targetId,
  status: "deleted",
});

/*
 * Crawl helpers.
 */

const runPublicCrawl = async ({
  ownerId,
  scanId,
  scanTarget,
  effectivePlanName,
  scopeSnapshot,
}) =>
  runCrawlAndPersist({
    ownerId,
    scanId,
    targetUrl: scanTarget.url,
    plan: effectivePlanName,
    headers: {},
    scopeSnapshot,
    browserContext: null,
  });

const closeAuthenticatedSession = async ({
  authenticatedSession,
  ownerId,
  scanId,
}) => {
  if (!authenticatedSession) {
    return;
  }

  try {
    await authenticatedSession.close();
  } catch {
    logFailure("scan.authenticated_session.cleanup_failed", {
      ownerId,
      scanId,
      errorCode: "AUTHENTICATED_SESSION_CLEANUP_FAILED",
    });
  }
};

/*
 * Main scan worker.
 */

const processScanJob = async (job) => {
  const {
    ownerId,
    scanId,
    targetId,
    target,
    selection,
    companyRuleIds = [],
    scopeSnapshot = null,
    options = {},
    credentialReference = null,
    isGuest = false,
  } = job.data;

  const startedAt = Date.now();

  let credentialsForScan = null;
  let authenticatedSession = null;
  let authenticatedHeaderResolver = null;
  let retainCredentialsForRetry = false;
  let scanExecutionStarted = false;

  let authenticationStatus = createAuthenticationStatus({
    status: credentialReference ? "pending" : "not_requested",
    message: credentialReference
      ? "Authentication has not yet been attempted."
      : "Authenticated scanning was not requested.",
  });

  recordScanStarted();

  try {
    await assertWorkerCanContinue({ ownerId, scanId, isGuest });

    const runningScan = await scanRepository.updateStatus(
      ownerId,
      scanId,
      "running",
      {
        startedAt: new Date(),
        errorCode: null,
        errorMessage: null,
        progress: 0,
      },
    );

    if (!runningScan) {
      const currentScan = await scanRepository.findAnyById(ownerId, scanId);

      if (currentScan?.status === "deleted") {
        return buildDeletedScanResult({ scanId, ownerId, targetId });
      }

      // Comparison retries must not rerun scanners or require credentials.
      if (currentScan?.status === "completed" && currentScan?.completedAt) {
        try {
          await createAndPersistComparisonForScan({
            ownerId,
            targetId,
            comparisonScanId: scanId,
          });
        } catch (comparisonError) {
          logFailure("scan.comparison.retry_failed", {
            ownerId,
            targetId,
            scanId,
            errorCode:
              comparisonError?.code ?? "SCAN_COMPARISON_FAILED",
          });

          throw createComparisonRetryError(comparisonError);
        }

        return {
          scanId,
          ownerId,
          targetId,
          status: "completed",
          comparisonRetry: true,
        };
      }

      throw createWorkerError(
        "The scan could not transition to running.",
        409,
        "SCAN_STATUS_TRANSITION_FAILED",
      );
    }

    scanExecutionStarted = true;

    const effectivePlan = await resolveWorkerPlan({ ownerId, isGuest });
    const effectivePlanName = effectivePlan.name;

    const credentialsWereProvided =
      runningScan.credentials?.credentialProvided === true;

    if (credentialsWereProvided && !credentialReference) {
      authenticationStatus = createAuthenticationStatus({
        status: "failed",
        message:
          "The temporary authentication reference is missing. The scan will continue without authenticated access.",
        errorCode: "SCAN_CREDENTIAL_REFERENCE_MISSING",
      });
    }

    /*
     * Credentials are loaded only from the encrypted, expiring vault.
     */

    if (credentialReference) {
      if (isGuest || effectivePlan.authenticationScanning !== true) {
        throw createWorkerError(
          "Authentication scanning is not available on the current plan.",
          403,
          "AUTHENTICATION_SCANNING_NOT_AVAILABLE",
        );
      }

      try {
        credentialsForScan = await getCredentials(credentialReference);

        if (!credentialsForScan) {
          authenticationStatus = createAuthenticationStatus({
            status: "failed",
            message:
              "Temporary authentication data is missing or expired. Public scanning will continue.",
            errorCode: "SCAN_CREDENTIALS_EXPIRED",
          });
        }
      } catch (error) {
        if (
          error?.code === "CREDENTIAL_ENCRYPTION_KEY_INVALID" ||
          error?.code === "AUTHENTICATION_SCANNING_NOT_AVAILABLE"
        ) {
          throw error;
        }

        authenticationStatus = createAuthenticationStatus({
          status: "failed",
          message:
            "Temporary authentication data could not be retrieved. Public scanning will continue.",
          errorCode: error?.code ?? "SCAN_CREDENTIALS_UNAVAILABLE",
        });

        logFailure("scan.credentials.resolve_failed", {
          ownerId,
          scanId,
          errorCode:
            error?.code ?? "SCAN_CREDENTIALS_UNAVAILABLE",
        });
      }
    }

    await notifyScanStarted({ ownerId, scanId }).catch(() => {});

    await assertWorkerCanContinue({ ownerId, scanId, isGuest });

    const storedTarget = await targetRepository.findById(ownerId, targetId);

    if (!storedTarget) {
      throw createWorkerError(
        "Scan target was not found.",
        404,
        "SCAN_TARGET_NOT_FOUND",
      );
    }

    const scanTarget = {
      id: targetId,
      url: target?.url || storedTarget.url,
      hostname: target?.hostname || storedTarget.hostname || null,
      normalizedUrl:
        target?.normalizedUrl || storedTarget.normalizedUrl || null,
    };

    const engineSelection = buildEngineSelection(selection);

    /*
     * Authentication setup is isolated from public scanning.
     */

    if (credentialsForScan) {
      try {
        await assertWorkerCanContinue({ ownerId, scanId, isGuest });

        authenticatedSession = await createAuthenticatedBrowserSession({
          targetUrl: scanTarget.url,
          credentials: credentialsForScan,
        });

        authenticatedHeaderResolver =
          createAuthenticatedHeaderResolver(authenticatedSession);

        authenticationStatus = createAuthenticationStatus({
          status: "session_established",
          message:
            "The browser session was established. Protected-page access has not yet been confirmed.",
          authenticatedCoverageConfirmed: false,
        });
      } catch (error) {
        if (
          isDeletedScanError(error) ||
          error?.code === "GUEST_SESSION_EXPIRED" ||
          isCancellationError(error)
        ) {
          throw error;
        }

        if (
          error?.code === "AUTHENTICATION_SCANNING_NOT_AVAILABLE" ||
          error?.code === "CREDENTIAL_ENCRYPTION_KEY_INVALID"
        ) {
          throw error;
        }

        authenticationStatus = createAuthenticationStatus({
          status: "failed",
          message: getAuthenticationFailureMessage(error),
          errorCode: error?.code ?? "AUTHENTICATION_FAILED",
        });

        logFailure("scan.authentication.setup_failed", {
          ownerId,
          scanId,
          errorCode: error?.code ?? "AUTHENTICATION_FAILED",
        });

        await closeAuthenticatedSession({
          authenticatedSession,
          ownerId,
          scanId,
        });

        authenticatedSession = null;
        authenticatedHeaderResolver = null;
      }
    }

    /*
     * Crawl with the authenticated browser context when available.
     * If that crawl throws, retry using a public-only crawl.
     */

    let crawlResult = null;

    await assertWorkerCanContinue({ ownerId, scanId, isGuest });

    try {
      crawlResult = await runCrawlAndPersist({
        ownerId,
        scanId,
        targetUrl: scanTarget.url,
        plan: effectivePlanName,
        headers: {},
        scopeSnapshot,
        browserContext: authenticatedSession?.context ?? null,
      });
    } catch (error) {
      if (isDeletedScanError(error)) {
        return buildDeletedScanResult({ scanId, ownerId, targetId });
      }

      if (
        error?.code === "GUEST_SESSION_EXPIRED" ||
        isCancellationError(error)
      ) {
        throw error;
      }

      if (!authenticatedSession) {
        logFailure("scan.crawl.failed", {
          ownerId,
          scanId,
          errorCode: error?.code ?? "CRAWL_FAILED",
        });
      } else {
        authenticationStatus = createAuthenticationStatus({
          status: "failed",
          message:
            "Authenticated crawling failed. The scan will retry crawling publicly accessible pages.",
          errorCode: "AUTHENTICATED_CRAWL_FAILED",
        });

        logFailure("scan.authenticated_crawl.failed", {
          ownerId,
          scanId,
          errorCode: error?.code ?? "AUTHENTICATED_CRAWL_FAILED",
        });

        await closeAuthenticatedSession({
          authenticatedSession,
          ownerId,
          scanId,
        });

        authenticatedSession = null;
        authenticatedHeaderResolver = null;

        await assertWorkerCanContinue({ ownerId, scanId, isGuest });

        try {
          crawlResult = await runPublicCrawl({
            ownerId,
            scanId,
            scanTarget,
            effectivePlanName,
            scopeSnapshot,
          });
        } catch (publicCrawlError) {
          if (isDeletedScanError(publicCrawlError)) {
            return buildDeletedScanResult({ scanId, ownerId, targetId });
          }

          if (
            publicCrawlError?.code === "GUEST_SESSION_EXPIRED" ||
            isCancellationError(publicCrawlError)
          ) {
            throw publicCrawlError;
          }

          logFailure("scan.public_fallback_crawl.failed", {
            ownerId,
            scanId,
            errorCode: publicCrawlError?.code ?? "CRAWL_FAILED",
          });
        }
      }
    }

    await assertWorkerCanContinue({ ownerId, scanId, isGuest });

    /*
     * Session creation is not proof of authenticated coverage.
     * Only an explicit crawler confirmation can establish that status.
     */

    if (
      authenticationStatus.status === "session_established" &&
      crawlResult?.authenticatedCoverageConfirmed === true
    ) {
      authenticationStatus = createAuthenticationStatus({
        status: "authenticated",
        message:
          "The crawler confirmed access to authenticated content.",
        authenticatedCoverageConfirmed: true,
      });
    }

    /*
     * The engine and shared HTTP layer must honor authenticatedRequest.
     * The resolver returns cookies only for the exact authenticated origin.
     */

    const result = await executeScan({
      scan: {
        id: scanId,
        ownerId,
        targetId,
      },

      target: scanTarget,
      selection: engineSelection,
      ownerId,

      options,
      scopeSnapshot,

      authenticatedSession,

      authenticatedRequest: authenticatedSession
        ? {
            authOrigin: authenticatedSession.targetOrigin,
            resolveHeaders: authenticatedHeaderResolver,
          }
        : null,

      discoveredUrls: (crawlResult?.pages ?? [])
        .filter((page) => page?.status === "success")
        .map((page) => page.url)
        .filter((url) => {
          try {
            return new URL(url).searchParams.size > 0;
          } catch {
            return false;
          }
        }),
    });

    logEvent("scan.progress.diagnostic", {
      scanId,
      selectedScannerIds: engineSelection.selectedScannerIds,
      engineProgress: result.progress ?? null,
      scannerResultIds: (result.scannerResults ?? []).map(
        (scannerResult) => scannerResult.scannerId,
      ),
    });

    await assertWorkerCanContinue({ ownerId, scanId, isGuest });

    const companyRuleAnalysis = await evaluateEnterpriseCompanyRules({
      ownerId,
      isGuest,
      plan: effectivePlanName,
      companyRuleIds,
      scannerResults: result.scannerResults || [],
    });

    await assertWorkerCanContinue({ ownerId, scanId, isGuest });

    if (companyRuleAnalysis.findings?.length > 0) {
      result.findings = [
        ...(result.findings || []),
        ...companyRuleAnalysis.findings,
      ];
    }

    logEvent("scan.company_rules.completed", {
      scanId,
      ownerId,
      plan: effectivePlanName,
      companyRuleCount: companyRuleIds.length,
      enabled: companyRuleAnalysis.enabled,
      rulesEvaluated: companyRuleAnalysis.rulesEvaluated,
      violatedRules: companyRuleAnalysis.violatedRules,
    });

    const analyzedFindings = attachFindingFingerprints(
      result.findings || [],
    );

    const risk = calculateRisk(analyzedFindings);

    await assertWorkerCanContinue({ ownerId, scanId, isGuest });

    const persisted = await persistScanResults({
      ownerId,
      scanId,
      targetId,
      results: {
        ...result,
        findings: analyzedFindings,
      },
      isGuest,
    });

    await assertWorkerCanContinue({ ownerId, scanId, isGuest });

    /*
     * AI-analysis failure does not fail the security scan.
     */

    let aiAnalysis = {
      enabled: false,
      status: "disabled",
      analyses: [],
      persisted: [],
    };

    try {
      await assertWorkerCanContinue({ ownerId, scanId, isGuest });

      aiAnalysis = await analyzeAndPersistFindings({
        ownerId,
        scanId,
        findings: persisted.persistedFindings,
        evidence: persisted.persistedEvidence,
        target: scanTarget,
      });

      await assertWorkerCanContinue({ ownerId, scanId, isGuest });
    } catch (error) {
      if (
        isDeletedScanError(error) ||
        error?.code === "GUEST_SESSION_EXPIRED" ||
        isCancellationError(error)
      ) {
        throw error;
      }

      logFailure("scan.ai_analysis.failed", {
        scanId,
        ownerId,
        errorCode: error?.code ?? "AI_ANALYSIS_FAILED",
      });

      aiAnalysis = {
        enabled: environment.ai.enabled,
        status: "failed",
        analyses: [],
        persisted: [],
      };
    }

    await assertWorkerCanContinue({ ownerId, scanId, isGuest });

    const finishedAt = new Date();
    const durationMs = Date.now() - startedAt;

    const finalStatus =
      result.status === "cancelled"
        ? "cancelled"
        : result.status === "failed"
          ? "failed"
          : "completed";

    const severityCounts = risk.severityCounts || {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      info: 0,
    };

    const findingCounts = {
      critical: severityCounts.critical || 0,
      high: severityCounts.high || 0,
      medium: severityCounts.medium || 0,
      low: severityCounts.low || 0,
      info: severityCounts.info || 0,
    };

    const statusFields = {
      progress:
        finalStatus === "completed"
          ? 100
          : (result.progress?.progress ?? 0),

      completedScanners: result.progress?.completed ?? 0,

      totalScanners:
        result.progress?.total ??
        engineSelection.selectedScannerIds.length,

      findingCounts,
      riskScore: risk.score,

      errorCode:
        finalStatus === "failed"
          ? (result.errorCode ?? "SCAN_EXECUTION_FAILED")
          : null,

      errorMessage:
        finalStatus === "failed"
          ? "One or more scan operations failed."
          : null,

      authenticationStatus: redactValue(authenticationStatus),

      companyRuleAnalysis: {
        enabled: companyRuleAnalysis.enabled,
        rulesEvaluated: companyRuleAnalysis.rulesEvaluated,
        violatedRules: companyRuleAnalysis.violatedRules,

        evaluations: (companyRuleAnalysis.evaluations || []).map(
          (evaluation) => ({
            ...redactValue(evaluation),
            status: evaluation.error
              ? "error"
              : !evaluation.supported
                ? "unsupported"
                : evaluation.violated
                  ? "violated"
                  : "passed",
          }),
        ),
      },

      // Preserve scanner outcomes so unrun scanners cannot resolve findings.
      scannerOutcomes: buildScannerOutcomes({
        selection: engineSelection,
        scannerResults: result.scannerResults || [],
      }),
    };

    if (finalStatus === "cancelled") {
      statusFields.cancelledAt = finishedAt;
    } else if (finalStatus === "failed") {
      statusFields.failedAt = finishedAt;
    } else {
      statusFields.completedAt = finishedAt;
    }

    await assertScanCanFinish({ ownerId, scanId });

    logEvent("scan.progress.before_persist", {
      scanId,
      progress: statusFields.progress,
      completedScanners: statusFields.completedScanners,
      totalScanners: statusFields.totalScanners,
    });

    const finalizedScan = await scanRepository.updateStatus(
      ownerId,
      scanId,
      finalStatus,
      statusFields
    );

    logEvent("scan.progress.after_persist", {
      scanId,
      progress: finalizedScan?.progress ?? null,
      completedScanners: finalizedScan?.completedScanners ?? null,
      totalScanners: finalizedScan?.totalScanners ?? null,
    });

    if (!finalizedScan) {
      const currentScan = await scanRepository.findAnyById(ownerId, scanId);

      if (currentScan?.status === "deleted") {
        return buildDeletedScanResult({ scanId, ownerId, targetId });
      }

      throw createWorkerError(
        "The scan could not be finalized because its status changed.",
        409,
        "SCAN_STATUS_TRANSITION_FAILED",
      );
    }

    if (finalStatus === "completed") {
      await targetRepository.incrementScanCount(ownerId, targetId);
      await targetRepository.updateLastScanned(ownerId, targetId, finishedAt);

      recordScanCompleted({
        durationMs,
        findingCount: persisted.findingCount,
      });

      await notifyScanCompleted({
        ownerId,
        scanId,
        riskScore: risk.score,
      }).catch(() => {});

      /*
       * Comparison retries must not rerun the scanner execution.
       */

      try {
        await createAndPersistComparisonForScan({
          ownerId,
          targetId,
          comparisonScanId: scanId,
        });
      } catch (comparisonError) {
        logFailure("scan.comparison.failed", {
          ownerId,
          targetId,
          scanId,
          errorCode:
            comparisonError?.code ?? "SCAN_COMPARISON_FAILED",
        });

        throw createComparisonRetryError(comparisonError);
      }
    } else if (finalStatus === "cancelled") {
      recordScanCancelled();
    } else {
      recordScanFailed();

      await notifyScanFailed({
        ownerId,
        scanId,
        error: "Scan execution failed.",
      }).catch(() => {});
    }

    return {
      scanId,
      ownerId,
      targetId,
      status: finalStatus,
      risk,
      findings: persisted.findingCount,
      findingGroups: persisted.findingGroups.length,
      evidence: persisted.evidenceCount,
      fingerprints: persisted.fingerprintCount,
      verifications: persisted.verificationCount,

      authenticationStatus: redactValue(authenticationStatus),

      companyRules: {
        enabled: companyRuleAnalysis.enabled,
        selected: companyRuleIds.length,
        rulesEvaluated: companyRuleAnalysis.rulesEvaluated,
        violatedRules: companyRuleAnalysis.violatedRules,
      },

      aiAnalysis: {
        enabled: aiAnalysis.enabled,
        status: aiAnalysis.status,
        persisted: aiAnalysis.persisted?.length ?? 0,
      },
    };
  } catch (error) {
    // A comparison-only retry must not turn a completed scan into a failure.
    if (error?.scanComparisonRetry === true) {
      retainCredentialsForRetry = false;
      throw error;
    }

    if (isDeletedScanError(error)) {
      return buildDeletedScanResult({ scanId, ownerId, targetId });
    }

    const currentScan = await scanRepository
      .findAnyById(ownerId, scanId)
      .catch(() => null);

    if (currentScan?.status === "deleted") {
      return buildDeletedScanResult({ scanId, ownerId, targetId });
    }

    if (
      currentScan?.status === "cancelled" ||
      currentScan?.status === "completed"
    ) {
      return {
        scanId,
        ownerId,
        targetId,
        status: currentScan.status,
      };
    }

    const errorCode = error?.code || "SCAN_EXECUTION_FAILED";

    if (errorCode === "GUEST_SESSION_EXPIRED") {
      return {
        scanId,
        ownerId,
        targetId,
        status: "expired",
        errorCode,
      };
    }

    const authenticationFailure = isAuthenticationError(error);

    const safeErrorMessage = authenticationFailure
      ? getAuthenticationFailureMessage(error)
      : TERMINAL_SCAN_ERROR_CODES.has(errorCode)
        ? redactText(error.message || "Scan execution failed.")
        : "Scan execution failed. Review the scan status and retry if appropriate.";

    const configuredAttempts = Math.max(
      1,
      Number(job.opts?.attempts) || 1,
    );

    const nextAttemptNumber = Number(job.attemptsMade ?? 0) + 1;

    const retryExpected =
      nextAttemptNumber < configuredAttempts &&
      !TERMINAL_SCAN_ERROR_CODES.has(errorCode);

    if (retryExpected) {
      let retryScan = null;

      if (currentScan?.status === "running") {
        retryScan = await scanRepository
          .updateStatus(ownerId, scanId, "pending", {
            errorCode: null,
            errorMessage: null,
            progress: 0,
          })
          .catch(() => null);
      }

      if (retryScan || currentScan?.status === "pending") {
        retainCredentialsForRetry = Boolean(credentialReference);

        logEvent("scan.worker.retry_scheduled", {
          ownerId,
          scanId,
          errorCode,
          nextAttemptNumber,
          configuredAttempts,
        });

        throw error;
      }

      const latestScan = await scanRepository
        .findAnyById(ownerId, scanId)
        .catch(() => null);

      if (latestScan?.status === "deleted") {
        return buildDeletedScanResult({ scanId, ownerId, targetId });
      }

      if (
        latestScan?.status === "cancelled" ||
        latestScan?.status === "completed"
      ) {
        return {
          scanId,
          ownerId,
          targetId,
          status: latestScan.status,
        };
      }

      logFailure("scan.worker.retry_transition_failed", {
        ownerId,
        scanId,
        errorCode,
        status: latestScan?.status ?? "unknown",
      });
    }

    const failedScan = await scanRepository
      .updateStatus(ownerId, scanId, "failed", {
        failedAt: new Date(),
        errorCode,
        errorMessage: safeErrorMessage,

        ...(credentialReference
          ? {
              authenticationStatus: redactValue(
                createAuthenticationStatus({
                  status: "failed",
                  message: safeErrorMessage,
                  errorCode,
                }),
              ),
            }
          : {}),
      })
      .catch(() => null);

    if (!failedScan) {
      const latestScan = await scanRepository
        .findAnyById(ownerId, scanId)
        .catch(() => null);

      if (latestScan?.status === "deleted") {
        return buildDeletedScanResult({ scanId, ownerId, targetId });
      }

      if (
        latestScan?.status === "cancelled" ||
        latestScan?.status === "completed"
      ) {
        return {
          scanId,
          ownerId,
          targetId,
          status: latestScan.status,
        };
      }
    }

    if (scanExecutionStarted) {
      recordScanFailed();
    }

    await notifyScanFailed({
      ownerId,
      scanId,
      error: safeErrorMessage,
    }).catch(() => {});

    logFailure("scan.worker.failed", {
      ownerId,
      scanId,
      errorCode,
      retryExpected: false,
    });

    if (TERMINAL_SCAN_ERROR_CODES.has(errorCode)) {
      throw new UnrecoverableError(safeErrorMessage);
    }

    throw error;
  } finally {
    await closeAuthenticatedSession({
      authenticatedSession,
      ownerId,
      scanId,
    });

    authenticatedSession = null;
    authenticatedHeaderResolver = null;

    // Release this worker's plaintext credential reference.
    credentialsForScan = null;

    /*
     * The encrypted vault entry is retained only if another BullMQ attempt
     * is expected. Its configured TTL must still impose a maximum lifetime.
     */
    if (credentialReference && !retainCredentialsForRetry) {
      try {
        await deleteCredentials(credentialReference);
      } catch {
        logFailure("scan.worker.credential_cleanup_failed", {
          ownerId,
          scanId,
          errorCode: "SCAN_CREDENTIAL_CLEANUP_FAILED",
        });
      }
    }
  }
};

/*
 * Worker factory.
 */

const createScanWorker = () =>
  new Worker(environment.queue.scanName, processScanJob, {
    connection: redisConnection,
    concurrency: environment.queue.scanConcurrency,
  });

export {
  SCAN_JOB_NAME,
  enqueueScanJob,
  processScanJob,
  createScanWorker,
};
