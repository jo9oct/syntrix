// STATUS: UPDATED

import Report from '../models/report.model.js';

const create = async (
  data,
) =>
  Report.create(data);

const findById = async (
  ownerId,
  reportId,
) =>
  Report.findOne({
    _id: reportId,
    ownerId,
  }).lean();

const findDocumentById = async (
  ownerId,
  reportId,
) =>
  Report.findOne({
    _id: reportId,
    ownerId,
  });

const listByScan = async (
  ownerId,
  scanId,
  options = {},
) => {
  const {
    limit = 50,
    skip = 0,
  } = options;

  return Report.find({
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

const listByOwnerId = async (
  ownerId,
) =>
  Report.find({
    ownerId,
  }).lean();

const findExisting = async (
  ownerId,
  scanId,
  format,
) =>
  Report.findOne({
    ownerId,
    scanId,
    format,
    status: {
      $in: [
        'pending',
        'generating',
        'completed',
      ],
    },
  })
    .sort({
      createdAt: -1,
    })
    .lean();

const updateStatus = async (
  ownerId,
  reportId,
  status,
  fields = {},
) =>
  Report.findOneAndUpdate(
    {
      _id: reportId,
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

const markCompleted = async (
  ownerId,
  reportId,
  fields = {},
) =>
  Report.findOneAndUpdate(
    {
      _id: reportId,
      ownerId,
    },
    {
      $set: {
        status: 'completed',
        generatedAt: new Date(),
        ...fields,
      },
    },
    {
      new: true,
    },
  );

const markFailed = async (
  ownerId,
  reportId,
  errorCode,
  errorMessage,
) =>
  Report.findOneAndUpdate(
    {
      _id: reportId,
      ownerId,
    },
    {
      $set: {
        status: 'failed',
        errorCode,
        errorMessage,
      },
    },
    {
      new: true,
    },
  );

const deleteExpired = async (
  before = new Date(),
) =>
  Report.deleteMany({
    expiresAt: {
      $lte: before,
    },
  });

const deleteByOwnerId = async (
  ownerId,
) =>
  Report.deleteMany({
    ownerId,
  });

export {
  create,
  findById,
  findDocumentById,
  listByScan,
  listByOwnerId,
  findExisting,
  updateStatus,
  markCompleted,
  markFailed,
  deleteExpired,
  deleteByOwnerId,
};