// STATUS: UPDATED
// File: src/jobs/scan.job.js

import { Worker } from "bullmq";

import environment from "../config/environment.js";

import { redisConnection, scanQueue } from "../config/queue.js";

import { executeScan } from "../engine/scanEngine.js";

import {
  attachFindingFingerprints,
  correlateFindings,
  createEvidenceFingerprint,
} from "../analysis/fingerprint/fingerprint.js";

import { calculateRisk, sortFindingsByRisk } from "../analysis/risk/risk.js";

import { evaluateCompanyRules } from "../analysis/companyRules/companyRuleEvaluator.js";

import { getPlan } from "../access/plan.service.js";

import * as scanRepository from "../database/repositories/scan.repository.js";

import * as targetRepository from "../database/repositories/target.repository.js";

import * as findingRepository from "../database/repositories/finding.repository.js";

import * as evidenceRepository from "../database/repositories/evidence.repository.js";

import * as fingerprintRepository from "../database/repositories/fingerprint.repository.js";

import * as verificationRepository from "../database/repositories/verification.repository.js";

import * as guestSessionRepository from "../database/repositories/guestSession.repository.js";

import { analyzeAndPersistFindings } from "../services/aiAnalysis.service.js";

import { createAndPersistComparisonForScan } from "../services/scanComparison.service.js";

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

const sanitizeCredentials = () => null;

const createGuestSessionExpiredError = () => {
  const error = new Error("The guest session has expired.");

  error.code = "GUEST_SESSION_EXPIRED";
  error.statusCode = 410;

  return error;
};

const createComparisonRetryError = (cause) => {
  const error = new Error(
    "Automatic scan comparison failed and must be retried.",
    { cause },
  );

  error.code = cause?.code ?? "SCAN_COMPARISON_FAILED";

  error.scanComparisonRetry = true;

  return error;
};

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

/*
 * A worker must not start or continue processing a deleted scan.
 *
 * This check is intentionally repeated around long-running stages.
 * Repository writes must also reject deleted scans to handle races
 * between a guard check and the subsequent write.
 */
const assertWorkerCanContinue = async ({
  ownerId,
  scanId,
  isGuest = false,
}) => {
  await assertGuestSessionActive({
    ownerId,
    isGuest,
  });

  await assertScanWritable({
    ownerId,
    scanId,
  });
};

const buildEngineSelection = (selection) => {
  const normalizedSelection = normalizeSelection(selection);

  const selectedScannerIds = getSelectedScannerIds(normalizedSelection);

  if (selectedScannerIds.length === 0) {
    const error = new Error(
      "Scan selection is mandatory. At least one scanner must be selected.",
    );

    error.code = "NO_SCANNERS_SELECTED";

    throw error;
  }

  return {
    mode: "selected",

    recon: [...normalizedSelection.recon],

    security: [...normalizedSelection.security],

    selectedScannerIds,
  };
};

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
  if (!ownerId) {
    throw new Error("ownerId is required to enqueue a scan job.");
  }

  if (!scanId) {
    throw new Error("scanId is required to enqueue a scan job.");
  }

  if (!targetId) {
    throw new Error("targetId is required to enqueue a scan job.");
  }

  if (!target?.url) {
    throw new Error("target.url is required to enqueue a scan job.");
  }

  if (!selection) {
    throw new Error("scan selection is required to enqueue a scan job.");
  }

  const engineSelection = buildEngineSelection(selection);

  const normalizedCompanyRuleIds = normalizeCompanyRuleIds(companyRuleIds);

  /*
   * Missing plan values default to Free.
   * Guest scans always use Free.
   */
  const normalizedPlan = getPlan(isGuest ? "free" : plan).name;

  if (isGuest && normalizedCompanyRuleIds.length > 0) {
    const error = new Error(
      "Company security rules are available only on the Enterprise plan.",
    );

    error.code = "FEATURE_NOT_AVAILABLE";
    error.statusCode = 403;

    throw error;
  }

  if (normalizedCompanyRuleIds.length > 0 && normalizedPlan !== "enterprise") {
    const error = new Error(
      "Company security rules are available only on the Enterprise plan.",
    );

    error.code = "FEATURE_NOT_AVAILABLE";
    error.statusCode = 403;

    throw error;
  }

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

      // Immutable saved-scope snapshot captured when the scan was created.
      scopeSnapshot: scopeSnapshot
        ? {
            ...scopeSnapshot,
            scopeId: String(scopeSnapshot.scopeId),
          }
        : null,

      options,
      credentialReference,
      isGuest: Boolean(isGuest),
      plan: normalizedPlan,
    },
    {
      jobId: `scan:${scanId}`,
    },
  );
};

const normalizeFindingKey = (value) => {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();

  return normalized.length > 0 ? normalized : null;
};

const getFindingKey = (finding) =>
  normalizeFindingKey(finding?.fingerprint) ??
  normalizeFindingKey(`${finding?.scannerId ?? ""}:${finding?.title ?? ""}`);

const extractFindingTitleFromKey = (findingKey) => {
  const normalizedKey = normalizeFindingKey(findingKey);

  if (!normalizedKey) {
    return null;
  }

  const separatorIndex = normalizedKey.lastIndexOf(":");

  if (separatorIndex === -1) {
    return null;
  }

  const title = normalizedKey.slice(separatorIndex + 1).trim();

  return title.length > 0 ? title : null;
};

const resolveFindingId = ({ item, findingIds }) => {
  if (item?.findingId) {
    return item.findingId;
  }

  const findingFingerprint = normalizeFindingKey(item?.findingFingerprint);

  if (findingFingerprint) {
    const findingId = findingIds.get(findingFingerprint);

    if (findingId) {
      return findingId;
    }
  }

  const findingKey = normalizeFindingKey(item?.findingKey);

  if (findingKey) {
    const findingId = findingIds.get(findingKey);

    if (findingId) {
      return findingId;
    }
  }

  const evidenceFingerprint = normalizeFindingKey(item?.fingerprint);

  if (evidenceFingerprint) {
    const findingId = findingIds.get(evidenceFingerprint);

    if (findingId) {
      return findingId;
    }
  }

  return null;
};

const findMatchingFindingIds = ({ item, findings, findingIds }) => {
  const explicitFindingId = resolveFindingId({
    item,
    findingIds,
  });

  if (explicitFindingId) {
    return [explicitFindingId];
  }

  const findingKey = normalizeFindingKey(item?.findingKey);

  const findingFingerprint = normalizeFindingKey(item?.findingFingerprint);

  const evidenceFingerprint = normalizeFindingKey(item?.fingerprint);

  const evidenceTitle =
    normalizeFindingKey(item?.title) ?? extractFindingTitleFromKey(findingKey);

  const evidenceDescription = normalizeFindingKey(item?.description);

  if (findingFingerprint) {
    const fingerprintMatches = findings.filter(
      (finding) =>
        normalizeFindingKey(finding.fingerprint) === findingFingerprint,
    );

    if (fingerprintMatches.length > 0) {
      return fingerprintMatches
        .map((finding) => findingIds.get(getFindingKey(finding)))
        .filter(Boolean);
    }
  }

  if (evidenceTitle) {
    const titleMatches = findings.filter(
      (finding) => normalizeFindingKey(finding.title) === evidenceTitle,
    );

    if (titleMatches.length === 1) {
      const findingId = findingIds.get(getFindingKey(titleMatches[0]));

      if (findingId) {
        return [findingId];
      }
    }

    if (titleMatches.length > 1 && item?.scannerId) {
      const scannerTitleMatches = titleMatches.filter(
        (finding) => finding.scannerId === item.scannerId,
      );

      if (scannerTitleMatches.length === 1) {
        const findingId = findingIds.get(getFindingKey(scannerTitleMatches[0]));

        if (findingId) {
          return [findingId];
        }
      }
    }
  }

  if (evidenceFingerprint) {
    const fingerprintMatches = findings.filter(
      (finding) =>
        normalizeFindingKey(finding.fingerprint) === evidenceFingerprint,
    );

    if (fingerprintMatches.length > 0) {
      return fingerprintMatches
        .map((finding) => findingIds.get(getFindingKey(finding)))
        .filter(Boolean);
    }
  }

  if (evidenceDescription) {
    const descriptionMatches = findings.filter(
      (finding) =>
        normalizeFindingKey(finding.description) === evidenceDescription,
    );

    if (descriptionMatches.length === 1) {
      const findingId = findingIds.get(getFindingKey(descriptionMatches[0]));

      if (findingId) {
        return [findingId];
      }
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
    const scannerFindings = findings.filter(
      (finding) => finding.scannerId === item.scannerId,
    );

    return scannerFindings
      .map((finding) => findingIds.get(getFindingKey(finding)))
      .filter(Boolean);
  }

  return [];
};

const getFindingIdsForEvidence = ({ item, findings, findingIds }) =>
  findMatchingFindingIds({
    item,
    findings,
    findingIds,
  });

const normalizeHeaders = (headers) => {
  if (!headers || typeof headers !== "object" || Array.isArray(headers)) {
    return {};
  }

  return headers;
};

const normalizeBody = (body) => {
  if (body === undefined || body === null) {
    return null;
  }

  if (typeof body === "string") {
    return body.slice(0, 20_000);
  }

  try {
    return JSON.stringify(body).slice(0, 20_000);
  } catch {
    return String(body).slice(0, 20_000);
  }
};

const normalizeParameters = (parameters) => {
  if (
    !parameters ||
    typeof parameters !== "object" ||
    Array.isArray(parameters)
  ) {
    return {};
  }

  return parameters;
};

const getContentType = (headers) => {
  if (!headers || typeof headers !== "object") {
    return null;
  }

  const contentType =
    headers["content-type"] ?? headers["Content-Type"] ?? null;

  return typeof contentType === "string" ? contentType.slice(0, 512) : null;
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

const buildPersistedEvidence = ({ item, findingId, scannerId, targetId }) => {
  const sourceRequest =
    item?.request &&
    typeof item.request === "object" &&
    !Array.isArray(item.request)
      ? item.request
      : null;

  const sourceResponse =
    item?.response &&
    typeof item.response === "object" &&
    !Array.isArray(item.response)
      ? item.response
      : null;

  const requestMethod = item?.method ?? sourceRequest?.method ?? null;

  const requestUrl = item?.url ?? sourceRequest?.url ?? null;

  const requestHeaders = normalizeHeaders(
    item?.requestHeaders ??
      sourceRequest?.headers ??
      (item?.type === "request" ? item?.headers : null),
  );

  const requestBody = normalizeBody(item?.requestBody ?? sourceRequest?.body);

  const requestParameters = normalizeParameters(
    item?.parameters ?? sourceRequest?.parameters,
  );

  const responseStatusCode =
    item?.statusCode ??
    sourceResponse?.statusCode ??
    sourceResponse?.status ??
    null;

  const responseHeaders = normalizeHeaders(
    item?.responseHeaders ??
      sourceResponse?.headers ??
      (item?.type === "response" || item?.type === "http_exchange"
        ? item?.headers
        : null),
  );

  const responseBody = normalizeBody(
    item?.responseBody ?? sourceResponse?.body ?? item?.bodyExcerpt,
  );

  const summary = item?.summary ?? item?.description ?? null;

  const observationDescription =
    item?.observation?.description ??
    (typeof item?.observation === "string" ? item.observation : null) ??
    item?.description ??
    summary ??
    null;

  const observationExpected =
    item?.observation?.expected ?? item?.expected ?? null;

  const observationActual = item?.observation?.actual ?? item?.actual ?? null;

  const effectiveMethod = requestMethod ?? sourceResponse?.method ?? null;

  const effectiveUrl = requestUrl ?? sourceResponse?.url ?? null;

  const effectiveHeaders =
    Object.keys(responseHeaders).length > 0 ? responseHeaders : requestHeaders;

  const metadata = {
    ...(item?.metadata &&
    typeof item.metadata === "object" &&
    !Array.isArray(item.metadata)
      ? item.metadata
      : {}),

    scannerId,
    targetId,

    ...(item?.parameter != null ? { parameter: item.parameter } : {}),

    ...(item?.payload != null ? { payload: item.payload } : {}),

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

  const evidenceType = validTypes.has(item?.type) ? item.type : "http_exchange";

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
      bodyLength: getBodyLength(sourceResponse?.body ?? item?.bodyExcerpt),
    },

    observation: {
      description:
        typeof observationDescription === "string"
          ? observationDescription.slice(0, 10_000)
          : observationDescription,

      expected:
        typeof observationExpected === "string"
          ? observationExpected.slice(0, 10_000)
          : observationExpected,

      actual:
        typeof observationActual === "string"
          ? observationActual.slice(0, 10_000)
          : observationActual,
    },

    method: effectiveMethod,
    url: effectiveUrl,
    statusCode: responseStatusCode,
    headers: effectiveHeaders,

    bodyExcerpt: responseBody ?? requestBody,

    summary: typeof summary === "string" ? summary.slice(0, 5_000) : summary,

    fingerprint: item?.fingerprint ?? null,

    sensitiveDataRedacted: item?.sensitiveDataRedacted ?? true,

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
  await assertWorkerCanContinue({
    ownerId,
    scanId,
    isGuest,
  });

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

    parameter: evidence.metadata?.parameter ?? item?.parameter ?? null,

    observation: evidence.observation?.description ?? evidence.summary ?? null,

    expected: evidence.observation?.expected ?? null,

    actual: evidence.observation?.actual ?? null,

    requestParameters: evidence.request?.parameters ?? null,

    requestBody: evidence.request?.body ?? null,

    responseBodySnippet:
      evidence.response?.bodySnippet ?? evidence.bodyExcerpt ?? null,

    payload: evidence.metadata?.payload ?? null,
  });

  await assertWorkerCanContinue({
    ownerId,
    scanId,
    isGuest,
  });

  const persistedEvidence = await evidenceRepository.upsertByFingerprint({
    evidence,
  });

  if (persistedEvidence?._id && findingId) {
    await assertWorkerCanContinue({
      ownerId,
      scanId,
      isGuest,
    });

    await findingRepository.addEvidenceId(
      ownerId,
      findingId,
      persistedEvidence._id,
    );
  }

  return persistedEvidence;
};

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

  await assertWorkerCanContinue({
    ownerId,
    scanId,
    isGuest,
  });

  const normalizedFindings = attachFindingFingerprints(findings);

  const orderedFindings = sortFindingsByRisk(normalizedFindings);

  console.info(
    JSON.stringify({
      event: "scan.evidence.debug",
      scanId,
      evidenceCount: evidence.length,
      findingCount: orderedFindings.length,

      evidenceItems: evidence.map((item) => ({
        scannerId: item?.scannerId ?? null,
        type: item?.type ?? null,
        findingId: item?.findingId ?? null,
        findingFingerprint: item?.findingFingerprint ?? null,
        findingKey: item?.findingKey ?? null,
        fingerprint: item?.fingerprint ?? null,
      })),
    }),
  );

  const findingGroups = correlateFindings(orderedFindings);

  const findingIds = new Map();
  const persistedFindings = [];
  const persistedFindingFingerprints = new Set();

  for (const finding of orderedFindings) {
    await assertWorkerCanContinue({
      ownerId,
      scanId,
      isGuest,
    });

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
      await assertWorkerCanContinue({
        ownerId,
        scanId,
        isGuest,
      });

      const createdFinding = await findingRepository.create({
        ...finding,
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
    await assertWorkerCanContinue({
      ownerId,
      scanId,
      isGuest,
    });

    const findingIdList = getFindingIdsForEvidence({
      item,
      findings: orderedFindings,
      findingIds,
    });

    /*
     * Evidence can be valid even if it does not
     * match a vulnerability finding.
     */
    const evidenceFindingIds =
      findingIdList.length > 0 ? findingIdList : [null];

    for (const findingId of evidenceFindingIds) {
      await assertWorkerCanContinue({
        ownerId,
        scanId,
        isGuest,
      });

      const evidenceDocument = await persistEvidenceForFinding({
        ownerId,
        scanId,
        targetId,
        scannerId: item.scannerId,
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
    await assertWorkerCanContinue({
      ownerId,
      scanId,
      isGuest,
    });

    await fingerprintRepository.create({
      ...fingerprint,
      ownerId,
      scanId,
      targetId,
    });
  }

  let persistedVerificationCount = 0;

  for (const verification of verificationRecords) {
    await assertWorkerCanContinue({
      ownerId,
      scanId,
      isGuest,
    });

    const findingId =
      verification.findingId ||
      findingIds.get(verification.findingFingerprint) ||
      null;

    if (!findingId) {
      continue;
    }

    await verificationRepository.create({
      ...verification,
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

  const enabled = Boolean(planDefinition?.integrations?.companyRules);

  if (
    !enabled ||
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
    isGuest = false,
    plan = "free",
  } = job.data;

  const startedAt = Date.now();

  recordScanStarted();

  try {
    /*
     * Check before changing status. A job left in Redis after
     * deletion must not transition the scan back to running.
     */
    await assertWorkerCanContinue({
      ownerId,
      scanId,
      isGuest,
    });

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
        return buildDeletedScanResult({
          scanId,
          ownerId,
          targetId,
        });
      }

      /*
       * Retry comparison persistence when a previous attempt
       * completed the scan but failed to save the comparison.
       *
       * Do not rerun scanners or change the completed status.
       */
      if (currentScan?.status === "completed" && currentScan?.completedAt) {
        try {
          await createAndPersistComparisonForScan({
            ownerId,
            targetId,
            comparisonScanId: scanId,
          });
        } catch (comparisonError) {
          console.error(
            JSON.stringify({
              event: "scan.comparison.retry_failed",
              ownerId,
              targetId,
              scanId,
              errorCode: comparisonError?.code ?? "SCAN_COMPARISON_FAILED",
              errorMessage:
                comparisonError?.message ??
                "Automatic comparison retry failed.",
            }),
          );

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

      const error = new Error("The scan could not transition to running.");

      error.code = "SCAN_STATUS_TRANSITION_FAILED";

      throw error;
    }

    await notifyScanStarted({
      ownerId,
      scanId,
    }).catch(() => {});

    await assertWorkerCanContinue({
      ownerId,
      scanId,
      isGuest,
    });

    const storedTarget = await targetRepository.findById(ownerId, targetId);

    if (!storedTarget) {
      const error = new Error("Scan target was not found.");

      error.code = "SCAN_TARGET_NOT_FOUND";

      throw error;
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
     * Crawl results are stored separately. If crawling fails,
     * selected security scanners may still run.
     */
    let crawlResult = null;

    await assertWorkerCanContinue({
      ownerId,
      scanId,
      isGuest,
    });

    try {
      crawlResult = await runCrawlAndPersist({
        ownerId,
        scanId,
        targetUrl: scanTarget.url,
        plan: isGuest ? "free" : plan,
        headers: {},
        scopeSnapshot,
      });
    } catch (error) {
      /*
       * A deletion error must stop the worker immediately.
       * Other crawl errors are non-fatal for the selected scanners.
       */
      if (isDeletedScanError(error)) {
        return buildDeletedScanResult({
          scanId,
          ownerId,
          targetId,
        });
      }

      console.error(
        JSON.stringify({
          event: "scan.crawl.failed",
          scanId,
          ownerId,
          errorCode: error?.code ?? "CRAWL_FAILED",
          errorMessage: error?.message ?? "Crawl failed.",
        }),
      );
    }

    await assertWorkerCanContinue({
      ownerId,
      scanId,
      isGuest,
    });

    const result = await executeScan({
      scan: {
        id: scanId,
        ownerId,
        targetId,
      },

      target: scanTarget,
      selection: engineSelection,
      ownerId,
      credentials: sanitizeCredentials(),
      options,
      scopeSnapshot,

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

    await assertWorkerCanContinue({
      ownerId,
      scanId,
      isGuest,
    });

    let companyRuleAnalysis = {
      enabled: false,
      rulesEvaluated: 0,
      violatedRules: 0,
      findings: [],
      evaluations: [],
    };

    companyRuleAnalysis = await evaluateEnterpriseCompanyRules({
      ownerId,
      isGuest,
      plan,
      companyRuleIds,
      scannerResults: result.scannerResults || [],
    });

    await assertWorkerCanContinue({
      ownerId,
      scanId,
      isGuest,
    });

    if (companyRuleAnalysis.findings?.length > 0) {
      result.findings = [
        ...(result.findings || []),
        ...companyRuleAnalysis.findings,
      ];
    }

    console.info(
      JSON.stringify({
        event: "scan.company_rules.completed",
        scanId,
        ownerId,
        plan,
        companyRuleIds,
        enabled: companyRuleAnalysis.enabled,
        rulesEvaluated: companyRuleAnalysis.rulesEvaluated,
        violatedRules: companyRuleAnalysis.violatedRules,
      }),
    );

    const analyzedFindings = attachFindingFingerprints(result.findings || []);

    const risk = calculateRisk(analyzedFindings);

    await assertWorkerCanContinue({
      ownerId,
      scanId,
      isGuest,
    });

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

    await assertWorkerCanContinue({
      ownerId,
      scanId,
      isGuest,
    });

    /*
     * AI failure does not fail a completed scan.
     * AI processing is skipped if the scan has been deleted.
     */
    let aiAnalysis = {
      enabled: false,
      status: "disabled",
      analyses: [],
      persisted: [],
    };

    try {
      await assertWorkerCanContinue({
        ownerId,
        scanId,
        isGuest,
      });

      aiAnalysis = await analyzeAndPersistFindings({
        ownerId,
        scanId,
        findings: persisted.persistedFindings,
        evidence: persisted.persistedEvidence,
        target: scanTarget,
      });

      await assertWorkerCanContinue({
        ownerId,
        scanId,
        isGuest,
      });
    } catch (error) {
      if (
        isDeletedScanError(error) ||
        error?.code === "GUEST_SESSION_EXPIRED"
      ) {
        throw error;
      }

      console.error(
        JSON.stringify({
          event: "scan.ai_analysis.failed",
          scanId,
          ownerId,
          errorCode: error?.code ?? "AI_ANALYSIS_FAILED",
          errorMessage: error?.message ?? "AI analysis failed.",
        }),
      );

      aiAnalysis = {
        enabled: environment.ai.enabled,
        status: "failed",
        analyses: [],
        persisted: [],
      };
    }

    await assertWorkerCanContinue({
      ownerId,
      scanId,
      isGuest,
    });

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
        finalStatus === "completed" ? 100 : (result.progress?.progress ?? 0),

      completedScanners: result.progress?.completed ?? 0,

      totalScanners:
        result.progress?.total ?? engineSelection.selectedScannerIds.length,

      findingCounts,
      riskScore: risk.score,

      errorCode:
        finalStatus === "failed"
          ? (result.errorCode ?? "SCAN_EXECUTION_FAILED")
          : null,

      errorMessage:
        finalStatus === "failed"
          ? (result.errorMessage ?? "Scan execution failed.")
          : null,

      companyRuleAnalysis: {
        enabled: companyRuleAnalysis.enabled,
        rulesEvaluated: companyRuleAnalysis.rulesEvaluated,
        violatedRules: companyRuleAnalysis.violatedRules,
        evaluations: (companyRuleAnalysis.evaluations || []).map(
          (evaluation) => ({
            ...evaluation,
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

      /*
       * Preserve per-scanner outcomes so comparisons and trends
       * can exclude scanners that failed or were not run.
       */

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

    /*
     * Check that the scan is still running immediately before
     * finalization. The repository update must use a conditional
     * MongoDB update that cannot overwrite status "deleted".
     */
    await assertScanCanFinish({
      ownerId,
      scanId,
    });

    const finalizedScan = await scanRepository.updateStatus(
      ownerId,
      scanId,
      finalStatus,
      statusFields,
    );

    if (!finalizedScan) {
      const currentScan = await scanRepository.findAnyById(ownerId, scanId);

      if (currentScan?.status === "deleted") {
        return buildDeletedScanResult({
          scanId,
          ownerId,
          targetId,
        });
      }

      const error = new Error(
        "The scan could not be finalized because its status changed.",
      );

      error.code = "SCAN_STATUS_TRANSITION_FAILED";

      throw error;
    }

    /*
     * Update target counters only after a successful transition
     * to completed. updateLastScanned is timestamp-only.
     */
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
       * Automatically compare this completed scan against
       * the immediately previous eligible completed scan.
       *
       * If comparison persistence fails, the scan remains
       * completed and BullMQ retries through the comparison-only
       * branch. The scanners are not executed again.
       */
      try {
        await createAndPersistComparisonForScan({
          ownerId,
          targetId,
          comparisonScanId: scanId,
        });
      } catch (comparisonError) {
        console.error(
          JSON.stringify({
            event: "scan.comparison.failed",
            ownerId,
            targetId,
            scanId,
            errorCode: comparisonError?.code ?? "SCAN_COMPARISON_FAILED",
            errorMessage:
              comparisonError?.message ?? "Automatic comparison failed.",
          }),
        );

        throw createComparisonRetryError(comparisonError);
      }
    } else if (finalStatus === "cancelled") {
      recordScanCancelled();
    } else {
      recordScanFailed();

      await notifyScanFailed({
        ownerId,
        scanId,
        error: result.errorMessage ?? "Scan execution failed.",
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
    /*
     * A comparison retry must not enter the ordinary scan-failure
     * path. Rethrow it so BullMQ can retry without changing the
     * already-completed scan to failed.
     */
    if (error?.scanComparisonRetry === true) {
      throw error;
    }

    /*
     * Deletion is an intentional lifecycle action, not a scan
     * failure. Do not overwrite deleted status, send failure
     * notifications, or retry the job as a failed scan.
     */
    if (isDeletedScanError(error)) {
      return buildDeletedScanResult({
        scanId,
        ownerId,
        targetId,
      });
    }

    /*
     * If the scan was deleted while another operation was running,
     * do not mark it failed.
     */
    const currentScan = await scanRepository
      .findAnyById(ownerId, scanId)
      .catch(() => null);

    if (currentScan?.status === "deleted") {
      return buildDeletedScanResult({
        scanId,
        ownerId,
        targetId,
      });
    }

    const errorCode = error?.code || "SCAN_EXECUTION_FAILED";

    const errorMessage = error?.message || "Scan execution failed.";

    if (errorCode === "GUEST_SESSION_EXPIRED") {
      return {
        scanId,
        ownerId,
        targetId,
        status: "expired",
        errorCode,
      };
    }

    /*
     * The repository must conditionally update only non-deleted
     * scans. A null result means the status changed or the scan
     * is no longer eligible for this transition.
     */
    const failedScan = await scanRepository
      .updateStatus(ownerId, scanId, "failed", {
        failedAt: new Date(),
        errorCode,
        errorMessage,
      })
      .catch(() => null);

    if (!failedScan) {
      const latestScan = await scanRepository
        .findAnyById(ownerId, scanId)
        .catch(() => null);

      if (latestScan?.status === "deleted") {
        return buildDeletedScanResult({
          scanId,
          ownerId,
          targetId,
        });
      }
    }

    recordScanFailed();

    await notifyScanFailed({
      ownerId,
      scanId,
      error: errorMessage,
    }).catch(() => {});

    throw error;
  }
};

const createScanWorker = () =>
  new Worker(environment.queue.scanName, processScanJob, {
    connection: redisConnection,
    concurrency: environment.queue.scanConcurrency,
  });

export { SCAN_JOB_NAME, enqueueScanJob, processScanJob, createScanWorker };
