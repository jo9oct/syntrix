// STATUS: UPDATED
// FILE: backend/src/services/aiAnalysis.service.js
// PURPOSE: Complete AI analysis service supporting background scan persistence & on-demand finding remediation

import mongoose from "mongoose";

import environment from "../config/environment.js";
import { analyzeScanFindings } from "../ai/analyzer.js";
import { analyzeFinding } from "../ai/findingAnalyzer.js";

import * as aiAnalysisRepository from "../database/repositories/aiAnalysis.repository.js";
import * as findingRepository from "../database/repositories/finding.repository.js";
import * as evidenceRepository from "../database/repositories/evidence.repository.js";
import * as scanRepository from "../database/repositories/scan.repository.js";
import * as targetRepository from "../database/repositories/target.repository.js";
import Finding from "../database/models/finding.model.js";
import { resolveEffectivePlanName } from "../access/subscription.service.js";

const createServiceError = (code, message, statusCode = 400) => {
  const error = new Error(message);
  error.code = code;
  error.statusCode = statusCode;
  return error;
};

const assertOwnerId = (ownerId) => {
  if (!ownerId) {
    throw createServiceError("OWNER_ID_REQUIRED", "Owner ID is required.", 401);
  }

  if (!mongoose.isValidObjectId(ownerId)) {
    throw createServiceError(
      "INVALID_OWNER_ID",
      "Owner ID must be a valid ObjectId.",
      400,
    );
  }

  return new mongoose.Types.ObjectId(ownerId);
};

const assertScanId = (scanId) => {
  if (!scanId) {
    throw createServiceError("SCAN_ID_REQUIRED", "Scan ID is required.", 400);
  }

  if (!mongoose.isValidObjectId(scanId)) {
    throw createServiceError(
      "INVALID_SCAN_ID",
      "Scan ID must be a valid ObjectId.",
      400,
    );
  }

  return new mongoose.Types.ObjectId(scanId);
};

const assertFindingId = (findingId) => {
  if (!findingId) {
    throw createServiceError(
      "FINDING_ID_REQUIRED",
      "Finding ID is required.",
      400,
    );
  }

  if (!mongoose.isValidObjectId(findingId)) {
    throw createServiceError(
      "INVALID_FINDING_ID",
      "Finding ID must be a valid ObjectId.",
      400,
    );
  }

  return new mongoose.Types.ObjectId(findingId);
};

/**
 * Persist an AI analysis result into the aiAnalysis collection
 * and immediately enrich the associated Finding document.
 */
const persistFindingAnalysis = async ({ ownerId, scanId, analysis }) => {
  const findingId = analysis?.findingId;

  if (!findingId) {
    return null;
  }

  const status = analysis?.status;

  if (status !== "completed" && status !== "failed") {
    return null;
  }

  const analysisPayload = {
    ownerId,
    scanId,
    findingId,
    status,
    provider: analysis?.provider ?? null,
    model: analysis?.model ?? null,
    analysisType: "finding",
    result: status === "completed" ? (analysis?.analysis ?? null) : null,
    inputFingerprint: analysis?.fingerprint ?? null,
    errorCode: status === "failed" ? "AI_ANALYSIS_FAILED" : null,
    errorMessage:
      status === "failed" ? (analysis?.error ?? "AI analysis failed.") : null,
    completedAt: new Date(),
  };

  let savedDoc = null;
  try {
    savedDoc = await aiAnalysisRepository.upsertByFinding(analysisPayload);
  } catch {
    savedDoc = await aiAnalysisRepository.create(analysisPayload);
  }

  // Enrich the Finding document itself with full AI analysis and AI remediation
  if (status === "completed" && analysis?.analysis) {
    try {
      const findingUpdates = {
        aiAnalysis: {
          status,
          provider: analysis?.provider ?? null,
          model: analysis?.model ?? null,
          summary: analysis?.analysis?.summary ?? null,
          impact: analysis?.analysis?.impact ?? null,
          rootCause: analysis?.analysis?.rootCause ?? null,
          uncertainty: analysis?.analysis?.uncertainty ?? null,
          remediation: analysis?.analysis?.remediation ?? null,
          completedAt: new Date(),
        },
      };

      if (analysis.analysis.remediation?.summary) {
        findingUpdates.remediation = analysis.analysis.remediation.summary;
      }

      await Finding.findOneAndUpdate(
        { _id: findingId, ownerId },
        { $set: findingUpdates },
      );
    } catch {
      // Do not block overall pipeline on finding document enrichment
    }
  }

  return savedDoc;
};

/**
 * Analyze all findings in a scan and persist results to both DB collections.
 */
const analyzeAndPersistFindings = async ({
  ownerId,
  scanId,
  findings = [],
  evidence = [],
  target = null,
}) => {
  const normalizedOwnerId = assertOwnerId(ownerId);
  const normalizedScanId = assertScanId(scanId);

  if (!Array.isArray(findings) || findings.length === 0) {
    return {
      enabled: false,
      status: "no_findings",
      analyses: [],
      persisted: [],
      persistenceErrors: [],
    };
  }

  if (!environment.ai.enabled) {
    return {
      enabled: false,
      status: "disabled",
      analyses: [],
      persisted: [],
      persistenceErrors: [],
    };
  }

  const analysisResult = await analyzeScanFindings({
    findings,
    evidence,
    target,
  });

  const persisted = [];
  const persistenceErrors = [];

  for (const analysis of analysisResult.analyses) {
    try {
      const saved = await persistFindingAnalysis({
        ownerId: normalizedOwnerId,
        scanId: normalizedScanId,
        analysis,
      });

      if (saved) {
        persisted.push(saved);
      }
    } catch (error) {
      persistenceErrors.push({
        findingId: analysis?.findingId ?? null,
        errorCode: error?.code ?? "AI_ANALYSIS_PERSISTENCE_FAILED",
        errorMessage: error?.message ?? "Failed to persist AI analysis.",
      });
    }
  }

  return {
    enabled: analysisResult.enabled,
    status: analysisResult.status,
    analyses: analysisResult.analyses,
    persisted,
    persistenceErrors,
  };
};

/**
 * Retrieve all AI analyses for a scan.
 */
const getScanAiAnalyses = async ({ ownerId, scanId }) => {
  const normalizedOwnerId = assertOwnerId(ownerId);
  const normalizedScanId = assertScanId(scanId);

  return aiAnalysisRepository.findByScanId(normalizedOwnerId, normalizedScanId);
};

/**
 * Retrieve the AI analysis and recommendations for a single finding.
 */
const getFindingAiAnalysis = async ({ ownerId, findingId }) => {
  const normalizedOwnerId = assertOwnerId(ownerId);
  const normalizedFindingId = assertFindingId(findingId);

  // 1. Try finding from aiAnalysis repository
  const analysis = await aiAnalysisRepository.findLatestByFindingId(
    normalizedOwnerId,
    normalizedFindingId,
  );

  if (analysis) {
    return analysis;
  }

  // 2. Check the Finding document directly
  const finding = await Finding.findOne({
    _id: normalizedFindingId,
    ownerId: normalizedOwnerId,
  }).lean();

  if (!finding) {
    throw createServiceError(
      "FINDING_NOT_FOUND",
      "Finding was not found.",
      404,
    );
  }

  if (finding.aiAnalysis) {
    return {
      findingId: finding._id,
      scanId: finding.scanId,
      status: finding.aiAnalysis.status || "completed",
      provider: finding.aiAnalysis.provider || environment.ai.provider,
      model: finding.aiAnalysis.model || environment.ai.model,
      analysisType: "finding",
      result: finding.aiAnalysis,
      completedAt: finding.aiAnalysis.completedAt || new Date(),
    };
  }

  return null;
};

/**
 * Restrict AI generation strictly to Pro and Enterprise tiers.
 */
const assertAiTierAccess = async ({ ownerId, isGuest = false, reqUser = null }) => {
  if (isGuest) {
    throw createServiceError(
      "AI_TIER_RESTRICTED",
      "AI Security Advisory is exclusive to Pro and Enterprise tiers. Please sign in or upgrade to access automated AI intelligence.",
      403,
    );
  }

  if (reqUser) {
    if (["admin", "security_engineer", "developer", "malware_analyst"].includes(reqUser.role)) {
      return "enterprise";
    }
    const tier = (reqUser.subscriptionTier || "free").toLowerCase();
    const status = reqUser.subscriptionStatus || "active";
    if (["active", "trial"].includes(status) && (tier === "pro" || tier === "enterprise")) {
      return tier;
    }
    throw createServiceError(
      "AI_TIER_RESTRICTED",
      "AI Security Advisory is exclusive to Pro and Enterprise plans. Please upgrade your subscription to access AI intelligence.",
      403,
    );
  }

  try {
    const planName = await resolveEffectivePlanName({
      userId: ownerId,
      isGuest,
    });

    if (planName !== "pro" && planName !== "enterprise") {
      throw createServiceError(
        "AI_TIER_RESTRICTED",
        "AI Security Advisory is exclusive to Pro and Enterprise plans. Please upgrade your subscription to access AI intelligence.",
        403,
      );
    }

    return planName;
  } catch (err) {
    if (err.code === "AI_TIER_RESTRICTED") throw err;
    throw createServiceError(
      "AI_TIER_RESTRICTED",
      "AI Security Advisory is exclusive to Pro and Enterprise plans. Please upgrade your subscription to access AI intelligence.",
      403,
    );
  }
};

/**
 * On-demand trigger of AI analysis for a specific finding.
 */
const analyzeFindingOnDemand = async ({
  ownerId,
  findingId,
  isGuest = false,
  reqUser = null,
}) => {
  const normalizedOwnerId = assertOwnerId(ownerId);
  const normalizedFindingId = assertFindingId(findingId);

  // Enforce tier entitlement: Pro & Enterprise only
  await assertAiTierAccess({ ownerId: normalizedOwnerId, isGuest, reqUser });

  const finding = await findingRepository.findById(
    normalizedOwnerId,
    normalizedFindingId,
  );

  if (!finding) {
    throw createServiceError(
      "FINDING_NOT_FOUND",
      "Finding was not found.",
      404,
    );
  }

  // Retrieve associated scan to get targetUrl and targetId
  const scan = await scanRepository.findById(normalizedOwnerId, finding.scanId);
  let target = null;
  if (scan?.targetId) {
    target = await targetRepository.findById(normalizedOwnerId, scan.targetId);
  }

  // Retrieve associated evidence
  let evidence = [];
  if (Array.isArray(finding.evidenceIds) && finding.evidenceIds.length > 0) {
    const scanEvidence = await evidenceRepository.listByScan(
      normalizedOwnerId,
      finding.scanId,
    );
    evidence = scanEvidence.filter((e) =>
      finding.evidenceIds.some((id) => String(id) === String(e._id)),
    );
  }

  const analysisResult = await analyzeFinding({
    finding,
    evidence,
    target: target || { url: scan?.targetUrl || finding.location?.url },
  });

  const saved = await persistFindingAnalysis({
    ownerId: normalizedOwnerId,
    scanId: finding.scanId,
    analysis: {
      findingId: finding._id,
      fingerprint: finding.fingerprint,
      ...analysisResult,
    },
  });

  return {
    findingId: finding._id,
    scanId: finding.scanId,
    ...analysisResult,
    persisted: saved,
  };
};

/**
 * On-demand trigger of AI analysis for an entire scan.
 */
const analyzeScanOnDemand = async ({
  ownerId,
  scanId,
  isGuest = false,
  reqUser = null,
}) => {
  const normalizedOwnerId = assertOwnerId(ownerId);
  const normalizedScanId = assertScanId(scanId);

  // Enforce tier entitlement: Pro & Enterprise only
  await assertAiTierAccess({ ownerId: normalizedOwnerId, isGuest, reqUser });

  const scan = await scanRepository.findById(normalizedOwnerId, normalizedScanId);
  if (!scan) {
    throw createServiceError("SCAN_NOT_FOUND", "Scan was not found.", 404);
  }

  let target = null;
  if (scan.targetId) {
    target = await targetRepository.findById(normalizedOwnerId, scan.targetId);
  }

  const [findings, evidence] = await Promise.all([
    findingRepository.listByScan(normalizedOwnerId, normalizedScanId),
    evidenceRepository.listByScan(normalizedOwnerId, normalizedScanId),
  ]);

  return analyzeAndPersistFindings({
    ownerId: normalizedOwnerId,
    scanId: normalizedScanId,
    findings,
    evidence,
    target: target || { url: scan.targetUrl },
  });
};

export {
  assertAiTierAccess,
  analyzeAndPersistFindings,
  persistFindingAnalysis,
  getScanAiAnalyses,
  getFindingAiAnalysis,
  analyzeFindingOnDemand,
  analyzeScanOnDemand,
};
