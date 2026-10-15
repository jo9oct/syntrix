// STATUS: UPDATED
// File: src/database/repositories/target.repository.js

import mongoose from "mongoose";
import Target from "../models/target.model.js";

const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 100;
const MAX_SKIP = 100000;

const assertObjectId = (value, fieldName) => {
  if (!mongoose.isValidObjectId(value)) {
    const error = new Error(`${fieldName} must be a valid MongoDB ObjectId.`);

    error.statusCode = 400;
    error.code = "INVALID_ID";

    throw error;
  }

  return new mongoose.Types.ObjectId(String(value));
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

const create = async (data) => {
  if (!data || typeof data !== "object") {
    throw new TypeError("Target data is required.");
  }

  return Target.create({
    ...data,
    ownerId: assertObjectId(data.ownerId, "ownerId"),
  });
};

const findById = async (ownerId, targetId) =>
  Target.findOne({
    _id: assertObjectId(targetId, "targetId"),
    ownerId: assertObjectId(ownerId, "ownerId"),
  }).lean();

const findDocumentById = async (ownerId, targetId) =>
  Target.findOne({
    _id: assertObjectId(targetId, "targetId"),
    ownerId: assertObjectId(ownerId, "ownerId"),
  });

const findByNormalizedUrl = async (ownerId, normalizedUrl) =>
  Target.findOne({
    ownerId: assertObjectId(ownerId, "ownerId"),
    normalizedUrl,
  });

const list = async (ownerId, options = {}) => {
  const { limit, skip } = normalizePagination(options.limit, options.skip);

  return Target.find({
    ownerId: assertObjectId(ownerId, "ownerId"),
    isActive: true,
  })
    .sort({ updatedAt: -1, _id: -1 })
    .skip(skip)
    .limit(limit)
    .lean();
};

// Update only the timestamp. Never increment scanCount here.
const updateLastScanned = async (ownerId, targetId, date = new Date()) => {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    throw new TypeError("date must be a valid Date.");
  }

  return Target.findOneAndUpdate(
    {
      _id: assertObjectId(targetId, "targetId"),
      ownerId: assertObjectId(ownerId, "ownerId"),
    },
    {
      $set: {
        lastScannedAt: date,
      },
    },
    {
      new: true,
      runValidators: true,
    },
  ).lean();
};

const incrementScanCount = async (ownerId, targetId) =>
  Target.findOneAndUpdate(
    {
      _id: assertObjectId(targetId, "targetId"),
      ownerId: assertObjectId(ownerId, "ownerId"),
    },
    {
      $inc: {
        scanCount: 1,
      },
    },
    {
      new: true,
      runValidators: true,
    },
  ).lean();

/*
 * Atomically reserve the next target scan version.
 * Version numbers are never decremented or reused after deletion.
 *
 * This helper is safe for concurrent increments, but scan creation
 * must coordinate its use with idempotency checks.
 */
const incrementScanVersionCounter = async (ownerId, targetId) => {
  const target = await Target.findOneAndUpdate(
    {
      _id: assertObjectId(targetId, "targetId"),
      ownerId: assertObjectId(ownerId, "ownerId"),
      isActive: true,
    },
    {
      $inc: {
        scanVersionCounter: 1,
      },
    },
    {
      new: true,
      runValidators: true,
    },
  )
    .select({ _id: 1, scanVersionCounter: 1 })
    .lean();

  if (!target) return null;

  return target.scanVersionCounter;
};

const deactivate = async (ownerId, targetId) =>
  Target.findOneAndUpdate(
    {
      _id: assertObjectId(targetId, "targetId"),
      ownerId: assertObjectId(ownerId, "ownerId"),
    },
    {
      $set: {
        isActive: false,
      },
    },
    {
      new: true,
      runValidators: true,
    },
  ).lean();

const deleteByOwnerId = async (ownerId) =>
  Target.deleteMany({
    ownerId: assertObjectId(ownerId, "ownerId"),
  });

export {
  create,
  findById,
  findDocumentById,
  findByNormalizedUrl,
  list,
  updateLastScanned,
  incrementScanCount,
  incrementScanVersionCounter,
  deactivate,
  deleteByOwnerId,
};
