// STATUS: UPDATED

import Evidence from '../models/evidence.model.js';

const create = async (
  data,
) =>
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
    filter.scannerId =
      scannerId;
  }

  return Evidence.find(
    filter,
  )
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
    filter.scannerId =
      scannerId;
  }

  if (findingId) {
    filter.findingId =
      findingId;
  }

  return Evidence.find(
    filter,
  )
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
  listByFinding,
  listByScan,
  deleteByOwnerId,
};