// STATUS: CREATED
// File: src/services/scanLifecycle.service.js

import mongoose from "mongoose";
import { scanQueue } from "../config/queue.js";
import * as scanRepository from "../database/repositories/scan.repository.js";
import * as targetRepository from "../database/repositories/target.repository.js";

const RECOVERY_WINDOW_MS = 90 * 24 * 60 * 60 * 1000;

function createServiceError(statusCode, code, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

function normalizeOwnerId(ownerId) {
  if (!mongoose.isValidObjectId(ownerId)) {
    throw createServiceError(400, "INVALID_OWNER_ID", "Invalid owner ID.");
  }

  return new mongoose.Types.ObjectId(ownerId);
}

function normalizeScanId(scanId) {
  if (!mongoose.isValidObjectId(scanId)) {
    throw createServiceError(400, "INVALID_SCAN_ID", "Invalid scan ID.");
  }

  return new mongoose.Types.ObjectId(scanId);
}

function getRestorableStatus(scan) {
  const previousStatus = scan.previousStatus;

  if (
    previousStatus === "completed" ||
    previousStatus === "failed" ||
    previousStatus === "cancelled"
  ) {
    return previousStatus;
  }

  const deletionEntry = [...(scan.statusHistory || [])]
    .reverse()
    .find((entry) => entry.to === "deleted");

  const statusBeforeDeletion = deletionEntry?.from;

  if (
    statusBeforeDeletion === "completed" ||
    statusBeforeDeletion === "failed" ||
    statusBeforeDeletion === "cancelled"
  ) {
    return statusBeforeDeletion;
  }

  // Pending and running scans must be restored as pending, never as running.
  return "pending";
}

async function enqueueRecoveredScan(scan, ownerId, isGuest) {
  const target = await targetRepository.findById(ownerId, scan.targetId);

  if (!target) {
    throw createServiceError(
      409,
      "RECOVERY_TARGET_NOT_FOUND",
      "The scan was recovered, but its target could not be found for requeueing.",
    );
  }

  const payload = {
    scanId: String(scan._id),
    ownerId: String(ownerId),
    targetId: String(scan.targetId),
    target: {
      url: scan.targetUrl || target.url,
      hostname: target.hostname,
      normalizedUrl: target.normalizedUrl,
    },
    selection: scan.scanSelection,
    companyRuleIds: scan.companyRuleIds || [],
    options: {},
    credentialReference: null,
    isGuest: Boolean(isGuest),
  };

  // STATUS: UPDATED
  // Preserve the same job ID convention used by scan.service.js.
  await scanQueue.add("security-scan", payload, {
    jobId: String(scan._id),
  });
}

/**
 * Soft-delete a scan. MongoDB records and Cloudinary artifacts are retained
 * during the 90-day recovery window.
 */
export async function deleteScan({ ownerId, scanId }) {
  const normalizedOwnerId = normalizeOwnerId(ownerId);
  const normalizedScanId = normalizeScanId(scanId);

  const existing = await scanRepository.findAnyById(
    normalizedOwnerId,
    normalizedScanId,
  );

  if (!existing) {
    throw createServiceError(404, "SCAN_NOT_FOUND", "Scan not found.");
  }

  if (existing.status === "deleted") {
    // Idempotent: do not reset deletedAt or append duplicate history.
    return { scan: existing, duplicated: true };
  }

  if (existing.status === "running" || existing.status === "pending") {
    // The database status is authoritative. Queue removal is best-effort.
    try {
      const job = await scanQueue.getJob(String(normalizedScanId));
      if (job) {
        await job.remove();
      }
    } catch {
      // The worker must still respect the deleted database status.
    }
  }

  const scan = await scanRepository.softDelete(
    normalizedOwnerId,
    normalizedScanId,
  );

  if (!scan) {
    const latest = await scanRepository.findAnyById(
      normalizedOwnerId,
      normalizedScanId,
    );

    if (latest?.status === "deleted") {
      return { scan: latest, duplicated: true };
    }

    throw createServiceError(
      409,
      "SCAN_DELETE_CONFLICT",
      "The scan changed while it was being deleted. Please retry.",
    );
  }

  // Schedule purge relative to deletedAt, not createdAt.
  const delay = Math.max(
    0,
    new Date(scan.deletedAt).getTime() + RECOVERY_WINDOW_MS - Date.now(),
  );

  try {
    const { cleanupQueue } = await import("../config/queue.js");

    await cleanupQueue.add(
      "security-cleanup",
      {
        type: "scan-purge",
        ownerId: String(normalizedOwnerId),
        scanId: String(normalizedScanId),
        deletedAt: new Date(scan.deletedAt).toISOString(),
      },
      {
        jobId: `purge-scan:${normalizedScanId}`,
        delay,
      },
    );
  } catch (error) {
    // Deletion remains valid even if delayed purge scheduling fails.
    // A periodic cleanup/reconciliation job should repair missed schedules.
    console.error("Failed to schedule scan purge:", error.message);
  }

  return { scan, duplicated: false };
}

/**
 * Restore a soft-deleted scan. Pending work is requeued after restoration.
 */
export async function recoverScan({ ownerId, scanId, isGuest = false }) {
  const normalizedOwnerId = normalizeOwnerId(ownerId);
  const normalizedScanId = normalizeScanId(scanId);

  const existing = await scanRepository.findAnyById(
    normalizedOwnerId,
    normalizedScanId,
  );

  if (!existing) {
    throw createServiceError(404, "SCAN_NOT_FOUND", "Scan not found.");
  }

  // Allow retries to repair a failed queue operation after the DB recovery.
  if (existing.status !== "deleted") {
    if (existing.status === "pending") {
      await enqueueRecoveredScan(existing, normalizedOwnerId, isGuest);
    }

    return { scan: existing, duplicated: true };
  }

  const deletedAt = existing.deletedAt
    ? new Date(existing.deletedAt).getTime()
    : 0;

  if (!deletedAt || deletedAt < Date.now() - RECOVERY_WINDOW_MS) {
    throw createServiceError(
      410,
      "SCAN_RECOVERY_EXPIRED",
      "The scan is outside the 90-day recovery window.",
    );
  }

  const restoreStatus = getRestorableStatus(existing);

  const scan = await scanRepository.recoverDeleted(
    normalizedOwnerId,
    normalizedScanId,
    restoreStatus,
  );

  if (!scan) {
    throw createServiceError(
      409,
      "SCAN_RECOVERY_CONFLICT",
      "The scan could not be recovered. It may have been purged or changed.",
    );
  }

  if (scan.status === "pending") {
    await enqueueRecoveredScan(scan, normalizedOwnerId, isGuest);
  }

  return { scan, duplicated: false };
}

/**
 * List only the current owner's soft-deleted scans.
 */
export async function listDeletedScans({ ownerId, limit = 50, skip = 0 }) {
  const normalizedOwnerId = normalizeOwnerId(ownerId);

  const scans = await scanRepository.listDeleted(normalizedOwnerId, {
    limit,
    skip,
  });

  return {
    scans,
    pagination: {
      limit,
      skip,
      count: scans.length,
    },
  };
}
