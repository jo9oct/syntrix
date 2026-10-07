// STATUS: UPDATED

import Fingerprint from '../models/fingerprint.model.js';

const create = async (
  data,
) =>
  Fingerprint.create(data);

const createMany = async (
  documents,
) => {
  if (
    !Array.isArray(documents) ||
    documents.length === 0
  ) {
    return [];
  }

  return Fingerprint.insertMany(
    documents,
    {
      ordered: false,
    },
  );
};

const findById = async (
  ownerId,
  fingerprintId,
) =>
  Fingerprint.findOne({
    _id: fingerprintId,
    ownerId,
  }).lean();

const listByTarget = async (
  ownerId,
  targetId,
  options = {},
) => {
  const {
    limit = 500,
    skip = 0,
  } = options;

  return Fingerprint.find({
    ownerId,
    targetId,
  })
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
    limit = 500,
    skip = 0,
  } = options;

  return Fingerprint.find({
    ownerId,
    scanId,
  })
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
  Fingerprint.deleteMany({
    ownerId,
  });

export {
  create,
  createMany,
  findById,
  listByTarget,
  listByScan,
  deleteByOwnerId,
};