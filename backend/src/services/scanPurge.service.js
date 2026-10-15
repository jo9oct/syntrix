// STATUS: UPDATED
// File: src/services/scanPurge.service.js

import mongoose from "mongoose";

import * as scanRepository from "../database/repositories/scan.repository.js";
import * as findingRepository from "../database/repositories/finding.repository.js";
import * as fingerprintRepository from "../database/repositories/fingerprint.repository.js";
import * as evidenceRepository from "../database/repositories/evidence.repository.js";
import * as verificationRepository from "../database/repositories/verification.repository.js";
import * as aiAnalysisRepository from "../database/repositories/aiAnalysis.repository.js";
import * as crawlDataRepository from "../database/repositories/crawlData.repository.js";
import * as crawlPageRepository from "../database/repositories/crawlPage.repository.js";
import * as reportRepository from "../database/repositories/report.repository.js";

import environment from "../config/environment.js";
import { removeStoredReport } from "../reports/reportStorage.js";

const PURGE_LEASE_MS = 5 * 60 * 1000;
const RECOVERY_WINDOW_MS = 90 * 24 * 60 * 60 * 1000;
const REPORT_BATCH_SIZE = 100;

const createPurgeError = (message, code, statusCode = 500) => {
  const error = new Error(message);
  error.code = code;
  error.statusCode = statusCode;
  return error;
};

const toId = (value) => value?.toString?.() ?? String(value);

const isValidObjectId = (value) => mongoose.isValidObjectId(value);

const normalizeFolder = () =>
  environment.cloudinary.folder
    ?.trim()
    .replace(/^\/+/, "")
    .replace(/\/+$/, "") ?? "";

const getExpectedReportPublicId = ({ ownerId, scanId, reportId }) =>
  `${toId(ownerId)}/${toId(scanId)}/${toId(reportId)}`;

const validateReportForPurge = ({ report, ownerId, scanId }) => {
  if (
    !report ||
    toId(report.ownerId) !== toId(ownerId) ||
    toId(report.scanId) !== toId(scanId)
  ) {
    throw createPurgeError(
      "A report failed ownership validation during scan purge.",
      "SCAN_PURGE_REPORT_OWNERSHIP_MISMATCH",
    );
  }

  const publicId = report.storagePublicId;

  if (publicId === null || publicId === undefined || publicId === "") {
    return null;
  }

  if (typeof publicId !== "string" || publicId.trim() !== publicId) {
    throw createPurgeError(
      "A report has an invalid storage identifier.",
      "SCAN_PURGE_INVALID_STORAGE_ID",
    );
  }

  const expectedPublicId = getExpectedReportPublicId({
    ownerId,
    scanId,
    reportId: report._id,
  });

  const configuredFolder = normalizeFolder();

  const allowedPublicIds = new Set([
    expectedPublicId,
    ...(configuredFolder ? [`${configuredFolder}/${expectedPublicId}`] : []),
  ]);

  if (!allowedPublicIds.has(publicId)) {
    throw createPurgeError(
      "A report storage identifier did not match its expected scan-owned path.",
      "SCAN_PURGE_REPORT_STORAGE_MISMATCH",
    );
  }

  // Pass the canonical ID to removeStoredReport. The Cloudinary
  // deleter applies the configured folder consistently.
  return expectedPublicId;
};

const renewClaimOrThrow = async ({ ownerId, scanId, purgeToken }) => {
  const claimedScan = await scanRepository.renewPurgeClaim({
    ownerId,
    scanId,
    purgeToken,
    leaseMs: PURGE_LEASE_MS,
  });

  if (!claimedScan) {
    throw createPurgeError(
      "The scan purge claim was lost. Further cleanup has stopped.",
      "SCAN_PURGE_CLAIM_LOST",
      409,
    );
  }

  return claimedScan;
};

const requireRepositoryMethod = (repository, methodName, repositoryName) => {
  if (typeof repository[methodName] !== "function") {
    throw createPurgeError(
      `${repositoryName}.${methodName}() must be implemented before scan purging can run.`,
      "SCAN_PURGE_REPOSITORY_METHOD_MISSING",
    );
  }
};

const loadAndValidateReports = async ({ ownerId, scanId, purgeToken }) => {
  requireRepositoryMethod(reportRepository, "listByScan", "reportRepository");

  const validatedReports = [];
  let skip = 0;

  while (true) {
    await renewClaimOrThrow({
      ownerId,
      scanId,
      purgeToken,
    });

    const batch = await reportRepository.listByScan(ownerId, scanId, {
      limit: REPORT_BATCH_SIZE,
      skip,
    });

    if (!Array.isArray(batch)) {
      throw createPurgeError(
        "Report repository returned an invalid result.",
        "SCAN_PURGE_INVALID_REPORT_RESULT",
      );
    }

    for (const report of batch) {
      validatedReports.push({
        publicId: validateReportForPurge({
          report,
          ownerId,
          scanId,
        }),
      });
    }

    if (batch.length < REPORT_BATCH_SIZE) {
      break;
    }

    skip += batch.length;
  }

  return validatedReports;
};

const cleanupStages = [
  {
    repository: reportRepository,
    method: "deleteByScan",
    name: "reportRepository",
  },
  {
    repository: findingRepository,
    method: "deleteByScan",
    name: "findingRepository",
  },
  {
    repository: fingerprintRepository,
    method: "deleteByScan",
    name: "fingerprintRepository",
  },
  {
    repository: evidenceRepository,
    method: "deleteByScan",
    name: "evidenceRepository",
  },
  {
    repository: verificationRepository,
    method: "deleteByScan",
    name: "verificationRepository",
  },
  {
    repository: aiAnalysisRepository,
    method: "deleteByScan",
    name: "aiAnalysisRepository",
  },
  {
    repository: crawlPageRepository,
    method: "deleteByScan",
    name: "crawlPageRepository",
  },
  {
    repository: crawlDataRepository,
    method: "deleteByScan",
    name: "crawlDataRepository",
  },
];

export async function purgeDeletedScan({ ownerId, scanId }) {
  if (
    !ownerId ||
    !scanId ||
    !isValidObjectId(ownerId) ||
    !isValidObjectId(scanId)
  ) {
    throw createPurgeError(
      "Valid ownerId and scanId values are required.",
      "SCAN_PURGE_INVALID_ARGUMENTS",
      400,
    );
  }

  const scan = await scanRepository.findAnyById(ownerId, scanId);

  if (!scan) {
    return {
      status: "not_found",
      scanId: toId(scanId),
    };
  }

  if (
    scan.status !== "deleted" ||
    !scan.deletedAt ||
    Number.isNaN(new Date(scan.deletedAt).getTime())
  ) {
    return {
      status: "not_eligible",
      scanId: toId(scanId),
    };
  }

  const cutoff = Date.now() - RECOVERY_WINDOW_MS;

  if (new Date(scan.deletedAt).getTime() > cutoff) {
    return {
      status: "not_expired",
      scanId: toId(scanId),
    };
  }

  const claimedScan = await scanRepository.claimExpiredScanForPurge({
    ownerId,
    scanId,
    leaseMs: PURGE_LEASE_MS,
  });

  if (!claimedScan?.purgeToken) {
    return {
      status: "claim_unavailable",
      scanId: toId(scanId),
    };
  }

  const purgeToken = claimedScan.purgeToken;

  try {
    // Validate every report before deleting external assets.
    const reports = await loadAndValidateReports({
      ownerId,
      scanId,
      purgeToken,
    });

    for (const { publicId } of reports) {
      if (!publicId) {
        continue;
      }

      await renewClaimOrThrow({
        ownerId,
        scanId,
        purgeToken,
      });

      // "not found" is safe to treat as already deleted.
      // The deleter must throw for other unconfirmed results.
      await removeStoredReport({ publicId });

      await renewClaimOrThrow({
        ownerId,
        scanId,
        purgeToken,
      });
    }

    // Every deletion is scoped to both owner and scan.
    for (const stage of cleanupStages) {
      requireRepositoryMethod(stage.repository, stage.method, stage.name);

      await renewClaimOrThrow({
        ownerId,
        scanId,
        purgeToken,
      });

      await stage.repository[stage.method](ownerId, scanId);

      await renewClaimOrThrow({
        ownerId,
        scanId,
        purgeToken,
      });
    }

    await renewClaimOrThrow({
      ownerId,
      scanId,
      purgeToken,
    });

    const deletedScan = await scanRepository.deletePurgedScan({
      ownerId,
      scanId,
      purgeToken,
    });

    if (!deletedScan) {
      throw createPurgeError(
        "Permanent deletion was rejected because the scan changed state, expired, or the purge claim was lost.",
        "SCAN_PURGE_FINAL_DELETE_REJECTED",
        409,
      );
    }

    return {
      status: "purged",
      scanId: toId(scanId),
    };
  } catch (error) {
    // Best-effort release. Never replace the original error.
    try {
      await scanRepository.releasePurgeClaim({
        ownerId,
        scanId,
        purgeToken,
      });
    } catch {
      // The claim lease can expire naturally.
    }

    throw error;
  }
}

export default {
  purgeDeletedScan,
};
