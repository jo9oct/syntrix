// STATUS: CREATED

import { Router } from "express";

import {
  getCrawlSummary,
  getCrawlPages,
  getCrawlInputs,
} from "../controllers/crawl.controller.js";

import {
  requireAuthorization,
  requireOwner,
} from "../middleware/authorization.middleware.js";

import { validate } from "../middleware/validation.middleware.js";

import { scanIdSchema } from "../validators/scan.validator.js";

import { crawlPaginationSchema } from "../validators/crawl.validator.js";

const router = Router();

router.get(
  "/:scanId",
  requireAuthorization,
  requireOwner,
  validate(scanIdSchema, "params"),
  getCrawlSummary,
);

router.get(
  "/:scanId/pages",
  requireAuthorization,
  requireOwner,
  validate(scanIdSchema, "params"),
  validate(crawlPaginationSchema, "query"),
  getCrawlPages,
);

router.get(
  "/:scanId/inputs",
  requireAuthorization,
  requireOwner,
  validate(scanIdSchema, "params"),
  validate(crawlPaginationSchema, "query"),
  getCrawlInputs,
);

export default router;
