// STATUS: UPDATED
// FILE: src/routes/finding.routes.js

import { Router } from "express";

import {
  getFinding,
  listFindings,
  updateFinding,
} from "../controllers/finding.controller.js";

import {
  requireAuthorization,
  requireOwner,
} from "../middleware/authorization.middleware.js";

import { optionalProtect } from "../middleware/auth.js";

import { validate } from "../middleware/validation.middleware.js";

import {
  findingIdSchema,
  listFindingQuerySchema,
  updateFindingSchema,
} from "../validators/finding.validator.js";

const router = Router();

// Authentication (graceful) -> Authorization -> Ownership
router.use(optionalProtect, requireAuthorization, requireOwner);

// GET /api/v1/findings
router.get("/", validate(listFindingQuerySchema, "query"), listFindings);

// GET /api/v1/findings/:findingId
router.get("/:findingId", validate(findingIdSchema, "params"), getFinding);

// PATCH /api/v1/findings/:findingId
router.patch(
  "/:findingId",
  validate(findingIdSchema, "params"),
  validate(updateFindingSchema, "body"),
  updateFinding,
);

export default router;
