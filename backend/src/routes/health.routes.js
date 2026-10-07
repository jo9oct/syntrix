import {
  Router
} from "express";

import {
  getHealthStatus,
  getApplicationMetrics
} from "../controllers/health.controller.js";

const router =
  Router();

router.get(
  "/",
  getHealthStatus
);

router.get(
  "/metrics",
  getApplicationMetrics
);

export default router;