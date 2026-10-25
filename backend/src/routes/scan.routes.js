// STATUS: UPDATED
// FILE: src/routes/scan.routes.js

import { Router } from "express";

import {
  listScansController,
  createScanController,
  getScanController,
  cancelScanController,
  getLatestComparisonResultController,
  deleteScanController,
  recoverScanController,
  listDeletedScansController,
} from "../controllers/scan.controller.js";

import {
  requireAuthorization,
  requireOwner,
} from "../middleware/authorization.middleware.js";

import { protect } from "../middleware/auth.js";

import { validate } from "../middleware/validation.middleware.js";

import {
  createScanSchema,
  scanIdSchema,
  cancelScanSchema,
} from "../validators/scan.validator.js";

import {
  scanIdParamsSchema,
  deletedScansQuerySchema,
} from "../validators/scanLifecycle.validator.js";

import { targetIdSchema } from "../validators/target.validator.js";

const router = Router();

const verifyBearerIfPresent = (req, res, next) => {
  const authorization = req.headers.authorization;
  const cookieHeader = req.headers.cookie;

  if (authorization === undefined) {
    if (
      typeof cookieHeader === "string" &&
      /sentrix_token|token|jwt/i.test(cookieHeader)
    ) {
      return protect(req, res, next);
    }
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

// Verify registered users before authorization.
// Requests without a token retain the existing guest-session flow.
router.use(verifyBearerIfPresent, requireAuthorization, requireOwner);

router.post("/", validate(createScanSchema, "body"), createScanController);
router.get("/", listScansController);

// Static routes must appear before "/:scanId".

router.get(
  "/deleted",
  validate(deletedScansQuerySchema, "query"),
  listDeletedScansController,
);

router.get(
  "/compare/:targetId/result",
  validate(targetIdSchema, "params"),
  getLatestComparisonResultController,
);

router.patch(
  "/:scanId/delete",
  validate(scanIdParamsSchema, "params"),
  deleteScanController,
);

router.patch(
  "/:scanId/recover",
  validate(scanIdParamsSchema, "params"),
  recoverScanController,
);

router.get("/:scanId", validate(scanIdSchema, "params"), getScanController);

router.post(
  "/:scanId/cancel",
  validate(scanIdSchema, "params"),
  cancelScanController,
);

export default router;
