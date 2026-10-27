// STATUS: UPDATED
// FILE: src/routes/evidence.routes.js

import { Router } from "express";

import {
  listEvidenceByScan,
  getEvidence,
} from "../controllers/evidence.controller.js";

import { optionalProtect } from "../middleware/auth.js";

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

router.use(optionalProtect, requireAuthorization, requireOwner);

router.get("/", validate(scanEvidenceQuerySchema, "query"), listEvidenceByScan);

router.get("/:evidenceId", validate(evidenceIdSchema, "params"), getEvidence);

export default router;
