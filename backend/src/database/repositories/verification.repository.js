// STATUS: UPDATED

import Verification from '../models/verification.model.js';

const create = async (
  data,
) =>
  Verification.create(
    data,
  );

const createMany = async (
  documents,
) => {
  if (
    !Array.isArray(documents) ||
    documents.length === 0
  ) {
    return [];
  }

  return Verification.insertMany(
    documents,
    {
      ordered: false,
    },
  );
};

const findById = async (
  ownerId,
  verificationId,
) =>
  Verification.findOne({
    _id: verificationId,
    ownerId,
  }).lean();

const listByFinding = async (
  ownerId,
  findingId,
  options = {},
) => {
  const {
    limit = 100,
    skip = 0,
  } = options;

  return Verification.find({
    ownerId,
    findingId,
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

  return Verification.find({
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
  Verification.deleteMany({
    ownerId,
  });

export {
  create,
  createMany,
  findById,
  listByFinding,
  listByScan,
  deleteByOwnerId,
};