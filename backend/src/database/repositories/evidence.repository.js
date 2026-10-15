// STATUS: UPDATED
// File: src/database/repositories/evidence.repository.js

import Evidence from "../models/evidence.model.js";
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
      "Cannot write evidence for a missing, deleted, or inactive scan.",
    );

    error.code = "SCAN_NOT_WRITABLE";
    error.statusCode = 409;

    throw error;
  }
};

const create = async (data) => {
  assertScanScope(data?.ownerId, data?.scanId);

  await assertWritableScan(data.ownerId, data.scanId);

  return Evidence.create(data);
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

  return Evidence.insertMany(documents, {
    ordered: false,
  });
};

const findById = async (ownerId, evidenceId) => {
  if (!ownerId || !evidenceId) {
    throw new TypeError("ownerId and evidenceId are required.");
  }

  return Evidence.findOne({
    _id: evidenceId,
    ownerId,
  }).lean();
};

const findByFingerprint = async ({
  ownerId,
  scanId,
  findingId,
  fingerprint,
}) => {
  assertScanScope(ownerId, scanId);

  if (typeof fingerprint !== "string" || !fingerprint.trim()) {
    throw new TypeError("A valid fingerprint is required.");
  }

  return Evidence.findOne({
    ownerId,
    scanId,
    findingId: findingId ?? null,
    fingerprint,
  }).lean();
};

const upsertByFingerprint = async ({ evidence }) => {
  assertScanScope(evidence?.ownerId, evidence?.scanId);

  if (
    typeof evidence.fingerprint !== "string" ||
    !evidence.fingerprint.trim()
  ) {
    throw new TypeError(
      "Evidence ownerId, scanId, and fingerprint are required.",
    );
  }

  await assertWritableScan(evidence.ownerId, evidence.scanId);

  const filter = {
    ownerId: evidence.ownerId,
    scanId: evidence.scanId,
    findingId: evidence.findingId ?? null,
    fingerprint: evidence.fingerprint,
  };

  try {
    return await Evidence.findOneAndUpdate(
      filter,
      {
        $setOnInsert: evidence,
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
        runValidators: true,
      },
    ).lean();
  } catch (error) {
    if (error?.code !== 11000) {
      throw error;
    }

    const existingEvidence = await Evidence.findOne(filter).lean();

    if (existingEvidence) {
      return existingEvidence;
    }

    throw error;
  }
};

const listByFinding = async (ownerId, findingId, options = {}) => {
  if (!ownerId || !findingId) {
    throw new TypeError("ownerId and findingId are required.");
  }

  const { type, scannerId, limit, skip } = options;

  const pagination = normalizePagination(limit, skip);
  const filter = { ownerId, findingId };

  if (type) filter.type = type;
  if (scannerId) filter.scannerId = scannerId;

  return Evidence.find(filter)
    .sort({ createdAt: -1, _id: -1 })
    .skip(pagination.skip)
    .limit(pagination.limit)
    .lean();
};

const listByScan = async (ownerId, scanId, options = {}) => {
  assertScanScope(ownerId, scanId);

  const { type, scannerId, findingId, limit, skip } = options;

  const pagination = normalizePagination(limit, skip, 500);

  const filter = { ownerId, scanId };

  if (type) filter.type = type;
  if (scannerId) filter.scannerId = scannerId;
  if (findingId) filter.findingId = findingId;

  return Evidence.find(filter)
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

  return Evidence.deleteMany({
    ownerId,
    scanId,
  });
};

const deleteByOwnerId = async (ownerId) => {
  if (!ownerId) {
    throw new TypeError("ownerId is required.");
  }

  return Evidence.deleteMany({ ownerId });
};

export {
  create,
  createMany,
  findById,
  findByFingerprint,
  upsertByFingerprint,
  listByFinding,
  listByScan,
  deleteByScan,
  deleteByOwnerId,
};
