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

import { optionalProtect } from "../middleware/auth.js";

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

// Verify registered users before authorization.
// Requests without a valid token gracefully proceed as guest sessions.
router.use(optionalProtect, requireAuthorization, requireOwner);

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
