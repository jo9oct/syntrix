// STATUS: UPDATED
// FILE: src/routes/report.routes.js

import { Router } from "express";

import {
  createReport,
  getReport,
  getReportsByScan,
} from "../controllers/report.controller.js";

import { optionalProtect } from "../middleware/auth.js";

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

router.use(optionalProtect, requireAuthorization, requireOwner);

router.post("/", validate(createReportSchema, "body"), createReport);

router.get("/", validate(listReportQuerySchema, "query"), getReportsByScan);

router.get("/:reportId", validate(reportIdSchema, "params"), getReport);

export default router;
