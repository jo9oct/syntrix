// STATUS: UPDATED
// FILE: src/routes/payment.routes.js

import { Router } from "express";

import {
  getPlans,
  getCurrentSubscription,
  initializeProPayment,
  initializeEnterprisePayment,
  verifyChapaPayment,
  handleChapaWebhook,
  cancelSubscription,
} from "../controllers/payment.controller.js";

import { protect } from "../middleware/auth.js";

const router = Router();

// Public subscription plan catalog.
router.get("/plans", getPlans);

// Authenticated subscription endpoints.
router.get("/subscription", protect, getCurrentSubscription);
router.post("/subscription/cancel", protect, cancelSubscription);

// Authenticated, server-selected subscription plans.
router.post("/chapa/pro/initialize", protect, initializeProPayment);
router.post(
  "/chapa/enterprise/initialize",
  protect,
  initializeEnterprisePayment,
);

// Require authentication for payment verification.
router.get("/chapa/verify/:tx_ref", protect, verifyChapaPayment);

// Chapa server-to-server callback.
// Webhook authenticity must be verified in the controller/service.
router.post("/chapa/webhook", handleChapaWebhook);

export default router;