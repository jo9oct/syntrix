// STATUS: UPDATED

import express from "express";

import {
  createReport,
  getReport
} from "../controllers/report.controller.js";

import {
  requireAuthorization,
  requireOwner
} from "../middleware/authorization.middleware.js";

import {
  validate
} from "../middleware/validation.middleware.js";

import {
  createReportSchema,
  reportIdSchema
} from "../validators/report.validator.js";

const router =
  express.Router();

router.post(
  "/",
  requireAuthorization,
  requireOwner,
  validate(
    createReportSchema,
    "body"
  ),
  createReport
);

router.get(
  "/:reportId",
  requireAuthorization,
  requireOwner,
  validate(
    reportIdSchema,
    "params"
  ),
  getReport
);

export default router;