// STATUS: CREATED
// FILE: backend/src/routes/aiAnalysis.routes.js
// PURPOSE: Dedicated routing for AI recommendations, remediations & on-demand security analysis

import { Router } from "express";

import {
  getScanAnalyses,
  getFindingAnalysis,
  analyzeScan,
  analyzeFinding,
} from "../controllers/aiAnalysis.controller.js";

import {
  requireAuthorization,
  requireOwner,
} from "../middleware/authorization.middleware.js";

import { protect } from "../middleware/auth.js";
import { validate } from "../middleware/validation.middleware.js";

import {
  scanIdParamSchema,
  findingIdParamSchema,
} from "../validators/aiAnalysis.validator.js";

const router = Router();

/**
 * Verify a supplied Bearer token or auth cookie before authorization.
 * Unauthenticated requests fall back to guest session if valid.
 */
const verifyBearerTokenIfPresent = (req, res, next) => {
  const authorization = req.headers.authorization;
  const cookieHeader = req.headers.cookie;

  const hasBearer =
    typeof authorization === "string" && /^Bearer\b/i.test(authorization);
  const hasAuthCookie =
    typeof cookieHeader === "string" &&
    /sentrix_token|token|jwt/i.test(cookieHeader);

  if (hasBearer || hasAuthCookie) {
    return protect(req, res, next);
  }

  return next();
};

// Global route pipeline: Authentication -> Authorization -> Ownership
router.use(verifyBearerTokenIfPresent, requireAuthorization, requireOwner);

// GET /api/v1/ai-analysis/scans/:scanId
router.get("/scans/:scanId", validate(scanIdParamSchema, "params"), getScanAnalyses);

// POST /api/v1/ai-analysis/scans/:scanId/analyze
router.post(
  "/scans/:scanId/analyze",
  validate(scanIdParamSchema, "params"),
  analyzeScan,
);

// GET /api/v1/ai-analysis/findings/:findingId
router.get(
  "/findings/:findingId",
  validate(findingIdParamSchema, "params"),
  getFindingAnalysis,
);

// POST /api/v1/ai-analysis/findings/:findingId/analyze
router.post(
  "/findings/:findingId/analyze",
  validate(findingIdParamSchema, "params"),
  analyzeFinding,
);

export default router;

