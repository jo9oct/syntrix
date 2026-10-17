// STATUS: UPDATED
// FILE: src/services/scan.service.js

import mongoose from "mongoose";

import * as scanRepository from "../database/repositories/scan.repository.js";
import * as targetRepository from "../database/repositories/target.repository.js";
import * as companyRuleRepository from "../database/repositories/companyRule.repository.js";

import { getPlan } from "../access/plan.service.js";
import { resolveEffectivePlanName } from "../access/subscription.service.js";

import {
  getSelectedScannerIds,
  normalizeSelection,
  normalizeCompanyRuleIds,
} from "../validators/scan.validator.js";

import { scanQueue } from "../config/queue.js";

import {
  storeCredentials,
  deleteCredentials,
} from "./credentialVault.service.js";

import { resolveScopeForTarget } from "./scope.service.js";

const normalizeTargetUrl = (value) => {
  const parsedUrl = new URL(value);

  parsedUrl.hash = "";

  return parsedUrl.toString();
};

const getHostname = (url) => {
  const parsedUrl = new URL(url);

  return parsedUrl.hostname;
};

const assertOwnerId = (ownerId) => {
  if (!ownerId) {
    throw createServiceError(
      "OWNER_ID_REQUIRED",
      "Owner ID is required.",
      401,
    );
  }

  if (!mongoose.isValidObjectId(ownerId)) {
    throw createServiceError(
      "INVALID_OWNER_ID",
      "Owner ID must be a valid ObjectId.",
      400,
    );
  }

  return new mongoose.Types.ObjectId(ownerId);
};

const assertScanId = (scanId) => {
  if (!scanId || !mongoose.isValidObjectId(scanId)) {
    throw createServiceError(
      "INVALID_SCAN_ID",
      "Scan ID must be a valid ObjectId.",
      400,
    );
  }

  return new mongoose.Types.ObjectId(scanId);
};

const createServiceError = (code, message, statusCode) => {
  const error = new Error(message);

  error.code = code;
  error.statusCode = statusCode;

  return error;
};

const resolvePlan = async ({ ownerId, isGuest }) => {
  const planName = await resolveEffectivePlanName({
    userId: ownerId,
    isGuest,
  });

  return getPlan(planName);
};

// STATUS: UPDATED
// FILE: src/services/scan.service.js

const resolveSelectedScope = async ({
  ownerId,
  targetUrl,
  scopes,
  isGuest,
}) => {
  const selectedScopes = scopes ?? [];

  if (!Array.isArray(selectedScopes)) {
    throw createServiceError(
      "INVALID_SCOPES",
      "Scopes must be an array of saved scope IDs.",
      400,
    );
  }

  if (selectedScopes.length > 1) {
    throw createServiceError(
      "MULTIPLE_SCOPES_NOT_SUPPORTED",
      "Select at most one saved scope per scan.",
      400,
    );
  }

  if (isGuest) {
    if (selectedScopes.length > 0) {
      throw createServiceError(
        "SCOPES_NOT_AVAILABLE_FOR_GUEST",
        "Saved scopes are not available for guest scans.",
        403,
      );
    }

    return {
      scopeId: null,
      scopeSnapshot: null,
    };
  }

  // Authenticated users may scan without selecting a saved scope.
  if (selectedScopes.length === 0) {
    return {
      scopeId: null,
      scopeSnapshot: null,
    };
  }

  // A selected scope must still be valid and authorized.
  const selectedScopeId = selectedScopes[0];

  if (!mongoose.isValidObjectId(selectedScopeId)) {
    throw createServiceError(
      "INVALID_SCOPE_ID",
      "The selected scope ID must be a valid ObjectId.",
      400,
    );
  }

  const resolved = await resolveScopeForTarget({
    ownerId,
    targetUrl,
    scopeId: selectedScopeId,
  });

  if (!resolved?.scopeId || !resolved?.scopeSnapshot) {
    throw createServiceError(
      "SCOPE_RESOLUTION_FAILED",
      "The selected saved scope could not be resolved.",
      400,
    );
  }

  return {
    scopeId: resolved.scopeId,
    scopeSnapshot: resolved.scopeSnapshot,
  };
};

const assertAuthenticationAllowed = ({ credentials, plan, isGuest }) => {
  if (!credentials) {
    return;
  }

  if (
    typeof credentials.username !== "string" ||
    credentials.username.trim().length === 0 ||
    typeof credentials.password !== "string" ||
    credentials.password.length === 0
  ) {
    throw createServiceError(
      "INVALID_AUTHENTICATION_CREDENTIALS",
      "A non-empty username and password are required for authenticated scanning.",
      400,
    );
  }

  if (isGuest || plan?.authenticationScanning !== true) {
    throw createServiceError(
      "FEATURE_NOT_AVAILABLE",
      "Authenticated scanning is not available on the current plan.",
      403,
    );
  }
};

const getStartOfCurrentDay = () => {
  const now = new Date();

  now.setHours(0, 0, 0, 0);

  return now;
};

const assertDailyScanLimit = async (ownerId, plan) => {
  const dailyLimit = plan.dailyScanLimit;

  if (dailyLimit === null || dailyLimit === undefined) {
    return {
      dailyScanCount: 0,
      dailyScanLimit: dailyLimit,
    };
  }

  const startOfDay = getStartOfCurrentDay();

  const dailyScanCount = await scanRepository.countCreatedSince(
    ownerId,
    startOfDay,
  );

  if (dailyScanCount >= dailyLimit) {
    throw createServiceError(
      "DAILY_SCAN_LIMIT_REACHED",
      "The daily scan limit for the current plan has been reached.",
      429,
    );
  }

  return {
    dailyScanCount,
    dailyScanLimit: dailyLimit,
  };
};

const assertPlanAllowsScan = async (ownerId, plan) => {
  const dailyQuota = await assertDailyScanLimit(ownerId, plan);

  const activeScanCount = await scanRepository.countActiveByOwner(ownerId);

  const concurrentLimit = plan.maxConcurrentScans;

  if (concurrentLimit !== null && activeScanCount >= concurrentLimit) {
    throw createServiceError(
      "CONCURRENT_SCAN_LIMIT_REACHED",
      "The maximum number of concurrent scans for the current plan has been reached.",
      429,
    );
  }

  return {
    plan,
    activeScanCount,
    dailyScanCount: dailyQuota.dailyScanCount,
    dailyScanLimit: dailyQuota.dailyScanLimit,
  };
};

const assertCompanyRuleSelection = async ({
  ownerId,
  plan,
  isGuest,
  companyRuleIds,
}) => {
  const normalizedRuleIds = normalizeCompanyRuleIds(companyRuleIds);

  if (normalizedRuleIds.length === 0) {
    return [];
  }

  if (isGuest || !plan?.integrations?.companyRules) {
    throw createServiceError(
      "FEATURE_NOT_AVAILABLE",
      "Company security rules are available only on the Enterprise plan.",
      403,
    );
  }

  const objectIds = normalizedRuleIds.map((ruleId) => {
    if (!mongoose.isValidObjectId(ruleId)) {
      throw createServiceError(
        "INVALID_COMPANY_RULE_ID",
        "Company rule ID must be a valid ObjectId.",
        400,
      );
    }

    return new mongoose.Types.ObjectId(ruleId);
  });

  const rules = await companyRuleRepository.findByIds(ownerId, objectIds);

  if (rules.length !== objectIds.length) {
    throw createServiceError(
      "COMPANY_RULE_SELECTION_INVALID",
      "One or more selected company security rules were not found or are disabled.",
      400,
    );
  }

  return objectIds.map((ruleId) => ruleId.toString());
};

const resolveTarget = async ({ ownerId, targetUrl }) => {
  const normalizedUrl = normalizeTargetUrl(targetUrl);

  let target = await targetRepository.findByNormalizedUrl(
    ownerId,
    normalizedUrl,
  );

  if (target) {
    return target;
  }

  try {
    target = await targetRepository.create({
      ownerId,
      url: targetUrl,
      normalizedUrl,
      hostname: getHostname(normalizedUrl),
      isActive: true,
      scanCount: 0,
    });

    return target;
  } catch (error) {
    if (error?.code === 11000) {
      target = await targetRepository.findByNormalizedUrl(
        ownerId,
        normalizedUrl,
      );

      if (target) {
        return target;
      }
    }

    throw error;
  }
};

const buildScanData = ({
  ownerId,
  target,
  targetUrl,
  selection,
  companyRuleIds,
  credentials,
  idempotencyKey,
  scopeId,
  scopeSnapshot,
}) => ({
  ownerId,

  targetId: target._id,

  targetUrl,

  scanSelection: selection,

  companyRuleIds: companyRuleIds.map(
    (ruleId) => new mongoose.Types.ObjectId(ruleId),
  ),

  scopeId: scopeId ? new mongoose.Types.ObjectId(scopeId) : null,

  scopeSnapshot: scopeSnapshot
    ? {
        ...scopeSnapshot,
        scopeId: new mongoose.Types.ObjectId(scopeSnapshot.scopeId ?? scopeId),
      }
    : undefined,

  status: "pending",

  progress: 0,

  totalScanners: getSelectedScannerIds(selection).length,

  completedScanners: 0,

  findingCounts: {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    info: 0,
  },

  riskScore: null,

  // Never persist the username or password.
  credentials: {
    credentialProvided: Boolean(credentials),
  },

  ...(idempotencyKey ? { idempotencyKey } : {}),
});

const createScan = async ({
  ownerId,
  targetUrl,
  scanSelection,
  scopes = [],
  companyRuleIds = [],
  credentials = null,
  idempotencyKey = null,
  isGuest = false,
}) => {
  const normalizedOwnerId = assertOwnerId(ownerId);

  // Guests use Free; registered users use their current database subscription.
  const plan = await resolvePlan({
    ownerId: normalizedOwnerId,
    isGuest,
  });

  // Return an existing idempotent request before storing new credentials.
  if (idempotencyKey) {
    const existingScan = await scanRepository.findByIdempotencyKey(
      normalizedOwnerId,
      idempotencyKey,
    );

    if (existingScan) {
      return {
        scan: existingScan,
        duplicated: true,
      };
    }
  }

  assertAuthenticationAllowed({
    credentials,
    plan,
    isGuest,
  });

  await assertPlanAllowsScan(normalizedOwnerId, plan);

  const normalizedSelection = normalizeSelection(scanSelection);

  const selectedScannerIds = getSelectedScannerIds(normalizedSelection);

  if (selectedScannerIds.length === 0) {
    throw createServiceError(
      "NO_SCANNERS_SELECTED",
      "At least one scanner must be selected.",
      400,
    );
  }

  if (
    plan.maxScannersPerScan !== null &&
    selectedScannerIds.length > plan.maxScannersPerScan
  ) {
    throw createServiceError(
      "SCANNER_LIMIT_REACHED",
      "The selected number of scanners exceeds the limit for the current plan.",
      403,
    );
  }

  const { scopeId, scopeSnapshot } = await resolveSelectedScope({
    ownerId: normalizedOwnerId,
    targetUrl,
    scopes,
    isGuest,
  });

  const normalizedCompanyRuleIds = await assertCompanyRuleSelection({
    ownerId: normalizedOwnerId,
    plan,
    isGuest,
    companyRuleIds,
  });

  const target = await resolveTarget({
    ownerId: normalizedOwnerId,
    targetUrl,
  });

  const scanData = buildScanData({
    ownerId: normalizedOwnerId,
    target,
    targetUrl,
    selection: normalizedSelection,
    companyRuleIds: normalizedCompanyRuleIds,
    credentials,
    idempotencyKey,
    scopeId,
    scopeSnapshot,
  });

  let scan;

  try {
    scan = await scanRepository.create(scanData);
  } catch (error) {
    if (error?.code === 11000 && idempotencyKey) {
      const existingScan = await scanRepository.findByIdempotencyKey(
        normalizedOwnerId,
        idempotencyKey,
      );

      if (existingScan) {
        return {
          scan: existingScan,
          duplicated: true,
        };
      }
    }

    throw error;
  }

  let credentialReference = null;

  try {
    if (credentials && !isGuest) {
      credentialReference = await storeCredentials({
        username: credentials.username,
        password: credentials.password,
      });
    }

    await scanQueue.add(
      "security-scan",
      {
        scanId: scan._id.toString(),

        ownerId: normalizedOwnerId.toString(),

        targetId: target._id.toString(),

        target: {
          url: target.url,
          hostname: target.hostname,
          normalizedUrl: target.normalizedUrl,
        },

        selection: normalizedSelection,

        companyRuleIds: normalizedCompanyRuleIds,

        scopeSnapshot: scopeSnapshot
          ? {
              ...scopeSnapshot,
              scopeId: String(scopeSnapshot.scopeId ?? scopeId),
              capturedAt: new Date(scopeSnapshot.capturedAt).toISOString(),
            }
          : null,

        options: {},

        credentialReference,

        isGuest: Boolean(isGuest),

        // Transitional only: the worker must resolve the current plan itself.
        plan: plan.name,
      },
      {
        jobId: scan._id.toString(),
      },
    );
  } catch {
    if (credentialReference) {
      try {
        await deleteCredentials(credentialReference);
      } catch {
        // The credential vault TTL provides eventual cleanup.
      }
    }

    try {
      await scanRepository.markFailed(
        normalizedOwnerId,
        scan._id,
        "SCAN_QUEUE_ERROR",
        "The scan could not be queued for processing.",
      );
    } catch {
      // Do not expose internal errors or credential data.
    }

    throw createServiceError(
      "SCAN_QUEUE_ERROR",
      "The scan could not be queued for processing.",
      503,
    );
  }

  return {
    scan,
    duplicated: false,
  };
};

const getScan = async ({ ownerId, scanId }) => {
  const normalizedOwnerId = assertOwnerId(ownerId);

  const normalizedScanId = assertScanId(scanId);

  const scan = await scanRepository.findById(
    normalizedOwnerId,
    normalizedScanId,
  );

  if (!scan) {
    throw createServiceError("SCAN_NOT_FOUND", "Scan not found.", 404);
  }

  return scan;
};

const cancelScan = async ({ ownerId, scanId }) => {
  const normalizedOwnerId = assertOwnerId(ownerId);

  const normalizedScanId = assertScanId(scanId);

  const scan = await scanRepository.findById(
    normalizedOwnerId,
    normalizedScanId,
  );

  if (!scan) {
    throw createServiceError("SCAN_NOT_FOUND", "Scan not found.", 404);
  }

  if (!["pending", "running"].includes(scan.status)) {
    throw createServiceError(
      "SCAN_CANNOT_BE_CANCELLED",
      `Scan cannot be cancelled while it is ${scan.status}.`,
      409,
    );
  }

  const cancelledScan = await scanRepository.markCancelled(
    normalizedOwnerId,
    normalizedScanId,
  );

  if (!cancelledScan) {
    throw createServiceError(
      "SCAN_CANNOT_BE_CANCELLED",
      "Scan could not be cancelled because its status changed.",
      409,
    );
  }

  try {
    await scanQueue.remove(normalizedScanId.toString());
  } catch {
    // The scan is already marked cancelled.
    // The worker must ignore it if the job was already picked up.
  }

  return cancelledScan;
};

export { createScan, getScan, cancelScan };