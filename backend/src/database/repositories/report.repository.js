// STATUS: UPDATED
// File: src/database/repositories/report.repository.js

import Report from "../models/report.model.js";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;
const MAX_SKIP = 100000;

const normalizeLimit = (value = DEFAULT_LIMIT) =>
  Math.min(Math.max(Number(value) || DEFAULT_LIMIT, 1), MAX_LIMIT);

const normalizeSkip = (value = 0) =>
  Math.min(Math.max(Number(value) || 0, 0), MAX_SKIP);

// STATUS: UPDATED
// File: src/database/repositories/report.repository.js

const sanitizeUpdateFields = (fields = {}) => {
  const {
    _id,
    ownerId,
    scanId,
    status,
    createdAt,
    updatedAt,
    __v,
    ...safeFields
  } = fields;

  return safeFields;
};

const create = async (data) => Report.create(data);

const findById = async (ownerId, reportId) =>
  Report.findOne({
    _id: reportId,
    ownerId,
  }).lean();

const findDocumentById = async (ownerId, reportId) =>
  Report.findOne({
    _id: reportId,
    ownerId,
  });

const listByScan = async (ownerId, scanId, options = {}) => {
  const { limit = DEFAULT_LIMIT, skip = 0 } = options;

  return Report.find({
    ownerId,
    scanId,
  })
    .sort({
      createdAt: -1,
      _id: -1,
    })
    .skip(normalizeSkip(skip))
    .limit(normalizeLimit(limit))
    .lean();
};

const listByOwnerId = async (ownerId) =>
  Report.find({
    ownerId,
  })
    .sort({
      createdAt: -1,
      _id: -1,
    })
    .lean();

const findExisting = async (ownerId, scanId, format) =>
  Report.findOne({
    ownerId,
    scanId,
    format,
    status: {
      $in: ["pending", "generating", "completed"],
    },
  })
    .sort({
      createdAt: -1,
      _id: -1,
    })
    .lean();

const updateStatus = async (ownerId, reportId, status, fields = {}) =>
  Report.findOneAndUpdate(
    {
      _id: reportId,
      ownerId,
    },
    {
      $set: {
        ...sanitizeUpdateFields(fields),
        status,
      },
    },
    {
      new: true,
      runValidators: true,
    },
  );

const markCompleted = async (ownerId, reportId, fields = {}) =>
  Report.findOneAndUpdate(
    {
      _id: reportId,
      ownerId,
    },
    {
      $set: {
        ...sanitizeUpdateFields(fields),
        status: "completed",
        generatedAt: new Date(),
      },
    },
    {
      new: true,
      runValidators: true,
    },
  );

const markFailed = async (ownerId, reportId, errorCode, errorMessage) =>
  Report.findOneAndUpdate(
    {
      _id: reportId,
      ownerId,
    },
    {
      $set: {
        status: "failed",
        errorCode,
        errorMessage,
      },
    },
    {
      new: true,
      runValidators: true,
    },
  );

const deleteExpired = async (before = new Date()) =>
  Report.deleteMany({
    expiresAt: {
      $lte: before,
    },
  });

/*
 * Permanently remove report records for one scan.
 *
 * Both ownerId and scanId are required so this operation cannot
 * accidentally remove another owner's report records.
 *
 * Cloudinary resources must be handled separately by the purge
 * service before this database cleanup runs.
 */
const deleteByScan = async (ownerId, scanId) => {
  if (!ownerId || !scanId) {
    const error = new Error(
      "ownerId and scanId are required to delete scan reports.",
    );

    error.code = "REPORT_DELETE_ARGUMENTS_REQUIRED";
    error.statusCode = 400;

    throw error;
  }

  return Report.deleteMany({
    ownerId,
    scanId,
  });
};

const deleteByOwnerId = async (ownerId) =>
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
  deleteByScan,
  deleteByOwnerId,
};
