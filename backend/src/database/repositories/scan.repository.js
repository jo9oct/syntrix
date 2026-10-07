// STATUS: UPDATED

import Scan from '../models/scan.model.js';

const create = async (data) =>
  Scan.create(data);

const findById = async (
  ownerId,
  scanId,
) =>
  Scan.findOne({
    _id: scanId,
    ownerId,
  }).lean();

const findDocumentById = async (
  ownerId,
  scanId,
) =>
  Scan.findOne({
    _id: scanId,
    ownerId,
  });

const list = async (
  ownerId,
  options = {},
) => {
  const {
    status,
    limit = 50,
    skip = 0,
  } = options;

  const filter = {
    ownerId,
  };

  if (status) {
    filter.status = status;
  }

  return Scan.find(filter)
    .sort({
      createdAt: -1,
    })
    .skip(skip)
    .limit(limit)
    .lean();
};

const updateStatus = async (
  ownerId,
  scanId,
  status,
  fields = {},
) =>
  Scan.findOneAndUpdate(
    {
      _id: scanId,
      ownerId,
    },
    {
      $set: {
        status,
        ...fields,
      },
    },
    {
      new: true,
    },
  );

const updateProgress = async (
  ownerId,
  scanId,
  progress,
  completedScanners,
) =>
  Scan.findOneAndUpdate(
    {
      _id: scanId,
      ownerId,
    },
    {
      $set: {
        progress,
        completedScanners,
      },
    },
    {
      new: true,
    },
  );

const updateFindingCounts = async (
  ownerId,
  scanId,
  findingCounts,
  riskScore = null,
) =>
  Scan.findOneAndUpdate(
    {
      _id: scanId,
      ownerId,
    },
    {
      $set: {
        findingCounts,
        riskScore,
      },
    },
    {
      new: true,
    },
  );

const findByIdempotencyKey = async (
  ownerId,
  idempotencyKey,
) =>
  Scan.findOne({
    ownerId,
    idempotencyKey,
  }).lean();

const countActiveByOwner = async (
  ownerId,
) =>
  Scan.countDocuments({
    ownerId,
    status: {
      $in: [
        'pending',
        'running',
      ],
    },
  });

const countCreatedSince = async (
  ownerId,
  startDate,
) =>
  Scan.countDocuments({
    ownerId,
    createdAt: {
      $gte: startDate,
    },
  });

const markRunning = async (
  ownerId,
  scanId,
) =>
  Scan.findOneAndUpdate(
    {
      _id: scanId,
      ownerId,
      status: 'pending',
    },
    {
      $set: {
        status: 'running',
        startedAt: new Date(),
      },
    },
    {
      new: true,
    },
  );

const markCompleted = async (
  ownerId,
  scanId,
  fields = {},
) =>
  Scan.findOneAndUpdate(
    {
      _id: scanId,
      ownerId,
      status: 'running',
    },
    {
      $set: {
        status: 'completed',
        completedAt: new Date(),
        progress: 100,
        ...fields,
      },
    },
    {
      new: true,
    },
  );

const markFailed = async (
  ownerId,
  scanId,
  errorCode,
  errorMessage,
) =>
  Scan.findOneAndUpdate(
    {
      _id: scanId,
      ownerId,
      status: {
        $in: [
          'pending',
          'running',
        ],
      },
    },
    {
      $set: {
        status: 'failed',
        failedAt: new Date(),
        errorCode,
        errorMessage,
      },
    },
    {
      new: true,
    },
  );

const markCancelled = async (
  ownerId,
  scanId,
) =>
  Scan.findOneAndUpdate(
    {
      _id: scanId,
      ownerId,
      status: {
        $in: [
          'pending',
          'running',
        ],
      },
    },
    {
      $set: {
        status: 'cancelled',
        cancelledAt: new Date(),
      },
    },
    {
      new: true,
    },
  );

const deleteByOwnerId = async (
  ownerId,
) =>
  Scan.deleteMany({
    ownerId,
  });

export {
  create,
  findById,
  findDocumentById,
  list,
  updateStatus,
  updateProgress,
  updateFindingCounts,
  findByIdempotencyKey,
  countActiveByOwner,
  countCreatedSince,
  markRunning,
  markCompleted,
  markFailed,
  markCancelled,
  deleteByOwnerId,
};