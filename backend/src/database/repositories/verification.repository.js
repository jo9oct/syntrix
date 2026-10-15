// STATUS: UPDATED
// File: src/database/repositories/verification.repository.js

import Verification from "../models/verification.model.js";
import Scan from "../models/scan.model.js";

const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 1000;
const MAX_SKIP = 100000;

const WRITABLE_SCAN_STATUSES = ["pending", "running"];

const normalizePagination = (limit, skip, defaultLimit = DEFAULT_LIMIT) => {
  const normalizedLimit = limit === undefined ? defaultLimit : Number(limit);

  const normalizedSkip = skip === undefined ? 0 : Number(skip);

  if (
    !Number.isInteger(normalizedLimit) ||
    normalizedLimit < 1 ||
    normalizedLimit > MAX_LIMIT
  ) {
    throw new RangeError(
      `limit must be an integer between 1 and ${MAX_LIMIT}.`,
    );
  }

  if (
    !Number.isInteger(normalizedSkip) ||
    normalizedSkip < 0 ||
    normalizedSkip > MAX_SKIP
  ) {
    throw new RangeError(`skip must be an integer between 0 and ${MAX_SKIP}.`);
  }

  return {
    limit: normalizedLimit,
    skip: normalizedSkip,
  };
};

const assertScanScope = (ownerId, scanId) => {
  if (!ownerId || !scanId) {
    throw new TypeError("ownerId and scanId are required.");
  }
};

const assertWritableScan = async (ownerId, scanId) => {
  const scanExists = await Scan.exists({
    _id: scanId,
    ownerId,
    status: { $in: WRITABLE_SCAN_STATUSES },
  });

  if (!scanExists) {
    const error = new Error(
      "Cannot create verification records for a missing, deleted, or inactive scan.",
    );

    error.code = "SCAN_NOT_WRITABLE";
    error.statusCode = 409;

    throw error;
  }
};

const create = async (data) => {
  assertScanScope(data?.ownerId, data?.scanId);

  await assertWritableScan(data.ownerId, data.scanId);

  return Verification.create(data);
};

const createMany = async (documents) => {
  if (!Array.isArray(documents) || documents.length === 0) {
    return [];
  }

  const scanGroups = new Map();

  for (const document of documents) {
    assertScanScope(document?.ownerId, document?.scanId);

    const key = `${document.ownerId}:${document.scanId}`;

    if (!scanGroups.has(key)) {
      scanGroups.set(key, {
        ownerId: document.ownerId,
        scanId: document.scanId,
      });
    }
  }

  for (const group of scanGroups.values()) {
    await assertWritableScan(group.ownerId, group.scanId);
  }

  return Verification.insertMany(documents, {
    ordered: false,
  });
};

const findById = async (ownerId, verificationId) => {
  if (!ownerId || !verificationId) {
    throw new TypeError("ownerId and verificationId are required.");
  }

  return Verification.findOne({
    _id: verificationId,
    ownerId,
  }).lean();
};

const listByFinding = async (ownerId, findingId, options = {}) => {
  if (!ownerId || !findingId) {
    throw new TypeError("ownerId and findingId are required.");
  }

  const pagination = normalizePagination(options.limit, options.skip);

  return Verification.find({
    ownerId,
    findingId,
  })
    .sort({ createdAt: -1, _id: -1 })
    .skip(pagination.skip)
    .limit(pagination.limit)
    .lean();
};

const listByScan = async (ownerId, scanId, options = {}) => {
  assertScanScope(ownerId, scanId);

  const pagination = normalizePagination(options.limit, options.skip, 500);

  return Verification.find({
    ownerId,
    scanId,
  })
    .sort({ createdAt: -1, _id: -1 })
    .skip(pagination.skip)
    .limit(pagination.limit)
    .lean();
};

/*
 * Permanent deletion for the validated scan-purge workflow.
 * Both ownerId and scanId are mandatory.
 */
const deleteByScan = async (ownerId, scanId) => {
  assertScanScope(ownerId, scanId);

  return Verification.deleteMany({
    ownerId,
    scanId,
  });
};

const deleteByOwnerId = async (ownerId) => {
  if (!ownerId) {
    throw new TypeError("ownerId is required.");
  }

  return Verification.deleteMany({ ownerId });
};

export {
  create,
  createMany,
  findById,
  listByFinding,
  listByScan,
  deleteByScan,
  deleteByOwnerId,
};
