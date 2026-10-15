// STATUS: UPDATED
// File: src/database/repositories/fingerprint.repository.js

import Fingerprint from "../models/fingerprint.model.js";
import Scan from "../models/scan.model.js";

const DEFAULT_LIMIT = 500;
const MAX_LIMIT = 1000;
const MAX_SKIP = 100000;

const WRITABLE_SCAN_STATUSES = ["pending", "running"];

const normalizePagination = (limit, skip) => {
  const normalizedLimit = limit === undefined ? DEFAULT_LIMIT : Number(limit);

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
      "Cannot write fingerprints for a missing, deleted, or inactive scan.",
    );

    error.code = "SCAN_NOT_WRITABLE";
    error.statusCode = 409;

    throw error;
  }
};

const create = async (data) => {
  if (!data?.ownerId || !data?.scanId) {
    throw new TypeError(
      "ownerId and scanId are required to create a fingerprint.",
    );
  }

  await assertWritableScan(data.ownerId, data.scanId);

  return Fingerprint.create(data);
};

const createMany = async (documents) => {
  if (!Array.isArray(documents) || documents.length === 0) {
    return [];
  }

  const scanGroups = new Map();

  for (const document of documents) {
    if (!document?.ownerId || !document?.scanId) {
      throw new TypeError("Every fingerprint requires ownerId and scanId.");
    }

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

  return Fingerprint.insertMany(documents, {
    ordered: false,
  });
};

const findById = async (ownerId, fingerprintId) => {
  if (!ownerId || !fingerprintId) {
    throw new TypeError("ownerId and fingerprintId are required.");
  }

  return Fingerprint.findOne({
    _id: fingerprintId,
    ownerId,
  }).lean();
};

const listByTarget = async (ownerId, targetId, options = {}) => {
  if (!ownerId || !targetId) {
    throw new TypeError("ownerId and targetId are required.");
  }

  const { limit, skip } = normalizePagination(options.limit, options.skip);

  return Fingerprint.find({
    ownerId,
    targetId,
  })
    .sort({ createdAt: -1, _id: -1 })
    .skip(skip)
    .limit(limit)
    .lean();
};

const listByScan = async (ownerId, scanId, options = {}) => {
  assertScanScope(ownerId, scanId);

  const { limit, skip } = normalizePagination(options.limit, options.skip);

  return Fingerprint.find({
    ownerId,
    scanId,
  })
    .sort({ createdAt: -1, _id: -1 })
    .skip(skip)
    .limit(limit)
    .lean();
};

/*
 * Permanent deletion for the validated scan-purge workflow.
 * Both ownerId and scanId are mandatory.
 */
const deleteByScan = async (ownerId, scanId) => {
  assertScanScope(ownerId, scanId);

  return Fingerprint.deleteMany({
    ownerId,
    scanId,
  });
};

const deleteByOwnerId = async (ownerId) => {
  if (!ownerId) {
    throw new TypeError("ownerId is required.");
  }

  return Fingerprint.deleteMany({ ownerId });
};

export {
  create,
  createMany,
  findById,
  listByTarget,
  listByScan,
  deleteByScan,
  deleteByOwnerId,
};
