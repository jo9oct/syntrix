// STATUS: UPDATED
// FILE: src/routes/target.routes.js

import { Router } from "express";

import {
  listTargetsController,
  getTargetController,
  getTargetScansController,
  getTargetTrendsController,
} from "../controllers/target.controller.js";

import { protect } from "../middleware/auth.js";

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

/**
 * Verify a supplied Bearer token before authorization.
 * Requests without a Bearer token retain the existing
 * guest-session authorization flow.
 */
const verifyBearerTokenIfPresent = (req, res, next) => {
  const authorization = req.headers.authorization;

  if (
    typeof authorization === "string" &&
    /^Bearer\b/i.test(authorization)
  ) {
    return protect(req, res, next);
  }

  return next();
};

router.use(verifyBearerTokenIfPresent, requireAuthorization, requireOwner);

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