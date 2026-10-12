// STATUS: UPDATED

import Evidence from '../models/evidence.model.js';

const create = async (data) =>
  Evidence.create(data);

const createMany = async (
  documents,
) => {
  if (
    !Array.isArray(documents) ||
    documents.length === 0
  ) {
    return [];
  }

  return Evidence.insertMany(
    documents,
    {
      ordered: false,
    },
  );
};

const findById = async (
  ownerId,
  evidenceId,
) =>
  Evidence.findOne({
    _id: evidenceId,
    ownerId,
  }).lean();

const findByFingerprint = async ({
  ownerId,
  scanId,
  findingId,
  fingerprint,
}) =>
  Evidence.findOne({
    ownerId,
    scanId,
    findingId,
    fingerprint,
  }).lean();

/**
 * Atomically reuse an existing evidence record or create it.
 *
 * The fingerprint must be stable and specific to the evidence
 * observation. The filter also scopes the record to its owner,
 * scan, and finding.
 */
const upsertByFingerprint = async ({
  evidence,
}) => {
  if (
    !evidence?.ownerId ||
    !evidence?.scanId ||
    typeof evidence?.fingerprint !== 'string' ||
    !evidence.fingerprint.trim()
  ) {
    throw new TypeError(
      'Evidence ownerId, scanId, and fingerprint are required.',
    );
  }

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
    // A concurrent operation may have inserted the same record.
    // Recover only from a duplicate-key error, then return that record.
    if (error?.code !== 11000) {
      throw error;
    }

    const existingEvidence =
      await Evidence.findOne(filter).lean();

    if (existingEvidence) {
      return existingEvidence;
    }

    throw error;
  }
};

const listByFinding = async (
  ownerId,
  findingId,
  options = {},
) => {
  const {
    type,
    scannerId,
    limit = 100,
    skip = 0,
  } = options;

  const filter = {
    ownerId,
    findingId,
  };

  if (type) {
    filter.type = type;
  }

  if (scannerId) {
    filter.scannerId = scannerId;
  }

  return Evidence.find(filter)
    .sort({
      createdAt: -1,
    })
    .skip(skip)
    .limit(limit)
    .lean();
};

const listByScan = async (
  ownerId,
  scanId,
  options = {},
) => {
  const {
    type,
    scannerId,
    findingId,
    limit = 500,
    skip = 0,
  } = options;

  const filter = {
    ownerId,
    scanId,
  };

  if (type) {
    filter.type = type;
  }

  if (scannerId) {
    filter.scannerId = scannerId;
  }

  if (findingId) {
    filter.findingId = findingId;
  }

  return Evidence.find(filter)
    .sort({
      createdAt: -1,
    })
    .skip(skip)
    .limit(limit)
    .lean();
};

const deleteByOwnerId = async (
  ownerId,
) =>
  Evidence.deleteMany({
    ownerId,
  });

export {
  create,
  createMany,
  findById,
  findByFingerprint,
  upsertByFingerprint,
  listByFinding,
  listByScan,
  deleteByOwnerId,
};