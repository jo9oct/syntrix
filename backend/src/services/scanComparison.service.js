// STATUS: UPDATED
// File: src/services/scanComparison.service.js

import mongoose from "mongoose";

import * as scanRepository from "../database/repositories/scan.repository.js";
import * as targetRepository from "../database/repositories/target.repository.js";
import * as findingRepository from "../database/repositories/finding.repository.js";
import * as scanComparisonRepository from "../database/repositories/scanComparison.repository.js";

const createServiceError = (message, statusCode, code) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
};

const assertObjectId = (value, fieldName) => {
  if (!mongoose.isValidObjectId(value)) {
    throw createServiceError(`${fieldName} is invalid.`, 400, "INVALID_ID");
  }

  return new mongoose.Types.ObjectId(String(value));
};

const getOwnedScanOrThrow = async (ownerId, scanId) => {
  const scan = await scanRepository.findById(
    assertObjectId(ownerId, "ownerId"),
    assertObjectId(scanId, "scanId"),
  );

  if (!scan) {
    throw createServiceError("Scan was not found.", 404, "SCAN_NOT_FOUND");
  }

  return scan;
};

/**
 * Return scanner IDs that have a recorded successful outcome.
 *
 * A scanner counts as successful only when its outcome status
 * is exactly "completed" and its scannerId is a non-empty string.
 */
const getSuccessfulScannerIds = (scan) => {
  if (!Array.isArray(scan?.scannerOutcomes)) {
    return new Set();
  }

  return new Set(
    scan.scannerOutcomes
      .filter(
        (outcome) =>
          outcome?.status === "completed" &&
          typeof outcome.scannerId === "string" &&
          outcome.scannerId.trim().length > 0,
      )
      .map((outcome) => outcome.scannerId),
  );
};

/**
 * Build a stable identity for a finding across scans.
 */
const getFindingIdentity = (finding) => {
  if (
    !finding?.fingerprint ||
    typeof finding.scannerId !== "string" ||
    finding.scannerId.trim().length === 0
  ) {
    return null;
  }

  return `${finding.scannerId}:${finding.fingerprint}`;
};

/**
 * Keep only findings from scanners eligible for comparison.
 */
const getEligibleFindings = (findings, eligibleScannerIds) => {
  if (!Array.isArray(findings)) {
    return [];
  }

  return findings.filter(
    (finding) =>
      typeof finding?.scannerId === "string" &&
      eligibleScannerIds.has(finding.scannerId) &&
      Boolean(finding.fingerprint),
  );
};

/**
 * Find scanners that completed successfully in both scans.
 *
 * comparableScannerIds.size is the number of comparable scanners,
 * regardless of whether those scanners found identical findings.
 */
const getComparableScanners = (baselineScan, comparisonScan) => {
  const baselineSuccessful = getSuccessfulScannerIds(baselineScan);
  const comparisonSuccessful = getSuccessfulScannerIds(comparisonScan);

  const comparableScannerIds = new Set(
    [...baselineSuccessful].filter((scannerId) =>
      comparisonSuccessful.has(scannerId),
    ),
  );

  return {
    baselineSuccessful,
    comparisonSuccessful,
    comparableScannerIds,
    outcomeDataAvailable:
      Array.isArray(baselineScan?.scannerOutcomes) &&
      Array.isArray(comparisonScan?.scannerOutcomes),
  };
};

/**
 * Compare two completed scans.
 *
 * Only scanners completed successfully in both scans can produce
 * added, persistent, or resolved findings.
 *
 * This function does not modify finding status in the database.
 */
const compareScans = async ({ ownerId, scanId, otherScanId }) => {
  const normalizedOwnerId = assertObjectId(ownerId, "ownerId");

  const baselineScan = await getOwnedScanOrThrow(normalizedOwnerId, scanId);

  const comparisonScan = await getOwnedScanOrThrow(
    normalizedOwnerId,
    otherScanId,
  );

  if (String(baselineScan._id) === String(comparisonScan._id)) {
    throw createServiceError(
      "Choose two different scans to compare.",
      400,
      "SAME_SCAN_COMPARISON",
    );
  }

  if (String(baselineScan.targetId) !== String(comparisonScan.targetId)) {
    throw createServiceError(
      "Scans must belong to the same target.",
      400,
      "TARGET_MISMATCH",
    );
  }

  if (
    baselineScan.status !== "completed" ||
    comparisonScan.status !== "completed" ||
    !baselineScan.completedAt ||
    !comparisonScan.completedAt
  ) {
    throw createServiceError(
      "Only completed scans can be compared.",
      409,
      "SCAN_NOT_COMPLETED",
    );
  }

  if (
    Number.isInteger(baselineScan.version) &&
    Number.isInteger(comparisonScan.version) &&
    baselineScan.version >= comparisonScan.version
  ) {
    throw createServiceError(
      "The baseline scan must be older than the comparison scan.",
      409,
      "INVALID_COMPARISON_ORDER",
    );
  }

  const {
    baselineSuccessful,
    comparisonSuccessful,
    comparableScannerIds,
    outcomeDataAvailable,
  } = getComparableScanners(baselineScan, comparisonScan);

  const [baselineFindings, comparisonFindings] = await Promise.all([
    findingRepository.listByScan(normalizedOwnerId, baselineScan._id, {
      limit: 1000,
      skip: 0,
    }),
    findingRepository.listByScan(normalizedOwnerId, comparisonScan._id, {
      limit: 1000,
      skip: 0,
    }),
  ]);

  const eligibleBaselineFindings = getEligibleFindings(
    baselineFindings,
    comparableScannerIds,
  );

  const eligibleComparisonFindings = getEligibleFindings(
    comparisonFindings,
    comparableScannerIds,
  );

  const baselineByIdentity = new Map();

  for (const finding of eligibleBaselineFindings) {
    const identity = getFindingIdentity(finding);

    if (identity) {
      baselineByIdentity.set(identity, finding);
    }
  }

  const comparisonByIdentity = new Map();

  for (const finding of eligibleComparisonFindings) {
    const identity = getFindingIdentity(finding);

    if (identity) {
      comparisonByIdentity.set(identity, finding);
    }
  }

  const added = [];
  const persistent = [];
  const resolved = [];

  for (const [identity, finding] of comparisonByIdentity) {
    const previous = baselineByIdentity.get(identity);

    if (previous) {
      persistent.push({
        previous,
        current: finding,
      });
    } else {
      added.push(finding);
    }
  }

  /*
   * A missing finding is considered resolved only when its scanner
   * completed successfully in both scans. Findings from failed,
   * skipped, missing, or unrecorded scanner outcomes are excluded.
   */
  for (const [identity, finding] of baselineByIdentity) {
    if (!comparisonByIdentity.has(identity)) {
      resolved.push(finding);
    }
  }

  return {
    targetId: baselineScan.targetId,

    baseline: {
      scanId: baselineScan._id,
      version: baselineScan.version ?? null,
      completedAt: baselineScan.completedAt,
    },

    comparison: {
      scanId: comparisonScan._id,
      version: comparisonScan.version ?? null,
      completedAt: comparisonScan.completedAt,
    },

    scannerComparison: {
      comparable: [...comparableScannerIds],

      baselineOnly: [...baselineSuccessful].filter(
        (scannerId) => !comparisonSuccessful.has(scannerId),
      ),

      comparisonOnly: [...comparisonSuccessful].filter(
        (scannerId) => !baselineSuccessful.has(scannerId),
      ),

      outcomeDataAvailable,
    },

    summary: {
      added: added.length,
      persistent: persistent.length,
      resolved: resolved.length,
      comparableScanners: comparableScannerIds.size,
    },

    findings: {
      added,
      persistent,
      resolved,
    },
  };
};

/**
 * Automatically compare a completed scan with its previous eligible
 * completed scan, then persist the latest comparison for this target.
 */
const createAndPersistComparisonForScan = async ({
  ownerId,
  targetId,
  comparisonScanId,
}) => {
  const normalizedOwnerId = assertObjectId(ownerId, "ownerId");
  const normalizedTargetId = assertObjectId(targetId, "targetId");
  const normalizedComparisonScanId = assertObjectId(
    comparisonScanId,
    "comparisonScanId",
  );

  const comparisonScan = await getOwnedScanOrThrow(
    normalizedOwnerId,
    normalizedComparisonScanId,
  );

  if (String(comparisonScan.targetId) !== String(normalizedTargetId)) {
    throw createServiceError(
      "The scan does not belong to the specified target.",
      400,
      "TARGET_MISMATCH",
    );
  }

  if (comparisonScan.status !== "completed" || !comparisonScan.completedAt) {
    throw createServiceError(
      "Only completed scans can trigger automatic comparison.",
      409,
      "SCAN_NOT_COMPLETED",
    );
  }

  if (!Number.isInteger(comparisonScan.version) || comparisonScan.version < 1) {
    throw createServiceError(
      "The completed scan has no valid version.",
      409,
      "SCAN_VERSION_REQUIRED",
    );
  }

  const target = await targetRepository.findById(
    normalizedOwnerId,
    normalizedTargetId,
  );

  if (!target) {
    throw createServiceError("Target was not found.", 404, "TARGET_NOT_FOUND");
  }

  const baselineScan =
    await scanRepository.findPreviousEligibleCompletedByTarget({
      ownerId: normalizedOwnerId,
      targetId: normalizedTargetId,
      comparisonScanId: normalizedComparisonScanId,
    });

  // The first eligible completed scan has no comparison baseline.
  if (!baselineScan) {
    return {
      compared: false,
      reason: "NO_PREVIOUS_COMPLETED_SCAN",
      comparisonScanId: normalizedComparisonScanId,
    };
  }

  if (
    !Number.isInteger(baselineScan.version) ||
    baselineScan.version >= comparisonScan.version
  ) {
    throw createServiceError(
      "The baseline scan is not older than the comparison scan.",
      409,
      "INVALID_COMPARISON_ORDER",
    );
  }

  const result = await compareScans({
    ownerId: normalizedOwnerId,
    scanId: baselineScan._id,
    otherScanId: normalizedComparisonScanId,
  });

  const saved = await scanComparisonRepository.upsertLatest({
    ownerId: normalizedOwnerId,
    targetId: normalizedTargetId,

    baselineScanId: result.baseline.scanId,
    comparisonScanId: result.comparison.scanId,

    baselineVersion: result.baseline.version,
    comparisonVersion: result.comparison.version,

    baselineCompletedAt: result.baseline.completedAt,
    comparisonCompletedAt: result.comparison.completedAt,

    scannerComparison: result.scannerComparison,
    summary: result.summary,
    findings: result.findings,
    comparedAt: new Date(),
  });

  return {
    compared: true,
    result: saved,
  };
};

/**
 * Retrieve the latest saved comparison for a target owned by the user.
 */
const getLatestComparisonResult = async ({ ownerId, targetId }) => {
  const normalizedOwnerId = assertObjectId(ownerId, "ownerId");
  const normalizedTargetId = assertObjectId(targetId, "targetId");

  const target = await targetRepository.findById(
    normalizedOwnerId,
    normalizedTargetId,
  );

  if (!target) {
    throw createServiceError("Target was not found.", 404, "TARGET_NOT_FOUND");
  }

  const result = await scanComparisonRepository.findLatestByTarget({
    ownerId: normalizedOwnerId,
    targetId: normalizedTargetId,
  });

  if (!result) {
    throw createServiceError(
      "No saved comparison is available for this target yet.",
      404,
      "COMPARISON_NOT_FOUND",
    );
  }

  return result;
};

/**
 * Return finding trends across eligible completed scans.
 *
 * Trends are independent of automatic comparison persistence.
 */
const getTargetTrends = async ({ ownerId, targetId, limit = 100 }) => {
  const normalizedOwnerId = assertObjectId(ownerId, "ownerId");
  const normalizedTargetId = assertObjectId(targetId, "targetId");

  const target = await targetRepository.findById(
    normalizedOwnerId,
    normalizedTargetId,
  );

  if (!target || !target.isActive) {
    throw createServiceError("Target was not found.", 404, "TARGET_NOT_FOUND");
  }

  const scans = await scanRepository.listEligibleCompletedByTarget(
    normalizedOwnerId,
    normalizedTargetId,
    { limit },
  );

  const trends = [];

  for (const scan of scans) {
    const scannerIds = getSuccessfulScannerIds(scan);

    const findings = await findingRepository.listByScan(
      normalizedOwnerId,
      scan._id,
      {
        limit: 1000,
        skip: 0,
      },
    );

    const eligibleFindings = getEligibleFindings(findings, scannerIds);

    const severityCounts = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      info: 0,
    };

    for (const finding of eligibleFindings) {
      if (Object.hasOwn(severityCounts, finding.severity)) {
        severityCounts[finding.severity] += 1;
      }
    }

    trends.push({
      scanId: scan._id,
      version: scan.version ?? null,
      completedAt: scan.completedAt,
      riskScore: scan.riskScore ?? null,
      comparableScannerCount: scannerIds.size,
      findingCounts: severityCounts,
      findingsIncluded: eligibleFindings.length,
    });
  }

  return {
    targetId: target._id,
    scans: trends,
    limitations: [
      "Only completed, non-deleted scans are included.",
      "Findings from scanners without a recorded successful outcome are excluded.",
      "Legacy scans without scanner outcome data cannot provide reliable resolution evidence.",
    ],
  };
};

export {
  compareScans,
  createAndPersistComparisonForScan,
  getLatestComparisonResult,
  getTargetTrends,
};
