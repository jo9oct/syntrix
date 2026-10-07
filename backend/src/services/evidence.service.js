// STATUS: CREATED

import mongoose from 'mongoose';

import * as evidenceRepository from '../database/repositories/evidence.repository.js';

const createServiceError = (
  code,
  message,
  statusCode,
) => {
  const error = new Error(message);

  error.code = code;
  error.statusCode = statusCode;

  return error;
};

const assertOwnerId = (
  ownerId,
) => {
  if (!ownerId) {
    throw createServiceError(
      'OWNER_ID_REQUIRED',
      'Owner ID is required.',
      401,
    );
  }

  if (
    !mongoose.isValidObjectId(
      ownerId,
    )
  ) {
    throw createServiceError(
      'INVALID_OWNER_ID',
      'Owner ID must be a valid ObjectId.',
      400,
    );
  }

  return new mongoose.Types.ObjectId(
    ownerId,
  );
};

const assertEvidenceId = (
  evidenceId,
) => {
  if (!evidenceId) {
    throw createServiceError(
      'EVIDENCE_ID_REQUIRED',
      'Evidence ID is required.',
      400,
    );
  }

  if (
    !mongoose.isValidObjectId(
      evidenceId,
    )
  ) {
    throw createServiceError(
      'INVALID_EVIDENCE_ID',
      'Evidence ID must be a valid ObjectId.',
      400,
    );
  }

  return new mongoose.Types.ObjectId(
    evidenceId,
  );
};

const assertObjectId = (
  value,
  code,
  message,
) => {
  if (!value) {
    throw createServiceError(
      code,
      message,
      400,
    );
  }

  if (
    !mongoose.isValidObjectId(
      value,
    )
  ) {
    throw createServiceError(
      code,
      message,
      400,
    );
  }

  return new mongoose.Types.ObjectId(
    value,
  );
};

const listEvidenceByFinding =
  async ({
    ownerId,
    findingId,
    type,
    scannerId,
    limit = 100,
    skip = 0,
  }) => {
    const normalizedOwnerId =
      assertOwnerId(
        ownerId,
      );

    const normalizedFindingId =
      assertObjectId(
        findingId,
        'INVALID_FINDING_ID',
        'Finding ID must be a valid ObjectId.',
      );

    return evidenceRepository.listByFinding(
      normalizedOwnerId,
      normalizedFindingId,
      {
        type,
        scannerId,
        limit,
        skip,
      },
    );
  };

const listEvidenceByScan =
  async ({
    ownerId,
    scanId,
    findingId,
    type,
    scannerId,
    limit = 500,
    skip = 0,
  }) => {
    const normalizedOwnerId =
      assertOwnerId(
        ownerId,
      );

    const normalizedScanId =
      assertObjectId(
        scanId,
        'INVALID_SCAN_ID',
        'Scan ID must be a valid ObjectId.',
      );

    const normalizedFindingId =
      findingId
        ? assertObjectId(
            findingId,
            'INVALID_FINDING_ID',
            'Finding ID must be a valid ObjectId.',
          )
        : undefined;

    return evidenceRepository.listByScan(
      normalizedOwnerId,
      normalizedScanId,
      {
        findingId:
          normalizedFindingId,

        type,

        scannerId,

        limit,

        skip,
      },
    );
  };

const getEvidence = async ({
  ownerId,
  evidenceId,
}) => {
  const normalizedOwnerId =
    assertOwnerId(
      ownerId,
    );

  const normalizedEvidenceId =
    assertEvidenceId(
      evidenceId,
    );

  const evidence =
    await evidenceRepository.findById(
      normalizedOwnerId,
      normalizedEvidenceId,
    );

  if (!evidence) {
    throw createServiceError(
      'EVIDENCE_NOT_FOUND',
      'Evidence was not found.',
      404,
    );
  }

  return evidence;
};

export {
  listEvidenceByFinding,
  listEvidenceByScan,
  getEvidence,
};