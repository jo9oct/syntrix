// STATUS: CREATED

import { Router } from "express";

import {
  listEvidenceByScan,
  getEvidence,
} from "../controllers/evidence.controller.js";

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

router.get(
  "/",
  requireAuthorization,
  requireOwner,
  validate(scanEvidenceQuerySchema, "query"),
  listEvidenceByScan,
);

router.get(
  "/:evidenceId",
  requireAuthorization,
  requireOwner,
  validate(evidenceIdSchema, "params"),
  getEvidence,
);

export default router;
