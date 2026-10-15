// STATUS: CREATED

import { Router } from "express";

import {
  listTargetsController,
  getTargetController,
  getTargetScansController,
  getTargetTrendsController,
} from "../controllers/target.controller.js";

import {
  requireAuthorization,
  requireOwner,
} from "../middleware/authorization.middleware.js";

import { validate } from "../middleware/validation.middleware.js";

import {
  targetIdSchema,
  targetListQuerySchema,
  targetHistoryQuerySchema,
} from "../validators/target.validator.js";

const router = Router();

router.use(requireAuthorization, requireOwner);

router.get(
  "/",
  validate(targetListQuerySchema, "query"),
  listTargetsController,
);

router.get(
  "/:targetId",
  validate(targetIdSchema, "params"),
  getTargetController,
);

router.get(
  "/:targetId/scans",
  validate(targetIdSchema, "params"),
  validate(targetHistoryQuerySchema, "query"),
  getTargetScansController,
);

router.get(
  "/:targetId/trends",
  validate(targetIdSchema, "params"),
  validate(targetHistoryQuerySchema, "query"),
  getTargetTrendsController,
);

export default router;
