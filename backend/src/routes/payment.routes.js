// STATUS: REPLACE
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

// Public plan catalog.
router.get("/plans", getPlans);

// Authenticated subscription endpoints.
router.get("/subscription", protect, getCurrentSubscription);
router.post("/subscription/cancel", protect, cancelSubscription);

// The server determines the price and subscription plan.
router.post("/chapa/pro/initialize", protect, initializeProPayment);
router.post(
  "/chapa/enterprise/initialize",
  protect,
  initializeEnterprisePayment,
);

// Only authenticated users can request payment verification.
router.get("/chapa/verify/:tx_ref", protect, verifyChapaPayment);

// Chapa server-to-server callback.
// The controller independently verifies the transaction with Chapa.
router.post("/chapa/webhook", handleChapaWebhook);

export default router;
