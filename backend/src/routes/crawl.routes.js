// STATUS: UPDATED
// FILE: src/routes/crawl.routes.js

import { Router } from "express";

import {
  getCrawlSummary,
  getCrawlPages,
  getCrawlInputs,
} from "../controllers/crawl.controller.js";

import { protect } from "../middleware/auth.js";

import {
  requireAuthorization,
  requireOwner,
} from "../middleware/authorization.middleware.js";

import { validate } from "../middleware/validation.middleware.js";

import { scanIdSchema } from "../validators/scan.validator.js";

import { crawlPaginationSchema } from "../validators/crawl.validator.js";

const router = Router();

/**
 * Verify a supplied Bearer token before authorization.
 * Requests without a Bearer token may continue through the
 * existing guest-session authorization flow.
 */
const verifyBearerTokenIfPresent = (req, res, next) => {
  const authorization = req.headers.authorization;
  const cookieHeader = req.headers.cookie;

  const hasBearer =
    typeof authorization === "string" && /^Bearer\b/i.test(authorization);
  const hasAuthCookie =
    typeof cookieHeader === "string" &&
    /sentrix_token|token|jwt/i.test(cookieHeader);

  if (hasBearer || hasAuthCookie) {
    return protect(req, res, next);
  }

  return next();
};

router.get(
  "/:scanId",
  verifyBearerTokenIfPresent,
  requireAuthorization,
  requireOwner,
  validate(scanIdSchema, "params"),
  getCrawlSummary,
);

router.get(
  "/:scanId/pages",
  verifyBearerTokenIfPresent,
  requireAuthorization,
  requireOwner,
  validate(scanIdSchema, "params"),
  validate(crawlPaginationSchema, "query"),
  getCrawlPages,
);

router.get(
  "/:scanId/inputs",
  verifyBearerTokenIfPresent,
  requireAuthorization,
  requireOwner,
  validate(scanIdSchema, "params"),
  validate(crawlPaginationSchema, "query"),
  getCrawlInputs,
);

export default router;
