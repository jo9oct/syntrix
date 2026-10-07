// STATUS: UPDATED

import mongoose from 'mongoose';

import environment from '../config/environment.js';

import {
  analyzeScanFindings,
} from '../ai/analyzer.js';

import * as aiAnalysisRepository from '../database/repositories/aiAnalysis.repository.js';

const createServiceError = (
  code,
  message,
  statusCode,
) => {
  const error =
    new Error(message);

  error.code =
    code;

  error.statusCode =
    statusCode;

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

const assertScanId = (
  scanId,
) => {
  if (!scanId) {
    throw createServiceError(
      'SCAN_ID_REQUIRED',
      'Scan ID is required.',
      400,
    );
  }

  if (
    !mongoose.isValidObjectId(
      scanId,
    )
  ) {
    throw createServiceError(
      'INVALID_SCAN_ID',
      'Scan ID must be a valid ObjectId.',
      400,
    );
  }

  return new mongoose.Types.ObjectId(
    scanId,
  );
};

const persistFindingAnalysis = async ({
  ownerId,
  scanId,
  analysis,
}) => {
  const findingId =
    analysis?.findingId;

  if (!findingId) {
    return null;
  }

  const status =
    analysis?.status;

  if (
    status !== 'completed' &&
    status !== 'failed'
  ) {
    return null;
  }

  return aiAnalysisRepository.create({
    ownerId,

    scanId,

    findingId,

    status,

    provider:
      analysis?.provider ??
      null,

    model:
      analysis?.model ??
      null,

    analysisType:
      'finding',

    result:
      status === 'completed'
        ? analysis?.analysis ??
          null
        : null,

    inputFingerprint:
      analysis?.fingerprint ??
      null,

    errorCode:
      status === 'failed'
        ? 'AI_ANALYSIS_FAILED'
        : null,

    errorMessage:
      status === 'failed'
        ? analysis?.error ??
          'AI analysis failed.'
        : null,

    completedAt:
      new Date(),
  });
};

const analyzeAndPersistFindings = async ({
  ownerId,
  scanId,
  findings = [],
  evidence = [],
  target = null,
}) => {
  const normalizedOwnerId =
    assertOwnerId(
      ownerId,
    );

  const normalizedScanId =
    assertScanId(
      scanId,
    );

  if (
    !Array.isArray(findings) ||
    findings.length === 0
  ) {
    return {
      enabled: false,
      status: 'no_findings',
      analyses: [],
      persisted: [],
      persistenceErrors: [],
    };
  }

  if (
    !environment.ai.enabled
  ) {
    return {
      enabled: false,
      status: 'disabled',
      analyses: [],
      persisted: [],
      persistenceErrors: [],
    };
  }

  const analysisResult =
    await analyzeScanFindings({
      findings,
      evidence,
      target,
    });

  const persisted = [];
  const persistenceErrors = [];

  for (
    const analysis
    of analysisResult.analyses
  ) {
    try {
      const saved =
        await persistFindingAnalysis({
          ownerId:
            normalizedOwnerId,

          scanId:
            normalizedScanId,

          analysis,
        });

      if (saved) {
        persisted.push(saved);
      }
    } catch (error) {
      persistenceErrors.push({
        findingId:
          analysis?.findingId ??
          null,

        errorCode:
          error?.code ??
          'AI_ANALYSIS_PERSISTENCE_FAILED',

        errorMessage:
          error?.message ??
          'Failed to persist AI analysis.',
      });
    }
  }

  return {
    enabled:
      analysisResult.enabled,

    status:
      analysisResult.status,

    analyses:
      analysisResult.analyses,

    persisted,

    persistenceErrors,
  };
};

export {
  analyzeAndPersistFindings,
};