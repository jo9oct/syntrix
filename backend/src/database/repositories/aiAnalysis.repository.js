// STATUS: UPDATED
// File: src/database/repositories/aiAnalysis.repository.js

import AiAnalysis from "../models/aiAnalysis.model.js";
import Scan from "../models/scan.model.js";

const WRITABLE_SCAN_STATUSES = ["pending", "running", "completed"];

const UPDATEABLE_SCAN_STATUSES = ["pending", "running", "completed"];

const assertScanScope = (ownerId, scanId) => {
  if (!ownerId || !scanId) {
    throw new TypeError("ownerId and scanId are required.");
  }
};

const assertWritableScan = async (ownerId, scanId) => {
  const scanExists = await Scan.exists({
    _id: scanId,
    ownerId,
    status: { $in: WRITABLE_SCAN_STATUSES },
  });

  if (!scanExists) {
    const error = new Error(
      "Cannot create AI analysis for a missing, deleted, or inactive scan.",
    );

    error.code = "SCAN_NOT_WRITABLE";
    error.statusCode = 409;

    throw error;
  }
};

const create = async (data) => {
  assertScanScope(data?.ownerId, data?.scanId);

  await assertWritableScan(data.ownerId, data.scanId);

  return AiAnalysis.create(data);
};

const findById = async (ownerId, analysisId) => {
  if (!ownerId || !analysisId) {
    throw new TypeError("ownerId and analysisId are required.");
  }

  return AiAnalysis.findOne({
    _id: analysisId,
    ownerId,
  }).lean();
};

const findByFindingId = async (ownerId, findingId) => {
  if (!ownerId || !findingId) {
    throw new TypeError("ownerId and findingId are required.");
  }

  return AiAnalysis.find({
    ownerId,
    findingId,
  })
    .sort({ createdAt: -1, _id: -1 })
    .lean();
};

const findLatestByFindingId = async (ownerId, findingId) => {
  if (!ownerId || !findingId) {
    throw new TypeError("ownerId and findingId are required.");
  }

  return AiAnalysis.findOne({
    ownerId,
    findingId,
  })
    .sort({ createdAt: -1, _id: -1 })
    .lean();
};

const upsertByFinding = async (data) => {
  assertScanScope(data?.ownerId, data?.scanId);
  await assertWritableScan(data.ownerId, data.scanId);

  return AiAnalysis.findOneAndUpdate(
    {
      ownerId: data.ownerId,
      findingId: data.findingId,
    },
    {
      $set: {
        ...data,
        updatedAt: new Date(),
      },
    },
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    },
  );
};

const findByScanId = async (ownerId, scanId) => {
  assertScanScope(ownerId, scanId);

  return AiAnalysis.find({
    ownerId,
    scanId,
  })
    .sort({ createdAt: -1, _id: -1 })
    .lean();
};

const updateStatus = async (ownerId, analysisId, status, fields = {}) => {
  if (!ownerId || !analysisId || !status) {
    throw new TypeError("ownerId, analysisId, and status are required.");
  }

  const analysis = await AiAnalysis.findOne({
    _id: analysisId,
    ownerId,
  })
    .select({ scanId: 1, status: 1 })
    .lean();

  if (!analysis) return null;

  const scanExists = await Scan.exists({
    _id: analysis.scanId,
    ownerId,
    status: { $in: UPDATEABLE_SCAN_STATUSES },
  });

  if (!scanExists) return null;

  const safeFields = { ...fields };

  for (const field of [
    "_id",
    "ownerId",
    "scanId",
    "status",
    "createdAt",
    "updatedAt",
    "completedAt",
  ]) {
    delete safeFields[field];
  }

  const updates = {
    ...safeFields,
    status,
  };

  if (status === "completed" || status === "failed") {
    updates.completedAt = new Date();
  }

  return AiAnalysis.findOneAndUpdate(
    {
      _id: analysisId,
      ownerId,
      scanId: analysis.scanId,
      status: analysis.status,
    },
    {
      $set: updates,
    },
    {
      new: true,
      runValidators: true,
    },
  );
};

/*
 * Permanent deletion for the validated scan-purge workflow.
 * Both ownerId and scanId are mandatory.
 */
const deleteByScan = async (ownerId, scanId) => {
  assertScanScope(ownerId, scanId);

  return AiAnalysis.deleteMany({
    ownerId,
    scanId,
  });
};

const deleteByOwnerId = async (ownerId) => {
  if (!ownerId) {
    throw new TypeError("ownerId is required.");
  }

  return AiAnalysis.deleteMany({ ownerId });
};

export {
  create,
  upsertByFinding,
  findById,
  findByFindingId,
  findLatestByFindingId,
  findByScanId,
  updateStatus,
  deleteByScan,
  deleteByOwnerId,
};
