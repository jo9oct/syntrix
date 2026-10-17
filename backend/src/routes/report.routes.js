// STATUS: UPDATED
// FILE: src/routes/report.routes.js

import { Router } from "express";

import {
  createReport,
  getReport,
  getReportsByScan,
} from "../controllers/report.controller.js";

import { protect } from "../middleware/auth.js";

import {
  requireAuthorization,
  requireOwner,
} from "../middleware/authorization.middleware.js";

import { validate } from "../middleware/validation.middleware.js";

import {
  createReportSchema,
  reportIdSchema,
  listReportQuerySchema,
} from "../validators/report.validator.js";

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

router.post(
  "/",
  validate(createReportSchema, "body"),
  createReport,
);

router.get(
  "/",
  validate(listReportQuerySchema, "query"),
  getReportsByScan,
);

router.get(
  "/:reportId",
  validate(reportIdSchema, "params"),
  getReport,
);

export default router;