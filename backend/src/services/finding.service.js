// STATUS: CREATED

import mongoose from "mongoose";

import * as findingRepository from "../database/repositories/finding.repository.js";
import * as scanRepository from "../database/repositories/scan.repository.js";

const createServiceError = (code, message, statusCode) => {
  const error = new Error(message);

  error.code = code;
  error.statusCode = statusCode;

  return error;
};

const assertOwnerId = (ownerId) => {
  if (!ownerId) {
    throw createServiceError("OWNER_ID_REQUIRED", "Owner ID is required.", 401);
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

const assertFindingId = (findingId) => {
  if (!findingId) {
    throw createServiceError(
      "FINDING_ID_REQUIRED",
      "Finding ID is required.",
      400,
    );
  }

  if (!mongoose.isValidObjectId(findingId)) {
    throw createServiceError(
      "INVALID_FINDING_ID",
      "Finding ID must be a valid ObjectId.",
      400,
    );
  }

  return new mongoose.Types.ObjectId(findingId);
};

const assertOptionalObjectId = (value, code, message) => {
  if (
    value !== undefined &&
    value !== null &&
    !mongoose.isValidObjectId(value)
  ) {
    throw createServiceError(code, message, 400);
  }

  if (value === undefined || value === null) {
    return value;
  }

  return new mongoose.Types.ObjectId(value);
};

const listFindings = async ({
  ownerId,
  scanId,
  severity,
  confidence,
  status,
  scannerId,
  limit = 100,
  skip = 0,
}) => {
  let normalizedOwnerId = assertOwnerId(ownerId);

  const normalizedScanId = assertOptionalObjectId(
    scanId,
    "INVALID_SCAN_ID",
    "Scan ID must be a valid ObjectId.",
  );

  // If a scanId is provided, resolve the scan's actual ownerId so guest sessions never miss findings
  if (normalizedScanId) {
    const scan = await scanRepository.findByIdOnly(normalizedScanId);
    if (scan && scan.ownerId) {
      normalizedOwnerId = scan.ownerId;
    }
  }

  return findingRepository.list(normalizedOwnerId, {
    scanId: normalizedScanId,

    severity,

    confidence,

    status,

    scannerId,

    limit,

    skip,
  });
};

const getFinding = async ({ ownerId, findingId }) => {
  const normalizedOwnerId = assertOwnerId(ownerId);

  const normalizedFindingId = assertFindingId(findingId);

  const finding = await findingRepository.findById(
    normalizedOwnerId,
    normalizedFindingId,
  );

  if (!finding) {
    throw createServiceError(
      "FINDING_NOT_FOUND",
      "Finding was not found.",
      404,
    );
  }

  return finding;
};

const updateFinding = async ({ ownerId, findingId, status, remediation }) => {
  const normalizedOwnerId = assertOwnerId(ownerId);

  const normalizedFindingId = assertFindingId(findingId);

  const updates = {};

  if (status !== undefined) {
    updates.status = status;
  }

  if (remediation !== undefined) {
    updates.remediation = remediation;
  }

  if (Object.keys(updates).length === 0) {
    throw createServiceError(
      "FINDING_UPDATE_EMPTY",
      "At least one finding field must be provided.",
      400,
    );
  }

  const finding = await findingRepository.update(
    normalizedOwnerId,
    normalizedFindingId,
    updates,
  );

  if (!finding) {
    throw createServiceError(
      "FINDING_NOT_FOUND",
      "Finding was not found.",
      404,
    );
  }

  return finding;
};

export { listFindings, getFinding, updateFinding };
