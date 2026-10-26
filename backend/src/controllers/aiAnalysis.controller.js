// STATUS: CREATED
// FILE: backend/src/controllers/aiAnalysis.controller.js
// PURPOSE: Dedicated controller for AI vulnerability analysis, recommendations & remediations

import {
  getScanAiAnalyses as getScanAiAnalysesService,
  getFindingAiAnalysis as getFindingAiAnalysisService,
  analyzeScanOnDemand as analyzeScanOnDemandService,
  analyzeFindingOnDemand as analyzeFindingOnDemandService,
} from "../services/aiAnalysis.service.js";

import { getOwnerId } from "../middleware/authorization.middleware.js";

/**
 * GET /api/v1/ai-analysis/scans/:scanId
 * Retrieve all AI analyses for a scan
 */
const getScanAnalyses = async (req, res, next) => {
  try {
    const ownerId = getOwnerId(req);
    const analyses = await getScanAiAnalysesService({
      ownerId,
      scanId: req.params.scanId,
    });

    return res.status(200).json({
      success: true,
      data: {
        analyses,
      },
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * GET /api/v1/ai-analysis/findings/:findingId
 * Retrieve AI analysis, recommendations & remediation for a specific finding
 */
const getFindingAnalysis = async (req, res, next) => {
  try {
    const ownerId = getOwnerId(req);
    const analysis = await getFindingAiAnalysisService({
      ownerId,
      findingId: req.params.findingId,
    });

    return res.status(200).json({
      success: true,
      data: {
        analysis,
      },
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * POST /api/v1/ai-analysis/scans/:scanId/analyze
 * On-demand batch AI analysis for all findings in a scan (Pro & Enterprise only)
 */
const analyzeScan = async (req, res, next) => {
  try {
    const ownerId = getOwnerId(req);
    const isGuest = req.auth?.userType === "guest" || req.isGuest === true;
    const result = await analyzeScanOnDemandService({
      ownerId,
      scanId: req.params.scanId,
      isGuest,
      reqUser: req.user,
    });

    return res.status(200).json({
      success: true,
      message: "Scan findings analyzed successfully.",
      data: result,
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * POST /api/v1/ai-analysis/findings/:findingId/analyze
 * On-demand AI analysis for a single finding (Pro & Enterprise only)
 */
const analyzeFinding = async (req, res, next) => {
  try {
    const ownerId = getOwnerId(req);
    const isGuest = req.auth?.userType === "guest" || req.isGuest === true;
    const result = await analyzeFindingOnDemandService({
      ownerId,
      findingId: req.params.findingId,
      isGuest,
      reqUser: req.user,
    });

    return res.status(200).json({
      success: true,
      message: "Finding analyzed successfully.",
      data: result,
    });
  } catch (error) {
    return next(error);
  }
};

export {
  getScanAnalyses,
  getFindingAnalysis,
  analyzeScan,
  analyzeFinding,
};

