// STATUS: UPDATED
// File: src/database/repositories/finding.repository.js

import Finding from "../models/finding.model.js";
import Scan from "../models/scan.model.js";

const WRITABLE_SCAN_STATUSES = ["pending", "running"];

const UPDATEABLE_SCAN_STATUSES = ["pending", "running", "completed"];

const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 1000;
const MAX_SKIP = 100000;

const assertScanScope = (ownerId, scanId) => {
  if (!ownerId || !scanId) {
    throw new TypeError("ownerId and scanId are required.");
  }
};

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

const assertWritableScan = async (ownerId, scanId) => {
  const scanExists = await Scan.exists({
    _id: scanId,
    ownerId,
    status: { $in: WRITABLE_SCAN_STATUSES },
  });

  if (!scanExists) {
    const error = new Error(
      "Cannot write findings for a missing, deleted, or inactive scan.",
    );

    error.code = "SCAN_NOT_WRITABLE";
    error.statusCode = 409;

    throw error;
  }
};

const findWritableFinding = async (ownerId, findingId) => {
  const finding = await Finding.findOne({
    _id: findingId,
    ownerId,
  })
    .select({ scanId: 1 })
    .lean();

  if (!finding) return null;

  const scanExists = await Scan.exists({
    _id: finding.scanId,
    ownerId,
    status: { $in: UPDATEABLE_SCAN_STATUSES },
  });

  if (!scanExists) return null;

  return finding;
};

const create = async (data) => {
  if (!data?.ownerId || !data?.scanId) {
    throw new TypeError("ownerId and scanId are required to create a finding.");
  }

  await assertWritableScan(data.ownerId, data.scanId);

  return Finding.create(data);
};

const createMany = async (documents, options = {}) => {
  if (!Array.isArray(documents) || documents.length === 0) {
    return [];
  }

  const scanGroups = new Map();

  for (const document of documents) {
    if (!document?.ownerId || !document?.scanId) {
      throw new TypeError("Every finding requires ownerId and scanId.");
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

  return Finding.insertMany(documents, {
    ordered: false,
    ...options,
  });
};

const findById = async (ownerId, findingId) =>
  Finding.findOne({
    _id: findingId,
    ownerId,
  }).lean();

const findByFingerprint = async (ownerId, scanId, fingerprint) => {
  assertScanScope(ownerId, scanId);

  return Finding.findOne({
    ownerId,
    scanId,
    fingerprint,
  }).lean();
};

const listByScan = async (ownerId, scanId, options = {}) => {
  assertScanScope(ownerId, scanId);

  const { severity, confidence, status, scannerId, limit, skip } = options;

  const pagination = normalizePagination(limit, skip);

  const filter = { ownerId, scanId };

  if (severity) filter.severity = severity;
  if (confidence) filter.confidence = confidence;
  if (status) filter.status = status;
  if (scannerId) filter.scannerId = scannerId;

  return Finding.find(filter)
    .sort({ createdAt: -1, _id: -1 })
    .skip(pagination.skip)
    .limit(pagination.limit)
    .lean();
};

const list = async (ownerId, options = {}) => {
  if (!ownerId) {
    throw new TypeError("ownerId is required.");
  }

  const { scanId, severity, confidence, status, scannerId, limit, skip } =
    options;

  const pagination = normalizePagination(limit, skip);
  const filter = { ownerId };

  if (scanId) filter.scanId = scanId;
  if (severity) filter.severity = severity;
  if (confidence) filter.confidence = confidence;
  if (status) filter.status = status;
  if (scannerId) filter.scannerId = scannerId;

  return Finding.find(filter)
    .sort({ createdAt: -1, _id: -1 })
    .skip(pagination.skip)
    .limit(pagination.limit)
    .lean();
};

const addEvidenceId = async (ownerId, findingId, evidenceId) => {
  const finding = await findWritableFinding(ownerId, findingId);

  if (!finding) return null;

  return Finding.findOneAndUpdate(
    {
      _id: findingId,
      ownerId,
      scanId: finding.scanId,
    },
    {
      $addToSet: {
        evidenceIds: evidenceId,
      },
    },
    {
      new: true,
      runValidators: true,
    },
  ).lean();
};

const update = async (ownerId, findingId, updates) => {
  const finding = await findWritableFinding(ownerId, findingId);

  if (!finding) return null;

  const safeUpdates = { ...updates };

  for (const field of [
    "_id",
    "ownerId",
    "scanId",
    "createdAt",
    "updatedAt",
    "fingerprint",
  ]) {
    delete safeUpdates[field];
  }

  return Finding.findOneAndUpdate(
    {
      _id: findingId,
      ownerId,
      scanId: finding.scanId,
    },
    {
      $set: safeUpdates,
    },
    {
      new: true,
      runValidators: true,
    },
  ).lean();
};

const updateStatus = async (ownerId, findingId, status) => {
  const finding = await findWritableFinding(ownerId, findingId);

  if (!finding) return null;

  return Finding.findOneAndUpdate(
    {
      _id: findingId,
      ownerId,
      scanId: finding.scanId,
    },
    {
      $set: {
        status,
        lastDetectedAt: new Date(),
      },
    },
    {
      new: true,
      runValidators: true,
    },
  ).lean();
};

const updateVerification = async (
  ownerId,
  findingId,
  verificationId,
  verificationStatus,
  status,
) => {
  const finding = await findWritableFinding(ownerId, findingId);

  if (!finding) return null;

  return Finding.findOneAndUpdate(
    {
      _id: findingId,
      ownerId,
      scanId: finding.scanId,
    },
    {
      $set: {
        verificationId,
        verificationStatus,
        status,
        lastDetectedAt: new Date(),
      },
    },
    {
      new: true,
      runValidators: true,
    },
  ).lean();
};

const countBySeverity = async (ownerId, scanId) => {
  assertScanScope(ownerId, scanId);

  return Finding.aggregate([
    {
      $match: { ownerId, scanId },
    },
    {
      $group: {
        _id: "$severity",
        count: { $sum: 1 },
      },
    },
  ]);
};

const countByStatus = async (ownerId, scanId) => {
  assertScanScope(ownerId, scanId);

  return Finding.aggregate([
    {
      $match: { ownerId, scanId },
    },
    {
      $group: {
        _id: "$status",
        count: { $sum: 1 },
      },
    },
  ]);
};

/*
 * Permanent deletion for the validated scan-purge workflow only.
 * Never delete by scanId alone.
 */
const deleteByScan = async (ownerId, scanId) => {
  assertScanScope(ownerId, scanId);

  return Finding.deleteMany({
    ownerId,
    scanId,
  });
};

const deleteByOwnerId = async (ownerId) => {
  if (!ownerId) {
    throw new TypeError("ownerId is required.");
  }

  return Finding.deleteMany({ ownerId });
};

export {
  create,
  createMany,
  findById,
  findByFingerprint,
  list,
  listByScan,
  addEvidenceId,
  update,
  updateStatus,
  updateVerification,
  countBySeverity,
  countByStatus,
  deleteByScan,
  deleteByOwnerId,
};
