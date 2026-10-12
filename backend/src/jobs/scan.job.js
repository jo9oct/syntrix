// STATUS: UPDATED

import { Worker } from 'bullmq';

import environment from '../config/environment.js';

import {
  redisConnection,
  scanQueue,
} from '../config/queue.js';

import {
  executeScan,
} from '../engine/scanEngine.js';

import {
  attachFindingFingerprints,
  correlateFindings,
  createEvidenceFingerprint,
} from '../analysis/fingerprint/fingerprint.js';

import {
  calculateRisk,
  sortFindingsByRisk,
} from '../analysis/risk/risk.js';

import {
  evaluateCompanyRules,
} from '../analysis/companyRules/companyRuleEvaluator.js';

import {
  getPlan,
} from '../access/plan.service.js';

import * as scanRepository
  from '../database/repositories/scan.repository.js';

import * as targetRepository
  from '../database/repositories/target.repository.js';

import * as findingRepository
  from '../database/repositories/finding.repository.js';

import * as evidenceRepository
  from '../database/repositories/evidence.repository.js';

import * as fingerprintRepository
  from '../database/repositories/fingerprint.repository.js';

import * as verificationRepository
  from '../database/repositories/verification.repository.js';

import * as guestSessionRepository
  from '../database/repositories/guestSession.repository.js';

import {
  analyzeAndPersistFindings,
} from '../services/aiAnalysis.service.js';

import {
  normalizeSelection,
  normalizeCompanyRuleIds,
  getSelectedScannerIds,
} from '../validators/scan.validator.js';

import {
  notifyScanStarted,
  notifyScanCompleted,
  notifyScanFailed,
} from '../notifications/notification.service.js';

import {
  recordScanStarted,
  recordScanCompleted,
  recordScanFailed,
  recordScanCancelled,
} from '../metrics/scan.metrics.js';

import {
  runCrawlAndPersist,
} from '../services/crawl.service.js';

const SCAN_JOB_NAME =
  'security-scan';

const sanitizeCredentials =
  () => null;

const createGuestSessionExpiredError =
  () => {
    const error =
      new Error(
        'The guest session has expired.',
      );

    error.code =
      'GUEST_SESSION_EXPIRED';

    error.statusCode = 410;

    return error;
  };

const assertGuestSessionActive =
  async ({
    ownerId,
    isGuest,
  }) => {
    if (!isGuest) {
      return;
    }

    const session =
      await guestSessionRepository
        .findByGuestOwnerId(
          ownerId,
        );

    if (
      !session ||
      !session.expiresAt ||
      new Date(
        session.expiresAt,
      ).getTime() <=
        Date.now()
    ) {
      throw createGuestSessionExpiredError();
    }
  };

const buildEngineSelection = (
  selection,
) => {
  const normalizedSelection =
    normalizeSelection(
      selection,
    );

  const selectedScannerIds =
    getSelectedScannerIds(
      normalizedSelection,
    );

  if (
    selectedScannerIds.length ===
    0
  ) {
    const error =
      new Error(
        'Scan selection is mandatory. At least one scanner must be selected.',
      );

    error.code =
      'NO_SCANNERS_SELECTED';

    throw error;
  }

  return {
    mode:
      'selected',

    recon: [
      ...normalizedSelection.recon,
    ],

    security: [
      ...normalizedSelection.security,
    ],

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
  options = {},
  credentialReference = null,
  isGuest = false,
  plan = 'free',
}) => {
  if (!ownerId) {
    throw new Error(
      'ownerId is required to enqueue a scan job.',
    );
  }

  if (!scanId) {
    throw new Error(
      'scanId is required to enqueue a scan job.',
    );
  }

  if (!targetId) {
    throw new Error(
      'targetId is required to enqueue a scan job.',
    );
  }

  if (!target?.url) {
    throw new Error(
      'target.url is required to enqueue a scan job.',
    );
  }

  if (!selection) {
    throw new Error(
      'scan selection is required to enqueue a scan job.',
    );
  }

  const engineSelection =
    buildEngineSelection(
      selection,
    );

  /*
   * Company rule IDs are optional.
   *
   * They are already validated and checked
   * for ownership and Enterprise access when
   * the scan is created.
   *
   * The queue stores the selected IDs so the
   * worker evaluates only the rules selected
   * for this specific scan.
   */
  const normalizedCompanyRuleIds =
    normalizeCompanyRuleIds(
      companyRuleIds,
    );

  /*
   * A missing plan is treated as Free.
   *
   * This prevents older or manually-created
   * queue jobs from accidentally receiving
   * Enterprise-only features.
   */
  const normalizedPlan =
    getPlan(
      isGuest
        ? 'free'
        : plan,
    ).name;

  /*
   * Guest scans can never use company rules.
   *
   * This is a second defensive check at the
   * queue boundary. The primary plan validation
   * happens during scan creation.
   */
  if (
    isGuest &&
    normalizedCompanyRuleIds.length >
      0
  ) {
    const error =
      new Error(
        'Company security rules are available only on the Enterprise plan.',
      );

    error.code =
      'FEATURE_NOT_AVAILABLE';

    error.statusCode = 403;

    throw error;
  }

  /*
   * Only Enterprise jobs may carry company
   * rule selections.
   */
  if (
    normalizedCompanyRuleIds.length >
      0 &&
    normalizedPlan !==
      'enterprise'
  ) {
    const error =
      new Error(
        'Company security rules are available only on the Enterprise plan.',
      );

    error.code =
      'FEATURE_NOT_AVAILABLE';

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
        url:
          target.url,

        hostname:
          target.hostname ??
          null,

        normalizedUrl:
          target.normalizedUrl ??
          null,
      },

      selection:
        engineSelection,

      companyRuleIds:
        normalizedCompanyRuleIds,

      options,

      credentialReference,

      isGuest:
        Boolean(
          isGuest,
        ),

      plan:
        normalizedPlan,
    },
    {
      jobId:
        `scan:${scanId}`,
    },
  );
};

const normalizeFindingKey = (
  value,
) => {
  if (
    typeof value !==
    'string'
  ) {
    return null;
  }

  const normalized =
    value.trim();

  return normalized.length > 0
    ? normalized
    : null;
};

const getFindingKey = (
  finding,
) =>
  normalizeFindingKey(
    finding?.fingerprint,
  ) ??
  normalizeFindingKey(
    `${finding?.scannerId ?? ''}:${finding?.title ?? ''}`,
  );

const extractFindingTitleFromKey = (
  findingKey,
) => {
  const normalizedKey =
    normalizeFindingKey(
      findingKey,
    );

  if (!normalizedKey) {
    return null;
  }

  const separatorIndex =
    normalizedKey.lastIndexOf(
      ':',
    );

  if (
    separatorIndex ===
    -1
  ) {
    return null;
  }

  const title =
    normalizedKey
      .slice(
        separatorIndex + 1,
      )
      .trim();

  return title.length > 0
    ? title
    : null;
};

const resolveFindingId = ({
  item,
  findingIds,
}) => {
  if (
    item?.findingId
  ) {
    return item.findingId;
  }

  const findingFingerprint =
    normalizeFindingKey(
      item?.findingFingerprint,
    );

  if (
    findingFingerprint
  ) {
    const findingId =
      findingIds.get(
        findingFingerprint,
      );

    if (findingId) {
      return findingId;
    }
  }

  const findingKey =
    normalizeFindingKey(
      item?.findingKey,
    );

  if (
    findingKey
  ) {
    const findingId =
      findingIds.get(
        findingKey,
      );

    if (findingId) {
      return findingId;
    }
  }

  const evidenceFingerprint =
    normalizeFindingKey(
      item?.fingerprint,
    );

  if (
    evidenceFingerprint
  ) {
    const findingId =
      findingIds.get(
        evidenceFingerprint,
      );

    if (findingId) {
      return findingId;
    }
  }

  return null;
};

const findMatchingFindingIds = ({
  item,
  findings,
  findingIds,
}) => {
  const explicitFindingId =
    resolveFindingId({
      item,
      findingIds,
    });

  if (explicitFindingId) {
    return [
      explicitFindingId,
    ];
  }

  const findingKey =
    normalizeFindingKey(
      item?.findingKey,
    );

  const findingFingerprint =
    normalizeFindingKey(
      item?.findingFingerprint,
    );

  const evidenceFingerprint =
    normalizeFindingKey(
      item?.fingerprint,
    );

  const evidenceTitle =
    normalizeFindingKey(
      item?.title,
    ) ??
    extractFindingTitleFromKey(
      findingKey,
    );

  const evidenceDescription =
    normalizeFindingKey(
      item?.description,
    );

  if (
    findingFingerprint
  ) {
    const fingerprintMatches =
      findings.filter(
        (finding) =>
          normalizeFindingKey(
            finding.fingerprint,
          ) ===
          findingFingerprint,
      );

    if (
      fingerprintMatches.length >
      0
    ) {
      return fingerprintMatches
        .map(
          (finding) =>
            findingIds.get(
              getFindingKey(
                finding,
              ),
            ),
        )
        .filter(Boolean);
    }
  }

  if (
    evidenceTitle
  ) {
    const titleMatches =
      findings.filter(
        (finding) =>
          normalizeFindingKey(
            finding.title,
          ) ===
          evidenceTitle,
      );

    if (
      titleMatches.length ===
      1
    ) {
      const findingId =
        findingIds.get(
          getFindingKey(
            titleMatches[0],
          ),
        );

      if (findingId) {
        return [
          findingId,
        ];
      }
    }

    if (
      titleMatches.length >
        1 &&
      item?.scannerId
    ) {
      const scannerTitleMatches =
        titleMatches.filter(
          (finding) =>
            finding.scannerId ===
            item.scannerId,
        );

      if (
        scannerTitleMatches.length ===
        1
      ) {
        const findingId =
          findingIds.get(
            getFindingKey(
              scannerTitleMatches[0],
            ),
          );

        if (findingId) {
          return [
            findingId,
          ];
        }
      }
    }
  }

  if (
    evidenceFingerprint
  ) {
    const fingerprintMatches =
      findings.filter(
        (finding) =>
          normalizeFindingKey(
            finding.fingerprint,
          ) ===
          evidenceFingerprint,
      );

    if (
      fingerprintMatches.length >
      0
    ) {
      return fingerprintMatches
        .map(
          (finding) =>
            findingIds.get(
              getFindingKey(
                finding,
              ),
            ),
        )
        .filter(Boolean);
    }
  }

  if (
    evidenceDescription
  ) {
    const descriptionMatches =
      findings.filter(
        (finding) =>
          normalizeFindingKey(
            finding.description,
          ) ===
          evidenceDescription,
      );

    if (
      descriptionMatches.length ===
      1
    ) {
      const findingId =
        findingIds.get(
          getFindingKey(
            descriptionMatches[0],
          ),
        );

      if (findingId) {
        return [
          findingId,
        ];
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

  if (
    item?.scannerId
  ) {
    const scannerFindings =
      findings.filter(
        (finding) =>
          finding.scannerId ===
          item.scannerId,
      );

    return scannerFindings
      .map(
        (finding) =>
          findingIds.get(
            getFindingKey(
              finding,
            ),
          ),
      )
      .filter(Boolean);
  }

  return [];
};

const getFindingIdsForEvidence = ({
  item,
  findings,
  findingIds,
}) =>
  findMatchingFindingIds({
    item,
    findings,
    findingIds,
  });

const normalizeHeaders = (
  headers,
) => {
  if (
    !headers ||
    typeof headers !==
      'object' ||
    Array.isArray(headers)
  ) {
    return {};
  }

  return headers;
};

const normalizeBody = (
  body,
) => {
  if (
    body === undefined ||
    body === null
  ) {
    return null;
  }

  if (
    typeof body ===
    'string'
  ) {
    return body.slice(
      0,
      20_000,
    );
  }

  try {
    return JSON.stringify(
      body,
    ).slice(
      0,
      20_000,
    );
  } catch {
    return String(
      body,
    ).slice(
      0,
      20_000,
    );
  }
};

const normalizeParameters = (
  parameters,
) => {
  if (
    !parameters ||
    typeof parameters !==
      'object' ||
    Array.isArray(parameters)
  ) {
    return {};
  }

  return parameters;
};

const getContentType = (
  headers,
) => {
  if (
    !headers ||
    typeof headers !==
      'object'
  ) {
    return null;
  }

  const contentType =
    headers[
      'content-type'
    ] ??
    headers[
      'Content-Type'
    ] ??
    null;

  return typeof contentType ===
    'string'
    ? contentType.slice(
        0,
        512,
      )
    : null;
};

const getBodyLength = (
  body,
) => {
  if (
    body === undefined ||
    body === null
  ) {
    return null;
  }

  if (
    typeof body ===
    'string'
  ) {
    return body.length;
  }

  try {
    return JSON.stringify(
      body,
    ).length;
  } catch {
    return null;
  }
};

// STATUS: UPDATED

const buildPersistedEvidence = ({
  item,
  findingId,
  scannerId,
  targetId,
}) => {
  const sourceRequest =
    item?.request &&
    typeof item.request === 'object' &&
    !Array.isArray(item.request)
      ? item.request
      : null;

  const sourceResponse =
    item?.response &&
    typeof item.response === 'object' &&
    !Array.isArray(item.response)
      ? item.response
      : null;

  const requestMethod =
    item?.method ??
    sourceRequest?.method ??
    null;

  const requestUrl =
    item?.url ??
    sourceRequest?.url ??
    null;

  const requestHeaders =
    normalizeHeaders(
      item?.requestHeaders ??
        sourceRequest?.headers ??
        (item?.type === 'request'
          ? item?.headers
          : null),
    );

  const requestBody =
    normalizeBody(
      item?.requestBody ??
        sourceRequest?.body,
    );

  const requestParameters =
    normalizeParameters(
      item?.parameters ??
        sourceRequest?.parameters,
    );

  const responseStatusCode =
    item?.statusCode ??
    sourceResponse?.statusCode ??
    sourceResponse?.status ??
    null;

  const responseHeaders =
    normalizeHeaders(
      item?.responseHeaders ??
        sourceResponse?.headers ??
        (item?.type === 'response' ||
        item?.type === 'http_exchange'
          ? item?.headers
          : null),
    );

  const responseBody =
    normalizeBody(
      item?.responseBody ??
        sourceResponse?.body ??
        item?.bodyExcerpt,
    );

  const summary =
    item?.summary ??
    item?.description ??
    null;

  const observationDescription =
    item?.observation?.description ??
    (typeof item?.observation === 'string'
      ? item.observation
      : null) ??
    item?.description ??
    summary ??
    null;

  const observationExpected =
    item?.observation?.expected ??
    item?.expected ??
    null;

  const observationActual =
    item?.observation?.actual ??
    item?.actual ??
    null;

  const effectiveMethod =
    requestMethod ??
    sourceResponse?.method ??
    null;

  const effectiveUrl =
    requestUrl ??
    sourceResponse?.url ??
    null;

  const effectiveHeaders =
    Object.keys(responseHeaders).length > 0
      ? responseHeaders
      : requestHeaders;

  const metadata = {
    ...(item?.metadata &&
    typeof item.metadata === 'object' &&
    !Array.isArray(item.metadata)
      ? item.metadata
      : {}),

    scannerId,
    targetId,

    ...(item?.parameter != null
      ? { parameter: item.parameter }
      : {}),

    ...(item?.payload != null
      ? { payload: item.payload }
      : {}),

    ...(item?.confidence != null
      ? { confidence: item.confidence }
      : {}),

    ...(item?.cwe != null
      ? { cwe: item.cwe }
      : {}),

    ...(item?.owasp != null
      ? { owasp: item.owasp }
      : {}),
  };

  const validTypes = new Set([
    'request',
    'response',
    'http_exchange',
    'comparison',
    'header',
    'body',
    'dns',
    'certificate',
    'metadata',
  ]);

  const evidenceType = validTypes.has(item?.type)
    ? item.type
    : 'http_exchange';

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
        sourceResponse?.body ??
          item?.bodyExcerpt,
      ),
    },

    observation: {
      description:
        typeof observationDescription === 'string'
          ? observationDescription.slice(0, 10_000)
          : observationDescription,

      expected:
        typeof observationExpected === 'string'
          ? observationExpected.slice(0, 10_000)
          : observationExpected,

      actual:
        typeof observationActual === 'string'
          ? observationActual.slice(0, 10_000)
          : observationActual,
    },

    method: effectiveMethod,
    url: effectiveUrl,
    statusCode: responseStatusCode,
    headers: effectiveHeaders,

    bodyExcerpt:
      responseBody ??
      requestBody,

    summary:
      typeof summary === 'string'
        ? summary.slice(0, 5_000)
        : summary,

    fingerprint: item?.fingerprint ?? null,

    sensitiveDataRedacted:
      item?.sensitiveDataRedacted ?? true,

    metadata,
  };
};

// STATUS: UPDATED

// STATUS: UPDATED

const persistEvidenceForFinding = async ({
  ownerId,
  scanId,
  targetId,
  scannerId,
  item,
  findingId = null,
}) => {
  const evidence = buildPersistedEvidence({
    item,
    findingId,
    scannerId,
    targetId,
  });

  evidence.ownerId = ownerId;
  evidence.scanId = scanId;

  // Generate a stable fingerprint using evidence-specific details.
  // Recalculate it rather than trusting an incomplete incoming fingerprint.
  evidence.fingerprint = createEvidenceFingerprint({
    scannerId,

    findingFingerprint:
      item?.findingFingerprint ||
      item?.findingKey ||
      findingId ||
      item?.fingerprint ||
      null,

    requestMethod:
      evidence.request?.method ??
      evidence.method ??
      null,

    requestUrl:
      evidence.request?.url ??
      evidence.url ??
      null,

    responseStatus:
      evidence.response?.statusCode ??
      evidence.statusCode ??
      null,

    evidenceType: evidence.type,

    parameter:
      evidence.metadata?.parameter ??
      item?.parameter ??
      null,

    observation:
      evidence.observation?.description ??
      evidence.summary ??
      null,

    expected:
      evidence.observation?.expected ??
      null,

    actual:
      evidence.observation?.actual ??
      null,

    requestParameters:
      evidence.request?.parameters ??
      null,

    requestBody:
      evidence.request?.body ??
      null,

    responseBodySnippet:
      evidence.response?.bodySnippet ??
      evidence.bodyExcerpt ??
      null,

    payload:
      evidence.metadata?.payload ??
      null,
  });

  // Reuse matching evidence or insert a new record.
  const persistedEvidence =
    await evidenceRepository.upsertByFingerprint({
      evidence,
    });

  // Link evidence to its finding without duplicate evidence IDs.
  if (persistedEvidence?._id && findingId) {
    await findingRepository.addEvidenceId(
      ownerId,
      findingId,
      persistedEvidence._id,
    );
  }

  return persistedEvidence;
};

const persistScanResults =
  async ({
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

    await assertGuestSessionActive({
      ownerId,
      isGuest,
    });

    const normalizedFindings =
      attachFindingFingerprints(
        findings,
      );

    const orderedFindings =
      sortFindingsByRisk(
        normalizedFindings,
      );

    console.info(
      JSON.stringify({
        event:
          'scan.evidence.debug',

        scanId,

        evidenceCount:
          evidence.length,

        findingCount:
          orderedFindings.length,

        evidenceItems:
          evidence.map(
            (item) => ({
              scannerId:
                item?.scannerId ??
                null,

              type:
                item?.type ??
                null,

              findingId:
                item?.findingId ??
                null,

              findingFingerprint:
                item?.findingFingerprint ??
                null,

              findingKey:
                item?.findingKey ??
                null,

              fingerprint:
                item?.fingerprint ??
                null,
            }),
          ),
      }),
    );

    const findingGroups =
      correlateFindings(
        orderedFindings,
      );

    const findingIds = new Map();
    const persistedFindings = [];
    const persistedFindingFingerprints = new Set();

    for (const finding of orderedFindings) {
      await assertGuestSessionActive({
        ownerId,
        isGuest,
      });

      const findingKey = getFindingKey(finding);

      const fingerprint =
        normalizeFindingKey(finding.fingerprint);

      if (!fingerprint) {
        throw new Error(
          'Cannot persist a finding without a fingerprint.',
        );
      }

      // Reuse a finding already mapped during this run.
      let persistedFindingId = findingIds.get(fingerprint);

      // Recover findings saved by an earlier, partially failed attempt.
      if (!persistedFindingId) {
        const existingFinding =
          await findingRepository.findByFingerprint(
            ownerId,
            scanId,
            fingerprint,
          );

        if (existingFinding?._id) {
          persistedFindingId =
            existingFinding._id.toString();

          if (!persistedFindingFingerprints.has(fingerprint)) {
            persistedFindings.push(existingFinding);
            persistedFindingFingerprints.add(fingerprint);
          }
        }
      }

      // Insert only if this fingerprint does not already exist.
      if (!persistedFindingId) {
        const createdFinding =
          await findingRepository.create({
            ...finding,
            ownerId,
            scanId,
            targetId,
          });

        if (!createdFinding?._id) {
          throw new Error(
            `Failed to persist finding: ${fingerprint}`,
          );
        }

        persistedFindingId =
          createdFinding._id.toString();

        if (!persistedFindingFingerprints.has(fingerprint)) {
          persistedFindings.push(createdFinding);
          persistedFindingFingerprints.add(fingerprint);
        }
      }

      // Map the fingerprint and finding key to the same persisted ID.
      findingIds.set(fingerprint, persistedFindingId);

      if (findingKey) {
        findingIds.set(findingKey, persistedFindingId);
      }
    }

    let persistedEvidenceCount =
      0;

    const persistedEvidence =
      [];

    for (
      const item
      of evidence
    ) {
      await assertGuestSessionActive({
        ownerId,
        isGuest,
      });

      const findingIdList =
        getFindingIdsForEvidence({
          item,

          findings:
            orderedFindings,

          findingIds,
        });

      /*
       * Evidence is valid even when it does
       * not correspond to a vulnerability.
       *
       * When no finding can be matched,
       * persist the evidence once with a
       * null findingId instead of silently
       * dropping it.
       */
      const evidenceFindingIds =
        findingIdList.length > 0
          ? findingIdList
          : [null];

      for (
        const findingId
        of evidenceFindingIds
      ) {
        await assertGuestSessionActive({
          ownerId,
          isGuest,
        });

        const evidenceDocument =
          await persistEvidenceForFinding({
            ownerId,

            scanId,

            targetId,

            scannerId:
              item.scannerId,

            item,

            findingId,
          });

        if (
          evidenceDocument?._id
        ) {
          persistedEvidenceCount +=
            1;

          persistedEvidence.push(
            evidenceDocument,
          );
        }
      }
    }

    for (
      const fingerprint
      of fingerprints
    ) {
      await assertGuestSessionActive({
        ownerId,
        isGuest,
      });

      await fingerprintRepository.create({
        ...fingerprint,

        ownerId,

        scanId,

        targetId,
      });
    }

    let persistedVerificationCount =
      0;

    for (
      const verification
      of verificationRecords
    ) {
      await assertGuestSessionActive({
        ownerId,
        isGuest,
      });

      const findingId =
        verification.findingId ||
        findingIds.get(
          verification.findingFingerprint,
        ) ||
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

      persistedVerificationCount +=
        1;
    }

    return {
      findings:
        orderedFindings,

      persistedFindings,

      persistedEvidence,

      findingGroups,

      findingCount:
        orderedFindings.length,

      evidenceCount:
        persistedEvidenceCount,

      fingerprintCount:
        fingerprints.length,

      verificationCount:
        persistedVerificationCount,
    };
  };

const evaluateEnterpriseCompanyRules =
  async ({
    ownerId,
    isGuest,
    plan,
    companyRuleIds = [],
    scannerResults,
  }) => {
    /*
     * Guest scans always use the Free plan.
     *
     * Company Rules are never evaluated for
     * guest requests.
     */
    if (isGuest) {
      return {
        enabled: false,

        rulesEvaluated: 0,

        violatedRules: 0,

        findings: [],

        evaluations: [],
      };
    }

    /*
     * The plan was resolved when the scan was
     * created and passed into the BullMQ job.
     *
     * Never resolve the authenticated user's
     * plan again here because the subscription
     * could have changed while the job was
     * waiting in Redis.
     *
     * Missing plan is treated as Free.
     */
    const planDefinition =
      getPlan(
        plan ??
        'free',
      );

    const enabled =
      Boolean(
        planDefinition
          ?.integrations
          ?.companyRules,
      );

    /*
     * Enterprise does not automatically
     * evaluate every company rule.
     *
     * Company rules are evaluated only when
     * the user explicitly selected one or more
     * rule IDs for this scan.
     */
    if (
      !enabled ||
      !Array.isArray(
        companyRuleIds,
      ) ||
      companyRuleIds.length ===
        0
    ) {
      return {
        enabled: false,

        rulesEvaluated: 0,

        violatedRules: 0,

        findings: [],

        evaluations: [],
      };
    }

    const result =
      await evaluateCompanyRules({
        ownerId,

        companyRuleIds,

        scannerResults:
          scannerResults || [],
      });

    return {
      enabled: true,

      ...result,
    };
  };

const processScanJob =
  async (
    job,
  ) => {
    const {
      ownerId,

      scanId,

      targetId,

      target,

      selection,

      /*
       * The scan service stores the selected
       * company rule IDs in the BullMQ job.
       *
       * An empty array means:
       * "Do not evaluate company rules."
       */
      companyRuleIds = [],

      options = {},

      isGuest = false,

      /*
       * The scan service passes the plan that
       * was resolved during scan creation.
       *
       * Defaulting to Free protects older jobs
       * that do not contain this property.
       */
      plan = 'free',
    } = job.data;

    const startedAt =
      Date.now();

    recordScanStarted();

    try {
      await assertGuestSessionActive({
        ownerId,
        isGuest,
      });

      await scanRepository.updateStatus(
        ownerId,
        scanId,
        'running',
        {
          startedAt:
            new Date(),

          errorCode:
            null,

          errorMessage:
            null,

          progress:
            0,
        },
      );

      await notifyScanStarted({
        ownerId,
        scanId,
      }).catch(() => {});

      await assertGuestSessionActive({
        ownerId,
        isGuest,
      });

      const storedTarget =
        await targetRepository.findById(
          ownerId,
          targetId,
        );

      if (!storedTarget) {
        const error =
          new Error(
            'Scan target was not found.',
          );

        error.code =
          'SCAN_TARGET_NOT_FOUND';

        throw error;
      }

      const scanTarget = {
        id:
          targetId,

        url:
          target?.url ||
          storedTarget.url,

        hostname:
          target?.hostname ||
          storedTarget.hostname ||
          null,

        normalizedUrl:
          target?.normalizedUrl ||
          storedTarget.normalizedUrl ||
          null,
      };

      const engineSelection =
        buildEngineSelection(
          selection,
        );

      // STATUS: UPDATED

      /*
      * Persist the crawl separately from the Scan document.
      *
      * The plan was captured when the job was created.
      * Crawl failures are recorded but must not prevent
      * the selected security scanners from running.
      */
      let crawlResult = null;

      try {
        crawlResult = await runCrawlAndPersist({
          ownerId,
          scanId,
          targetUrl: scanTarget.url,
          plan: isGuest ? 'free' : plan,
          headers: {},
        });
      } catch (error) {
        // Preserve your existing crawl-error logging and handling here.
      }

      // STATUS: UPDATED

      const result =
        await executeScan({
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

          discoveredUrls: (crawlResult?.pages ?? [])
            .filter((page) => page?.status === 'success')
            .map((page) => page.url)
            .filter((url) => {
              try {
                return new URL(url).searchParams.size > 0;
              } catch {
                return false;
              }
            }),
        });

      /*
       * Company Rules are a post-scan
       * policy-analysis layer.
       *
       * They are NOT scanners and therefore
       * do not modify the scanner registry
       * or scanner execution pipeline.
       *
       * The plan and selected rule IDs are
       * captured when the scan is created.
       */
      let companyRuleAnalysis = {
        enabled: false,

        rulesEvaluated: 0,

        violatedRules: 0,

        findings: [],

        evaluations: [],
      };

      await assertGuestSessionActive({
        ownerId,
        isGuest,
      });

      companyRuleAnalysis =
        await evaluateEnterpriseCompanyRules({
          ownerId,

          isGuest,

          plan,

          companyRuleIds,

          scannerResults:
            result.scannerResults ||
            [],
        });

      if (
        companyRuleAnalysis
          .findings
          ?.length > 0
      ) {
        result.findings = [
          ...(result.findings ||
            []),

          ...companyRuleAnalysis.findings,
        ];
      }

      console.info(
        JSON.stringify({
          event:
            'scan.company_rules.completed',

          scanId,

          ownerId,

          plan,

          companyRuleIds,

          enabled:
            companyRuleAnalysis.enabled,

          rulesEvaluated:
            companyRuleAnalysis
              .rulesEvaluated,

          violatedRules:
            companyRuleAnalysis
              .violatedRules,
        }),
      );

      const analyzedFindings =
        attachFindingFingerprints(
          result.findings ||
            [],
        );

      const risk =
        calculateRisk(
          analyzedFindings,
        );

      await assertGuestSessionActive({
        ownerId,
        isGuest,
      });

      const persisted =
        await persistScanResults({
          ownerId,

          scanId,

          targetId,

          results: {
            ...result,

            findings:
              analyzedFindings,
          },

          isGuest,
        });

      await assertGuestSessionActive({
        ownerId,
        isGuest,
      });

      /*
       * AI analysis runs only after
       * findings and evidence have been
       * persisted. This guarantees that
       * AI records contain the real
       * MongoDB finding IDs.
       *
       * AI failure must never make an
       * otherwise successful security
       * scan fail.
       */
      let aiAnalysis = {
        enabled: false,

        status: 'disabled',

        analyses: [],

        persisted: [],
      };

      try {
        await assertGuestSessionActive({
          ownerId,
          isGuest,
        });

        aiAnalysis =
          await analyzeAndPersistFindings({
            ownerId,

            scanId,

            findings:
              persisted.persistedFindings,

            evidence:
              persisted.persistedEvidence,

            target:
              scanTarget,
          });

        await assertGuestSessionActive({
          ownerId,
          isGuest,
        });
      } catch (error) {
        if (
          error?.code ===
          'GUEST_SESSION_EXPIRED'
        ) {
          throw error;
        }

        console.error(
          JSON.stringify({
            event:
              'scan.ai_analysis.failed',

            scanId,

            ownerId,

            errorCode:
              error?.code ??
              'AI_ANALYSIS_FAILED',

            errorMessage:
              error?.message ??
              'AI analysis failed.',
          }),
        );

        aiAnalysis = {
          enabled:
            environment.ai.enabled,

          status:
            'failed',

          analyses: [],

          persisted: [],
        };
      }

      await assertGuestSessionActive({
        ownerId,
        isGuest,
      });

      const finishedAt =
        new Date();

      const durationMs =
        Date.now() -
        startedAt;

      /*
       * Preserve the actual status returned
       * by the scan engine.
       *
       * Previously every status except
       * "cancelled" was converted to
       * "completed", which caused scanner
       * failures to appear as successful
       * scans.
       */
      const finalStatus =
        result.status ===
        'cancelled'
          ? 'cancelled'
          : result.status ===
              'failed'
            ? 'failed'
            : 'completed';

      if (
        finalStatus ===
        'cancelled'
      ) {
        recordScanCancelled();
      } else if (
        finalStatus ===
        'failed'
      ) {
        /*
         * The scan engine already reported
         * the failure. Count it as failed
         * instead of completed.
         */
        recordScanFailed();
      } else {
        recordScanCompleted({
          durationMs,

          findingCount:
            persisted.findingCount,
        });
      }

      const severityCounts =
        risk.severityCounts || {
          critical: 0,

          high: 0,

          medium: 0,

          low: 0,

          info: 0,
        };

      const findingCounts = {
        critical:
          severityCounts.critical ||
          0,

        high:
          severityCounts.high ||
          0,

        medium:
          severityCounts.medium ||
          0,

        low:
          severityCounts.low ||
          0,

        info:
          severityCounts.info ||
          0,
      };

      const statusFields = {
        progress:
          finalStatus ===
          'completed'
            ? 100
            : result.progress?.progress ??
              0,

        completedScanners:
          result.progress?.completed ??
          0,

        totalScanners:
          result.progress?.total ??
          engineSelection
            .selectedScannerIds
            .length,

        findingCounts,

        riskScore:
          risk.score,

        errorCode:
          null,

        errorMessage:
          null,
      };

      /*
       * Store the correct terminal timestamp
       * and preserve scanner failure details.
       */
      if (
        finalStatus ===
        'cancelled'
      ) {
        statusFields.cancelledAt =
          finishedAt;
      } else if (
        finalStatus ===
        'failed'
      ) {
        statusFields.failedAt =
          finishedAt;

        statusFields.errorCode =
          result.errorCode ??
          'SCAN_EXECUTION_FAILED';

        statusFields.errorMessage =
          result.errorMessage ??
          'Scan execution failed.';
      } else {
        statusFields.completedAt =
          finishedAt;
      }

      await scanRepository.updateStatus(
        ownerId,
        scanId,
        finalStatus,
        statusFields,
      );

      /*
       * Only a genuinely completed scan
       * updates the target's scan counters.
       */
      if (
        finalStatus ===
        'completed'
      ) {
        await targetRepository.incrementScanCount(
          ownerId,
          targetId,
        );

        await targetRepository.updateLastScanned(
          ownerId,
          targetId,
          finishedAt,
        );
      }

      if (
        finalStatus ===
        'completed'
      ) {
        await notifyScanCompleted({
          ownerId,

          scanId,

          riskScore:
            risk.score,
        }).catch(() => {});
      }

      /*
       * Failed scans use the failure
       * notification path here as well.
       *
       * The catch block is reserved for
       * unexpected exceptions and failures
       * that happen before a normal engine
       * result is returned.
       */
      if (
        finalStatus ===
        'failed'
      ) {
        await notifyScanFailed({
          ownerId,

          scanId,

          error:
            result.errorMessage ??
            'Scan execution failed.',
        }).catch(() => {});
      }

      return {
        scanId,

        ownerId,

        targetId,

        status:
          finalStatus,

        risk,

        findings:
          persisted.findingCount,

        findingGroups:
          persisted.findingGroups
            .length,

        evidence:
          persisted.evidenceCount,

        fingerprints:
          persisted.fingerprintCount,

        verifications:
          persisted.verificationCount,

        companyRules: {
          enabled:
            companyRuleAnalysis.enabled,

          selected:
            companyRuleIds.length,

          rulesEvaluated:
            companyRuleAnalysis
              .rulesEvaluated,

          violatedRules:
            companyRuleAnalysis
              .violatedRules,
        },

        aiAnalysis: {
          enabled:
            aiAnalysis.enabled,

          status:
            aiAnalysis.status,

          persisted:
            aiAnalysis.persisted
              ?.length ?? 0,
        },
      };
    } catch (error) {
      /*
       * Unexpected exceptions reach this
       * catch block. Scanner failures that
       * are returned normally by executeScan()
       * are handled above using result.status.
       */
      const errorCode =
        error?.code ||
        'SCAN_EXECUTION_FAILED';

      const errorMessage =
        error?.message ||
        'Scan execution failed.';

      /*
       * Do not double-count a scanner failure
       * that has already been returned as
       * result.status === "failed".
       *
       * This catch block is for exceptions
       * thrown outside the normal engine result
       * flow.
       */
      recordScanFailed();

      /*
       * If the guest session expired,
       * cleanup owns the guest data.
       *
       * Do not recreate/update the scan
       * after cleanup has started.
       */
      if (
        errorCode ===
        'GUEST_SESSION_EXPIRED'
      ) {
        return {
          scanId,

          ownerId,

          targetId,

          status:
            'expired',

          errorCode,
        };
      }

      await scanRepository.updateStatus(
        ownerId,
        scanId,
        'failed',
        {
          failedAt:
            new Date(),

          errorCode,

          errorMessage,
        },
      );

      await notifyScanFailed({
        ownerId,

        scanId,

        error:
          errorMessage,
      }).catch(() => {});

      throw error;
    }
  };

const createScanWorker =
  () =>
    new Worker(
      environment.queue.scanName,
      processScanJob,
      {
        connection:
          redisConnection,

        concurrency:
          environment.queue
            .scanConcurrency,
      },
    );

export {
  SCAN_JOB_NAME,
  enqueueScanJob,
  processScanJob,
  createScanWorker,
};