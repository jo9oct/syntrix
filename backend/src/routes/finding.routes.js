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

import { protect } from "../middleware/auth.js";

import { validate } from "../middleware/validation.middleware.js";

import {
  findingIdSchema,
  listFindingQuerySchema,
  updateFindingSchema,
} from "../validators/finding.validator.js";

const router = Router();

// Verify the JWT when supplied.
// Preserve guest access when no Authorization header is supplied.
const verifyBearerIfPresent = (req, res, next) => {
  const authorization = req.headers.authorization;

  if (authorization === undefined) {
    return next();
  }

  if (
    typeof authorization !== "string" ||
    !/^Bearer\s+\S+$/i.test(authorization)
  ) {
    return res.status(401).json({
      success: false,
      error: "Invalid Authorization header.",
    });
  }

  return protect(req, res, next);
};

// Authentication -> Authorization -> Ownership
router.use(
  verifyBearerIfPresent,
  requireAuthorization,
  requireOwner,
);

// GET /api/v1/findings
router.get(
  "/",
  validate(listFindingQuerySchema, "query"),
  listFindings,
);

// GET /api/v1/findings/:findingId
router.get(
  "/:findingId",
  validate(findingIdSchema, "params"),
  getFinding,
);

// PATCH /api/v1/findings/:findingId
router.patch(
  "/:findingId",
  validate(findingIdSchema, "params"),
  validate(updateFindingSchema, "body"),
  updateFinding,
);

export default router;