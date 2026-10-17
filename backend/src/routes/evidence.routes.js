// STATUS: UPDATED
// FILE: src/routes/evidence.routes.js

import { Router } from "express";

import {
  listEvidenceByScan,
  getEvidence,
} from "../controllers/evidence.controller.js";

import { protect } from "../middleware/auth.js";

import {
  requireAuthorization,
  requireOwner,
} from "../middleware/authorization.middleware.js";

import { validate } from "../middleware/validation.middleware.js";

import {
  evidenceIdSchema,
  scanEvidenceQuerySchema,
} from "../validators/evidence.validator.js";

const router = Router();

const verifyBearerIfPresent = (req, res, next) => {
  const authorization = req.headers.authorization;

  // Preserve the existing guest-access flow when no token is supplied.
  if (authorization === undefined) {
    return next();
  }

  // Reject malformed Authorization headers.
  if (
    typeof authorization !== "string" ||
    !/^Bearer\s+\S+$/i.test(authorization)
  ) {
    return res.status(401).json({
      success: false,
      error: "Invalid Authorization header.",
    });
  }

  // Verify the supplied token before authorization middleware runs.
  return protect(req, res, next);
};

router.use(
  verifyBearerIfPresent,
  requireAuthorization,
  requireOwner,
);

router.get(
  "/",
  validate(scanEvidenceQuerySchema, "query"),
  listEvidenceByScan,
);

router.get(
  "/:evidenceId",
  validate(evidenceIdSchema, "params"),
  getEvidence,
);

export default router;