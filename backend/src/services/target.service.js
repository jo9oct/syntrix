// STATUS: CREATED

import mongoose from "mongoose";

import * as targetRepository from "../database/repositories/target.repository.js";
import * as scanRepository from "../database/repositories/scan.repository.js";

const createServiceError = (message, statusCode, code) => {
  const error = new Error(message);

  error.statusCode = statusCode;
  error.code = code;

  return error;
};

const assertObjectId = (value, fieldName) => {
  if (!mongoose.isValidObjectId(value)) {
    throw createServiceError(`${fieldName} is invalid.`, 400, "INVALID_ID");
  }

  return new mongoose.Types.ObjectId(String(value));
};

const getTargetOrThrow = async (ownerId, targetId) => {
  const target = await targetRepository.findById(
    assertObjectId(ownerId, "ownerId"),
    assertObjectId(targetId, "targetId"),
  );

  if (!target || !target.isActive) {
    throw createServiceError("Target was not found.", 404, "TARGET_NOT_FOUND");
  }

  return target;
};

const listTargets = async ({ ownerId, limit = 100, skip = 0 }) => {
  const normalizedOwnerId = assertObjectId(ownerId, "ownerId");

  const targets = await targetRepository.list(normalizedOwnerId, {
    limit,
    skip,
  });

  return {
    items: targets,
    pagination: {
      limit: Math.min(100, Math.max(1, Number(limit) || 100)),
      skip: Math.max(0, Number(skip) || 0),
    },
  };
};

const getTargetDetails = async ({ ownerId, targetId }) => {
  const target = await getTargetOrThrow(ownerId, targetId);

  const scans = await scanRepository.list(ownerId, {
    targetId: target._id,
    limit: 100,
    skip: 0,
    sort: {
      createdAt: -1,
      _id: -1,
    },
  });

  return {
    target,
    latestScan: scans[0] || null,
  };
};

export { listTargets, getTargetDetails };
