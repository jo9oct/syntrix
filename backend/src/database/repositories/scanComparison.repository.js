// STATUS: CREATED
// File: src/database/repositories/scanComparison.repository.js

import mongoose from "mongoose";
import ScanComparison from "../models/scanComparison.model.js";

const toObjectId = (value, fieldName) => {
  if (!mongoose.isValidObjectId(value)) {
    const error = new Error(`Invalid ${fieldName}.`);
    error.statusCode = 400;
    error.code = "INVALID_OBJECT_ID";
    throw error;
  }

  return new mongoose.Types.ObjectId(value);
};

/**
 * Save or update the latest comparison for one owner and target.
 *
 * A comparison with an older version must never replace a newer result.
 * Concurrent workers are protected by the unique ownerId + targetId index.
 */
const upsertLatest = async (comparison) => {
  const ownerId = toObjectId(comparison.ownerId, "ownerId");
  const targetId = toObjectId(comparison.targetId, "targetId");
  const comparisonScanId = toObjectId(
    comparison.comparisonScanId,
    "comparisonScanId",
  );

  const comparisonVersion = comparison.comparisonVersion;

  if (!Number.isInteger(comparisonVersion) || comparisonVersion < 1) {
    const error = new Error("A valid comparison scan version is required.");
    error.statusCode = 400;
    error.code = "INVALID_COMPARISON_VERSION";
    throw error;
  }

  const filter = {
    ownerId,
    targetId,
    $or: [
      { comparisonVersion: { $lt: comparisonVersion } },
      { comparisonScanId },
      { comparisonVersion: null },
    ],
  };

  try {
    const saved = await ScanComparison.findOneAndUpdate(
      filter,
      {
        $set: {
          ...comparison,
          ownerId,
          targetId,
          comparisonScanId,
        },
      },
      {
        upsert: true,
        new: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      },
    ).lean();

    if (saved) {
      return saved;
    }
  } catch (error) {
    /*
     * A duplicate-key error can occur when concurrent workers race
     * to create the first record or when an older worker loses a race.
     * Read the existing record before deciding whether to retry/fail.
     */
    if (error?.code !== 11000) {
      throw error;
    }
  }

  const current = await ScanComparison.findOne({
    ownerId,
    targetId,
  }).lean();

  if (!current) {
    const error = new Error("The latest comparison could not be saved.");
    error.statusCode = 500;
    error.code = "COMPARISON_SAVE_FAILED";
    throw error;
  }

  // Never let an older worker replace a newer comparison.
  if (
    Number.isInteger(current.comparisonVersion) &&
    current.comparisonVersion > comparisonVersion
  ) {
    return current;
  }

  // The same scan may be processed again after a job retry.
  if (String(current.comparisonScanId) === String(comparisonScanId)) {
    return current;
  }

  const error = new Error(
    "A concurrent comparison update needs to be retried.",
  );
  error.statusCode = 409;
  error.code = "COMPARISON_UPDATE_CONFLICT";
  throw error;
};

/**
 * Retrieve the saved comparison for an owner and target.
 */
const findLatestByTarget = async ({ ownerId, targetId }) => {
  return ScanComparison.findOne({
    ownerId: toObjectId(ownerId, "ownerId"),
    targetId: toObjectId(targetId, "targetId"),
  }).lean();
};

export { upsertLatest, findLatestByTarget };
