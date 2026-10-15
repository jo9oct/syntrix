// STATUS: UPDATED

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

import { validate } from "../middleware/validation.middleware.js";

import {
  findingIdSchema,
  listFindingQuerySchema,
  updateFindingSchema,
} from "../validators/finding.validator.js";

const router = Router();

router.get(
  "/",
  requireAuthorization,
  requireOwner,
  validate(listFindingQuerySchema, "query"),
  listFindings,
);

router.get(
  "/:findingId",
  requireAuthorization,
  requireOwner,
  validate(findingIdSchema, "params"),
  getFinding,
);

router.patch(
  "/:findingId",
  requireAuthorization,
  requireOwner,
  validate(findingIdSchema, "params"),
  validate(updateFindingSchema, "body"),
  updateFinding,
);

export default router;
