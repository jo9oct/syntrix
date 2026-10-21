// STATUS: CREATED
// FILE: src/access/subscription.service.js

import mongoose from "mongoose";

import { User } from "../models/User.js";
import { normalizePlanName } from "./plan.service.js";

const createSubscriptionError = (message, statusCode, code) => {
  const error = new Error(message);

  error.statusCode = statusCode;
  error.code = code;

  return error;
};

const resolveEffectivePlanName = async ({ userId, isGuest = false }) => {
  // Guest scans always use the Free plan.
  if (isGuest) {
    return "free";
  }

  if (!userId || !mongoose.isValidObjectId(userId)) {
    throw createSubscriptionError(
      "A valid authenticated user is required to resolve the subscription.",
      401,
      "SUBSCRIPTION_USER_REQUIRED",
    );
  }

  const user = await User.findById(userId).select(
    "isActive subscriptionTier subscriptionStatus subscriptionExpiresAt",
  );

  if (!user) {
    throw createSubscriptionError(
      "The scan owner no longer exists.",
      404,
      "SUBSCRIPTION_USER_NOT_FOUND",
    );
  }

  if (user.isActive !== true) {
    throw createSubscriptionError(
      "The scan owner's account is inactive.",
      403,
      "SUBSCRIPTION_ACCOUNT_INACTIVE",
    );
  }

  const status = user.subscriptionStatus;
  const tier = normalizePlanName(user.subscriptionTier);

  // Free is the safe fallback for inactive or invalid subscriptions.
  if (!["active", "trial"].includes(status)) {
    return "free";
  }

  if (!["free", "pro", "enterprise"].includes(tier)) {
    return "free";
  }

  if (user.subscriptionExpiresAt) {
    const expiresAt = new Date(user.subscriptionExpiresAt).getTime();

    if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
      return "free";
    }
  }

  return tier;
};

export { resolveEffectivePlanName };
