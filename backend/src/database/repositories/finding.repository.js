// STATUS: UPDATED

import Finding from '../models/finding.model.js';

const create = async (data) =>
  Finding.create(data);

const createMany = async (
  documents,
  options = {},
) => {
  if (
    !Array.isArray(documents) ||
    documents.length === 0
  ) {
    return [];
  }

  return Finding.insertMany(
    documents,
    {
      ordered: false,
      ...options,
    },
  );
};

const findById = async (
  ownerId,
  findingId,
) =>
  Finding.findOne({
    _id: findingId,
    ownerId,
  }).lean();

const findByFingerprint = async (
  ownerId,
  scanId,
  fingerprint,
) =>
  Finding.findOne({
    ownerId,
    scanId,
    fingerprint,
  }).lean();

const listByScan = async (
  ownerId,
  scanId,
  options = {},
) => {
  const {
    severity,
    confidence,
    status,
    scannerId,
    limit = 100,
    skip = 0,
  } = options;

  const filter = {
    ownerId,
    scanId,
  };

  if (severity) {
    filter.severity = severity;
  }

  if (confidence) {
    filter.confidence = confidence;
  }

  if (status) {
    filter.status = status;
  }

  if (scannerId) {
    filter.scannerId = scannerId;
  }

  return Finding.find(filter)
    .sort({
      createdAt: -1,
    })
    .skip(skip)
    .limit(limit)
    .lean();
};

const list = async (
  ownerId,
  options = {},
) => {
  const {
    scanId,
    severity,
    confidence,
    status,
    scannerId,
    limit = 100,
    skip = 0,
  } = options;

  const filter = {
    ownerId,
  };

  if (scanId) {
    filter.scanId = scanId;
  }

  if (severity) {
    filter.severity = severity;
  }

  if (confidence) {
    filter.confidence = confidence;
  }

  if (status) {
    filter.status = status;
  }

  if (scannerId) {
    filter.scannerId = scannerId;
  }

  return Finding.find(filter)
    .sort({
      createdAt: -1,
    })
    .skip(skip)
    .limit(limit)
    .lean();
};

const addEvidenceId = async (
  ownerId,
  findingId,
  evidenceId,
) =>
  Finding.findOneAndUpdate(
    {
      _id: findingId,
      ownerId,
    },
    {
      $addToSet: {
        evidenceIds: evidenceId,
      },
    },
    {
      new: true,
    },
  ).lean();

const update = async (
  ownerId,
  findingId,
  updates,
) =>
  Finding.findOneAndUpdate(
    {
      _id: findingId,
      ownerId,
    },
    {
      $set: updates,
    },
    {
      new: true,
    },
  ).lean();

const updateStatus = async (
  ownerId,
  findingId,
  status,
) =>
  Finding.findOneAndUpdate(
    {
      _id: findingId,
      ownerId,
    },
    {
      $set: {
        status,
        lastDetectedAt:
          new Date(),
      },
    },
    {
      new: true,
    },
  );

const updateVerification = async (
  ownerId,
  findingId,
  verificationId,
  verificationStatus,
  status,
) =>
  Finding.findOneAndUpdate(
    {
      _id: findingId,
      ownerId,
    },
    {
      $set: {
        verificationId,
        verificationStatus,
        status,
        lastDetectedAt:
          new Date(),
      },
    },
    {
      new: true,
    },
  );

const countBySeverity = async (
  ownerId,
  scanId,
) =>
  Finding.aggregate([
    {
      $match: {
        ownerId,
        scanId,
      },
    },
    {
      $group: {
        _id: '$severity',
        count: {
          $sum: 1,
        },
      },
    },
  ]);

const countByStatus = async (
  ownerId,
  scanId,
) =>
  Finding.aggregate([
    {
      $match: {
        ownerId,
        scanId,
      },
    },
    {
      $group: {
        _id: '$status',
        count: {
          $sum: 1,
        },
      },
    },
  ]);

const deleteByOwnerId = async (
  ownerId,
) =>
  Finding.deleteMany({
    ownerId,
  });

export {
  create,
  createMany,
  findById,
  findByFingerprint,
  list,
  listByScan,
  addEvidenceId,
  update,
  updateStatus,
  updateVerification,
  countBySeverity,
  countByStatus,
  deleteByOwnerId,
};