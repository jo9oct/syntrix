// STATUS: UPDATED

import Target from '../models/target.model.js';

const create = async (data) =>
  Target.create(data);

const findById = async (
  ownerId,
  targetId,
) =>
  Target.findOne({
    _id: targetId,
    ownerId,
  }).lean();

const findByNormalizedUrl = async (
  ownerId,
  normalizedUrl,
) =>
  Target.findOne({
    ownerId,
    normalizedUrl,
  });

const list = async (
  ownerId,
  options = {},
) => {
  const {
    limit = 50,
    skip = 0,
  } = options;

  return Target.find({
    ownerId,
    isActive: true,
  })
    .sort({
      updatedAt: -1,
    })
    .skip(skip)
    .limit(limit)
    .lean();
};

const updateLastScanned = async (
  ownerId,
  targetId,
  date = new Date(),
) =>
  Target.findOneAndUpdate(
    {
      _id: targetId,
      ownerId,
    },
    {
      $set: {
        lastScannedAt: date,
      },
      $inc: {
        scanCount: 1,
      },
    },
    {
      new: true,
    },
  );

const incrementScanCount = async (
  ownerId,
  targetId,
) =>
  Target.findOneAndUpdate(
    {
      _id: targetId,
      ownerId,
    },
    {
      $inc: {
        scanCount: 1,
      },
    },
    {
      new: true,
    },
  );

const deactivate = async (
  ownerId,
  targetId,
) =>
  Target.findOneAndUpdate(
    {
      _id: targetId,
      ownerId,
    },
    {
      $set: {
        isActive: false,
      },
    },
    {
      new: true,
    },
  );

const deleteByOwnerId = async (
  ownerId,
) =>
  Target.deleteMany({
    ownerId,
  });

export {
  create,
  findById,
  findByNormalizedUrl,
  list,
  updateLastScanned,
  incrementScanCount,
  deactivate,
  deleteByOwnerId,
};