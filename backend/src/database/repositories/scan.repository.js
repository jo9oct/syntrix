// STATUS: UPDATED
// File: src/database/repositories/scan.repository.js

import { randomUUID } from "node:crypto";
import mongoose from "mongoose";
import Scan from "../models/scan.model.js";
import Target from "../models/target.model.js";

const ACTIVE_STATUSES = ["pending", "running"];

const TERMINAL_STATUSES = ["completed", "failed", "cancelled", "deleted"];

const ALLOWED_STATUSES = [...ACTIVE_STATUSES, ...TERMINAL_STATUSES];

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;
const MAX_SKIP = 100000;
const RECOVERY_WINDOW_MS = 90 * 24 * 60 * 60 * 1000;
const DEFAULT_PURGE_LEASE_MS = 5 * 60 * 1000;

const createRepositoryError = (message, code, statusCode = 400) => {
  const error = new Error(message);
  error.code = code;
  error.statusCode = statusCode;
  return error;
};

const assertObjectId = (value, fieldName) => {
  if (!mongoose.isValidObjectId(value)) {
    throw createRepositoryError(
      `${fieldName} must be a valid MongoDB ObjectId.`,
      "INVALID_ID",
    );
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
    throw createRepositoryError(
      `limit must be an integer between 1 and ${MAX_LIMIT}.`,
      "INVALID_LIMIT",
    );
  }

  if (
    !Number.isInteger(normalizedSkip) ||
    normalizedSkip < 0 ||
    normalizedSkip > MAX_SKIP
  ) {
    throw createRepositoryError(
      `skip must be an integer between 0 and ${MAX_SKIP}.`,
      "INVALID_SKIP",
    );
  }

  return {
    limit: normalizedLimit,
    skip: normalizedSkip,
  };
};

const validatePurgeArguments = ({ ownerId, scanId }) => {
  assertObjectId(ownerId, "ownerId");
  assertObjectId(scanId, "scanId");
};

const validatePurgeToken = (purgeToken) => {
  if (typeof purgeToken !== "string" || purgeToken.trim().length === 0) {
    throw createRepositoryError(
      "A valid purge token is required.",
      "SCAN_PURGE_TOKEN_REQUIRED",
    );
  }
};

const isValidDate = (value) =>
  value instanceof Date && !Number.isNaN(value.getTime());

const isDuplicateKeyError = (error) => error?.code === 11000;

const buildHistoryEntry = ({
  from,
  to,
  reason,
  type = "worker",
  actor = null,
}) => ({
  from,
  to,
  changedAt: new Date(),
  reason,
  type,
  ...(actor ? { actor } : {}),
});

const sanitizeStatusFields = (fields = {}) => {
  const {
    _id,
    ownerId,
    targetId,
    version,
    status,
    deletedAt,
    previousStatus,
    purgeToken,
    purgeLeaseUntil,
    statusHistory,
    createdAt,
    updatedAt,
    __v,
    ...safeFields
  } = fields;

  return safeFields;
};

/*
 * Status transitions are explicit and audited.
 *
 * Retry lifecycle:
 * running -> pending -> running
 *
 * A retry does not make a failed scan active again. Only a scan that
 * is still running may return to pending through this transition.
 */
const getTransitionRule = (nextStatus) => {
  switch (nextStatus) {
    case "pending":
      return {
        allowedFrom: ["running"],
        reason: "scan_retry_scheduled",
        type: "worker",
      };

    case "running":
      return {
        allowedFrom: ["pending"],
        reason: "scan_started",
        type: "worker",
      };

    case "completed":
      return {
        allowedFrom: ["running"],
        reason: "scan_completed",
        type: "worker",
      };

    case "failed":
      return {
        allowedFrom: ["pending", "running"],
        reason: "scan_failed",
        type: "worker",
      };

    case "cancelled":
      return {
        allowedFrom: ["pending", "running"],
        reason: "scan_cancelled",
        type: "worker",
      };

    default:
      return null;
  }
};

/*
 * Allocate scan versions atomically through the target.
 * Version gaps are allowed; versions are never reused.
 */
const create = async (data) => {
  if (!data || typeof data !== "object") {
    throw createRepositoryError("Scan data is required.", "SCAN_DATA_REQUIRED");
  }

  const ownerId = assertObjectId(data.ownerId, "ownerId");
  const targetId = assertObjectId(data.targetId, "targetId");

  if (data.status !== undefined && data.status !== "pending") {
    throw createRepositoryError(
      "New scans must start with pending status.",
      "INVALID_INITIAL_SCAN_STATUS",
    );
  }

  if (data.deletedAt || data.previousStatus || data.purgeToken) {
    throw createRepositoryError(
      "Lifecycle fields cannot be set during scan creation.",
      "INVALID_SCAN_LIFECYCLE_FIELDS",
    );
  }

  if (data.idempotencyKey) {
    const existing = await findByIdempotencyKey(ownerId, data.idempotencyKey);

    if (existing) return existing;
  }

  try {
    const target = await Target.findOneAndUpdate(
      {
        _id: targetId,
        ownerId,
        isActive: true,
      },
      {
        $inc: {
          scanVersionCounter: 1,
        },
      },
      {
        new: true,
        projection: {
          scanVersionCounter: 1,
        },
      },
    ).lean();

    if (!target) {
      throw createRepositoryError(
        "The active scan target was not found.",
        "SCAN_TARGET_NOT_FOUND",
        404,
      );
    }

    return await Scan.create({
      ...data,
      ownerId,
      targetId,
      version: target.scanVersionCounter,
      status: "pending",
      deletedAt: null,
      previousStatus: null,
      purgeToken: null,
      purgeLeaseUntil: null,
      statusHistory: [
        buildHistoryEntry({
          from: null,
          to: "pending",
          reason: "scan_created",
          type: "system",
          actor: ownerId,
        }),
      ],
    });
  } catch (error) {
    if (isDuplicateKeyError(error) && data.idempotencyKey) {
      const existing = await findByIdempotencyKey(ownerId, data.idempotencyKey);

      if (existing) return existing;
    }

    throw error;
  }
};

const findById = async (ownerId, scanId) =>
  Scan.findOne({
    _id: assertObjectId(scanId, "scanId"),
    ownerId: assertObjectId(ownerId, "ownerId"),
    status: { $ne: "deleted" },
  }).lean();

const findAnyById = async (ownerId, scanId) =>
  Scan.findOne({
    _id: assertObjectId(scanId, "scanId"),
    ownerId: assertObjectId(ownerId, "ownerId"),
  })
    .select("+purgeToken +purgeLeaseUntil")
    .lean();

const findDocumentById = async (ownerId, scanId) =>
  Scan.findOne({
    _id: assertObjectId(scanId, "scanId"),
    ownerId: assertObjectId(ownerId, "ownerId"),
    status: { $ne: "deleted" },
  });

const findDeletedById = async (ownerId, scanId) =>
  Scan.findOne({
    _id: assertObjectId(scanId, "scanId"),
    ownerId: assertObjectId(ownerId, "ownerId"),
    status: "deleted",
  }).lean();

const list = async (ownerId, options = {}) => {
  const { limit, skip } = normalizePagination(options.limit, options.skip);

  const filter = {
    ownerId: assertObjectId(ownerId, "ownerId"),
    status: { $ne: "deleted" },
  };

  if (options.status) {
    if (
      !ALLOWED_STATUSES.includes(options.status) ||
      options.status === "deleted"
    ) {
      throw createRepositoryError(
        "Invalid status filter for normal scan history.",
        "INVALID_SCAN_STATUS_FILTER",
      );
    }

    filter.status = options.status;
  }

  if (options.targetId) {
    filter.targetId = assertObjectId(options.targetId, "targetId");
  }

  return Scan.find(filter)
    .sort({ createdAt: -1, _id: -1 })
    .skip(skip)
    .limit(limit)
    .lean();
};

const listDeleted = async (ownerId, options = {}) => {
  const { limit, skip } = normalizePagination(options.limit, options.skip);

  return Scan.find({
    ownerId: assertObjectId(ownerId, "ownerId"),
    status: "deleted",
  })
    .sort({ deletedAt: -1, _id: -1 })
    .skip(skip)
    .limit(limit)
    .lean();
};

const findByIdempotencyKey = async (ownerId, idempotencyKey) => {
  if (!idempotencyKey) return null;

  return Scan.findOne({
    ownerId: assertObjectId(ownerId, "ownerId"),
    idempotencyKey,
  }).lean();
};

const countActiveByOwner = async (ownerId) =>
  Scan.countDocuments({
    ownerId: assertObjectId(ownerId, "ownerId"),
    status: { $in: ACTIVE_STATUSES },
  });

const countCreatedSince = async (ownerId, startDate) => {
  if (!isValidDate(startDate)) {
    throw createRepositoryError(
      "startDate must be a valid Date.",
      "INVALID_START_DATE",
    );
  }

  return Scan.countDocuments({
    ownerId: assertObjectId(ownerId, "ownerId"),
    createdAt: { $gte: startDate },
  });
};

/*
 * Atomically update a scan status and append its transition history.
 * A concurrent deletion or status change prevents the update.
 */
const updateStatus = async (ownerId, scanId, nextStatus, fields = {}) => {
  if (!ALLOWED_STATUSES.includes(nextStatus)) {
    throw createRepositoryError(
      `Unsupported scan status: ${nextStatus}`,
      "INVALID_SCAN_STATUS",
    );
  }

  if (nextStatus === "deleted") {
    throw createRepositoryError(
      "Use softDelete() to delete a scan.",
      "USE_SCAN_SOFT_DELETE",
    );
  }

  const rule = getTransitionRule(nextStatus);

  if (!rule) {
    throw createRepositoryError(
      `No generic transition rule exists for ${nextStatus}.`,
      "INVALID_SCAN_TRANSITION",
    );
  }

  const identity = {
    _id: assertObjectId(scanId, "scanId"),
    ownerId: assertObjectId(ownerId, "ownerId"),
  };

  const current = await Scan.findOne({
    ...identity,
    status: { $in: rule.allowedFrom },
  })
    .select({ status: 1 })
    .lean();

  if (!current) return null;

  return Scan.findOneAndUpdate(
    {
      ...identity,
      status: current.status,
    },
    {
      $set: {
        ...sanitizeStatusFields(fields),
        status: nextStatus,
      },
      $push: {
        statusHistory: buildHistoryEntry({
          from: current.status,
          to: nextStatus,
          reason: rule.reason,
          type: rule.type,
        }),
      },
    },
    {
      new: true,
      runValidators: true,
    },
  ).lean();
};

const updateProgress = async (ownerId, scanId, progress, completedScanners) =>
  Scan.findOneAndUpdate(
    {
      _id: assertObjectId(scanId, "scanId"),
      ownerId: assertObjectId(ownerId, "ownerId"),
      status: { $in: ACTIVE_STATUSES },
    },
    {
      $set: { progress, completedScanners },
    },
    {
      new: true,
      runValidators: true,
    },
  ).lean();

const updateFindingCounts = async (
  ownerId,
  scanId,
  findingCounts,
  riskScore = null,
) =>
  Scan.findOneAndUpdate(
    {
      _id: assertObjectId(scanId, "scanId"),
      ownerId: assertObjectId(ownerId, "ownerId"),
      status: { $in: ACTIVE_STATUSES },
    },
    {
      $set: { findingCounts, riskScore },
    },
    {
      new: true,
      runValidators: true,
    },
  ).lean();

const updateScannerOutcomes = async (ownerId, scanId, scannerOutcomes) =>
  Scan.findOneAndUpdate(
    {
      _id: assertObjectId(scanId, "scanId"),
      ownerId: assertObjectId(ownerId, "ownerId"),
      status: { $in: ACTIVE_STATUSES },
    },
    {
      $set: { scannerOutcomes },
    },
    {
      new: true,
      runValidators: true,
    },
  ).lean();

const markRunning = (ownerId, scanId, fields = {}) =>
  updateStatus(ownerId, scanId, "running", fields);

const markCompleted = (ownerId, scanId, fields = {}) =>
  updateStatus(ownerId, scanId, "completed", fields);

const markFailed = (ownerId, scanId, fields = {}) =>
  updateStatus(ownerId, scanId, "failed", fields);

const markCancelled = (ownerId, scanId, fields = {}) =>
  updateStatus(ownerId, scanId, "cancelled", fields);

const softDelete = async (ownerId, scanId, options = {}) => {
  const actor = options.actor ?? ownerId;
  const reason = options.reason ?? "user_deleted_scan";

  const identity = {
    _id: assertObjectId(scanId, "scanId"),
    ownerId: assertObjectId(ownerId, "ownerId"),
  };

  const current = await Scan.findOne(identity).lean();

  if (!current) return null;

  if (current.status === "deleted") {
    return { scan: current, duplicated: true };
  }

  const updated = await Scan.findOneAndUpdate(
    {
      ...identity,
      status: current.status,
    },
    {
      $set: {
        previousStatus: current.status,
        status: "deleted",
        deletedAt: new Date(),
        purgeToken: null,
        purgeLeaseUntil: null,
      },
      $push: {
        statusHistory: buildHistoryEntry({
          from: current.status,
          to: "deleted",
          reason,
          type: "user",
          actor,
        }),
      },
    },
    {
      new: true,
      runValidators: true,
    },
  ).lean();

  if (updated) {
    return { scan: updated, duplicated: false };
  }

  const latest = await findAnyById(ownerId, scanId);

  if (latest?.status === "deleted") {
    return { scan: latest, duplicated: true };
  }

  return null;
};

const recoverDeleted = async (ownerId, scanId, restoreStatus) => {
  const allowedRestoreStatuses = [
    "pending",
    "completed",
    "failed",
    "cancelled",
  ];

  if (!allowedRestoreStatuses.includes(restoreStatus)) {
    throw createRepositoryError(
      "Invalid status for scan recovery.",
      "INVALID_SCAN_RECOVERY_STATUS",
    );
  }

  const identity = {
    _id: assertObjectId(scanId, "scanId"),
    ownerId: assertObjectId(ownerId, "ownerId"),
  };

  const recoveryCutoff = new Date(Date.now() - RECOVERY_WINDOW_MS);

  const current = await Scan.findOne({
    ...identity,
    status: "deleted",
    purgeToken: null,
    deletedAt: { $gt: recoveryCutoff },
  })
    .select({ status: 1, deletedAt: 1 })
    .lean();

  if (!current?.deletedAt) return null;

  return Scan.findOneAndUpdate(
    {
      ...identity,
      status: "deleted",
      purgeToken: null,
      deletedAt: {
        $eq: current.deletedAt,
        $gt: recoveryCutoff,
      },
    },
    {
      $set: {
        status: restoreStatus,
        purgeToken: null,
        purgeLeaseUntil: null,
      },
      $unset: {
        deletedAt: 1,
        previousStatus: 1,
      },
      $push: {
        statusHistory: buildHistoryEntry({
          from: "deleted",
          to: restoreStatus,
          reason: "scan_recovered",
          type: "recovery",
          actor: ownerId,
        }),
      },
    },
    {
      new: true,
      runValidators: true,
    },
  ).lean();
};

const claimExpiredScanForPurge = async ({
  ownerId,
  scanId,
  now = new Date(),
  leaseMs = DEFAULT_PURGE_LEASE_MS,
}) => {
  validatePurgeArguments({ ownerId, scanId });

  if (!isValidDate(now)) {
    throw createRepositoryError(
      "now must be a valid Date.",
      "INVALID_PURGE_DATE",
    );
  }

  if (!Number.isSafeInteger(leaseMs) || leaseMs <= 0) {
    throw createRepositoryError(
      "leaseMs must be a positive safe integer.",
      "INVALID_PURGE_LEASE",
    );
  }

  const cutoff = new Date(now.getTime() - RECOVERY_WINDOW_MS);

  return Scan.findOneAndUpdate(
    {
      _id: assertObjectId(scanId, "scanId"),
      ownerId: assertObjectId(ownerId, "ownerId"),
      status: "deleted",
      deletedAt: { $type: "date", $lte: cutoff },
      $or: [
        {
          purgeToken: null,
          purgeLeaseUntil: null,
        },
        {
          purgeLeaseUntil: { $lte: now },
        },
      ],
    },
    {
      $set: {
        purgeToken: randomUUID(),
        purgeLeaseUntil: new Date(now.getTime() + leaseMs),
      },
    },
    {
      new: true,
      runValidators: true,
    },
  )
    .select("+purgeToken +purgeLeaseUntil")
    .lean();
};

const renewPurgeClaim = async ({
  ownerId,
  scanId,
  purgeToken,
  now = new Date(),
  leaseMs = DEFAULT_PURGE_LEASE_MS,
}) => {
  validatePurgeArguments({ ownerId, scanId });
  validatePurgeToken(purgeToken);

  if (!isValidDate(now)) {
    throw createRepositoryError(
      "now must be a valid Date.",
      "INVALID_PURGE_DATE",
    );
  }

  if (!Number.isSafeInteger(leaseMs) || leaseMs <= 0) {
    throw createRepositoryError(
      "leaseMs must be a positive safe integer.",
      "INVALID_PURGE_LEASE",
    );
  }

  const cutoff = new Date(now.getTime() - RECOVERY_WINDOW_MS);

  return Scan.findOneAndUpdate(
    {
      _id: assertObjectId(scanId, "scanId"),
      ownerId: assertObjectId(ownerId, "ownerId"),
      status: "deleted",
      purgeToken,
      purgeLeaseUntil: { $gt: now },
      deletedAt: { $type: "date", $lte: cutoff },
    },
    {
      $set: {
        purgeLeaseUntil: new Date(now.getTime() + leaseMs),
      },
    },
    {
      new: true,
      runValidators: true,
    },
  )
    .select("+purgeToken +purgeLeaseUntil")
    .lean();
};

const releasePurgeClaim = async ({ ownerId, scanId, purgeToken }) => {
  validatePurgeArguments({ ownerId, scanId });
  validatePurgeToken(purgeToken);

  return Scan.findOneAndUpdate(
    {
      _id: assertObjectId(scanId, "scanId"),
      ownerId: assertObjectId(ownerId, "ownerId"),
      status: "deleted",
      purgeToken,
    },
    {
      $set: {
        purgeToken: null,
        purgeLeaseUntil: null,
      },
    },
    {
      new: true,
      runValidators: true,
    },
  )
    .select("+purgeToken +purgeLeaseUntil")
    .lean();
};

const deletePurgedScan = async ({
  ownerId,
  scanId,
  purgeToken,
  now = new Date(),
}) => {
  validatePurgeArguments({ ownerId, scanId });
  validatePurgeToken(purgeToken);

  if (!isValidDate(now)) {
    throw createRepositoryError(
      "now must be a valid Date.",
      "INVALID_PURGE_DATE",
    );
  }

  const cutoff = new Date(now.getTime() - RECOVERY_WINDOW_MS);

  return Scan.findOneAndDelete({
    _id: assertObjectId(scanId, "scanId"),
    ownerId: assertObjectId(ownerId, "ownerId"),
    status: "deleted",
    purgeToken,
    purgeLeaseUntil: { $gt: now },
    deletedAt: { $type: "date", $lte: cutoff },
  })
    .select("+purgeToken +purgeLeaseUntil")
    .lean();
};

const listEligibleCompletedByTarget = async (
  ownerId,
  targetId,
  options = {},
) => {
  const { limit, skip } = normalizePagination(
    options.limit ?? 100,
    options.skip ?? 0,
  );

  return Scan.find({
    ownerId: assertObjectId(ownerId, "ownerId"),
    targetId: assertObjectId(targetId, "targetId"),
    status: "completed",
    completedAt: { $ne: null },
  })
    .sort({ completedAt: 1, createdAt: 1, _id: 1 })
    .skip(skip)
    .limit(limit)
    .lean();
};

/*
 * Find the immediately previous eligible completed scan.
 *
 * Versioned scans use the greatest version below the comparison scan.
 * Legacy scans without versions use completion chronology.
 *
 * Deleted, failed, cancelled, pending, and running scans are excluded.
 */
const findPreviousEligibleCompletedByTarget = async ({
  ownerId,
  targetId,
  comparisonScanId,
}) => {
  const safeOwnerId = assertObjectId(ownerId, "ownerId");
  const safeTargetId = assertObjectId(targetId, "targetId");
  const safeComparisonScanId = assertObjectId(
    comparisonScanId,
    "comparisonScanId",
  );

  const comparisonScan = await Scan.findOne({
    _id: safeComparisonScanId,
    ownerId: safeOwnerId,
    targetId: safeTargetId,
    status: "completed",
    completedAt: { $ne: null },
  })
    .select({
      _id: 1,
      version: 1,
      completedAt: 1,
      createdAt: 1,
    })
    .lean();

  if (!comparisonScan) return null;

  const previousFilter = {
    ownerId: safeOwnerId,
    targetId: safeTargetId,
    status: "completed",
    completedAt: { $ne: null },
    _id: { $ne: safeComparisonScanId },
  };

  if (Number.isInteger(comparisonScan.version) && comparisonScan.version >= 1) {
    previousFilter.version = {
      $lt: comparisonScan.version,
      $gte: 1,
    };
  } else {
    previousFilter.version = {
      $in: [null],
    };

    previousFilter.$or = [
      { completedAt: { $lt: comparisonScan.completedAt } },
      {
        completedAt: comparisonScan.completedAt,
        createdAt: { $lt: comparisonScan.createdAt },
      },
      {
        completedAt: comparisonScan.completedAt,
        createdAt: comparisonScan.createdAt,
        _id: { $lt: safeComparisonScanId },
      },
    ];
  }

  return Scan.findOne(previousFilter)
    .sort({
      version: -1,
      completedAt: -1,
      createdAt: -1,
      _id: -1,
    })
    .lean();
};

// Administrative cleanup only; not for ordinary scan purging.
const deleteByOwnerId = async (ownerId) =>
  Scan.deleteMany({
    ownerId: assertObjectId(ownerId, "ownerId"),
  });

export {
  ACTIVE_STATUSES,
  TERMINAL_STATUSES,
  create,
  findById,
  findAnyById,
  findDocumentById,
  findDeletedById,
  list,
  listDeleted,
  findByIdempotencyKey,
  countActiveByOwner,
  countCreatedSince,
  updateStatus,
  updateProgress,
  updateFindingCounts,
  updateScannerOutcomes,
  markRunning,
  markCompleted,
  markFailed,
  markCancelled,
  softDelete,
  recoverDeleted,
  claimExpiredScanForPurge,
  renewPurgeClaim,
  releasePurgeClaim,
  deletePurgedScan,
  listEligibleCompletedByTarget,
  findPreviousEligibleCompletedByTarget,
  deleteByOwnerId,
};
