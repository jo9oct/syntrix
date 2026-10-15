// STATUS: CREATED
// File: src/services/scanWorkerGuard.service.js

import * as scanRepository from "../database/repositories/scan.repository.js";

function createWorkerError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

/**
 * Load a scan without hiding deleted records.
 * Deleted status is authoritative, even if a BullMQ job still exists.
 */
export async function assertScanWritable({ ownerId, scanId }) {
  const scan = await scanRepository.findAnyById(ownerId, scanId);

  if (!scan) {
    throw createWorkerError("SCAN_NOT_FOUND", "The scan no longer exists.");
  }

  if (scan.status === "deleted") {
    throw createWorkerError(
      "SCAN_DELETED",
      "The scan was deleted and cannot be processed.",
    );
  }

  return scan;
}

/**
 * Only scanners that actually completed successfully are eligible
 * for comparison and resolution analysis.
 */
export function buildScannerOutcomes({ selection, scannerResults = [] }) {
  const selectedIds = [
    ...(selection?.recon || []),
    ...(selection?.security || []),
  ];

  const resultsById = new Map();

  for (const result of scannerResults) {
    if (result?.scannerId) {
      resultsById.set(result.scannerId, result);
    }
  }

  return selectedIds.map((scannerId) => {
    const result = resultsById.get(scannerId);

    let status = "pending";

    if (result?.status === "completed") {
      status = "completed";
    } else if (result?.status === "failed") {
      status = "failed";
    } else if (result?.status === "skipped") {
      status = "skipped";
    } else if (result?.status === "running") {
      status = "running";
    }

    return {
      scannerId,
      status,
      completedAt: status === "completed" ? new Date() : null,
      errorCode: status === "failed" ? result?.errorCode || null : null,
    };
  });
}

/**
 * Check the database again before a worker commits a terminal state.
 */
export async function assertScanCanFinish({ ownerId, scanId }) {
  const scan = await assertScanWritable({ ownerId, scanId });

  if (scan.status !== "running") {
    throw createWorkerError(
      "SCAN_STATE_CHANGED",
      `The scan cannot finish from status "${scan.status}".`,
    );
  }

  return scan;
}

export function isDeletedScanError(error) {
  return error?.code === "SCAN_DELETED";
}
