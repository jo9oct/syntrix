// STATUS: UPDATED
// FILE: backend/src/controllers/payment.controller.js

import { randomBytes } from "node:crypto";

import {
  chapaService,
  SUBSCRIPTION_PLANS,
} from "../services/chapa.service.js";

import { Transaction } from "../models/Transaction.js";
import { User } from "../models/User.js";

const getPlan = (tier) =>
  SUBSCRIPTION_PLANS.find((plan) => plan.id === tier);

const getErrorMessage = (error) =>
  error instanceof Error ? error.message : "Unexpected payment error";

const sendPaymentError = (res, error, message) => {
  console.error("[Payment]", message, getErrorMessage(error));

  return res.status(500).json({
    success: false,
    error: message,
  });
};

/**
 * Public plan catalog.
 */
export const getPlans = async (req, res) => {
  return res.status(200).json({
    success: true,
    data: SUBSCRIPTION_PLANS,
    currency: "ETB",
  });
};

/**
 * Retrieve the authenticated user's subscription and recent transactions.
 */
export const getCurrentSubscription = async (req, res) => {
  try {
    const user = await User.findById(req.user?._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found",
      });
    }

    const transactions = await Transaction.find({ userId: user._id })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    const tier = user.subscriptionTier || "free";

    return res.status(200).json({
      success: true,
      data: {
        tier,
        status: user.subscriptionStatus || "active",
        expiresAt: user.subscriptionExpiresAt || null,
        plan: getPlan(tier) || getPlan("free"),
        transactions,
      },
    });
  } catch (error) {
    return sendPaymentError(
      res,
      error,
      "Failed to retrieve subscription",
    );
  }
};

/**
 * Initiate a payment using a server-selected plan.
 *
 * The client cannot choose the tier, amount, currency, or billing cycle.
 */
const initializePaymentForPlan = async (req, res, tier) => {
  try {
    const user = await User.findById(req.user?._id);

    if (!user || !user.isActive) {
      return res.status(403).json({
        success: false,
        error: "An active user account is required",
      });
    }

    const plan = getPlan(tier);

    if (!plan || plan.id === "free") {
      return res.status(400).json({
        success: false,
        error: "The requested paid plan is not available",
      });
    }

    // All pricing values are obtained from the server's plan catalog.
    const amount = plan.priceETB;
    const currency = "ETB";
    const billingCycle = "monthly";

    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(503).json({
        success: false,
        error: "The plan price is not configured correctly",
      });
    }

    const name = String(user.name || "").trim();
    const email = String(user.email || "").trim().toLowerCase();

    if (!name || !email || !email.includes("@")) {
      return res.status(400).json({
        success: false,
        error: "A valid name and email are required on your account",
      });
    }

    const configuredReturnUrl = process.env.CHAPA_RETURN_URL;

    if (!configuredReturnUrl) {
      return res.status(503).json({
        success: false,
        error: "CHAPA_RETURN_URL is not configured",
      });
    }

    let returnUrl;

    try {
      returnUrl = new URL(configuredReturnUrl);
    } catch {
      return res.status(503).json({
        success: false,
        error: "CHAPA_RETURN_URL is invalid",
      });
    }

    if (returnUrl.protocol !== "https:") {
      return res.status(503).json({
        success: false,
        error: "CHAPA_RETURN_URL must use HTTPS",
      });
    }

    const callbackUrl = process.env.CHAPA_WEBHOOK_URL || undefined;

    if (callbackUrl) {
      let parsedCallbackUrl;

      try {
        parsedCallbackUrl = new URL(callbackUrl);
      } catch {
        return res.status(503).json({
          success: false,
          error: "CHAPA_WEBHOOK_URL is invalid",
        });
      }

      if (parsedCallbackUrl.protocol !== "https:") {
        return res.status(503).json({
          success: false,
          error: "CHAPA_WEBHOOK_URL must use HTTPS",
        });
      }
    }

    const tx_ref = `stx-${randomBytes(18).toString("hex")}`;

    const nameParts = name.split(/\s+/);
    const firstName = nameParts[0] || "User";
    const lastName = nameParts.slice(1).join(" ") || "Customer";

    returnUrl.searchParams.set("tx_ref", tx_ref);
    returnUrl.searchParams.set("status", "verify");

    // Persist the expected payment before contacting Chapa.
    const transaction = await Transaction.create({
      userId: user._id,
      tx_ref,
      amount,
      currency,
      tier: plan.id,
      billingCycle,
      status: "pending",
      customerName: name,
      customerEmail: email,
    });

    try {
      const chapaResult = await chapaService.initializePayment({
        amount,
        currency,
        email,
        firstName,
        lastName,
        tx_ref,
        returnUrl: returnUrl.toString(),
        callbackUrl,
        customizationTitle: `Sentrix ${plan.name}`,
        customizationDescription: "Monthly Sentrix subscription",
      });

      if (!chapaResult?.checkoutUrl) {
        throw new Error("Chapa did not return a checkout URL");
      }

      transaction.checkoutUrl = chapaResult.checkoutUrl;
      await transaction.save();

      return res.status(200).json({
        success: true,
        message: "Payment initialized",
        data: {
          tx_ref,
          checkoutUrl: chapaResult.checkoutUrl,
          tier: plan.id,
          amount,
          currency,
          billingCycle,
          isSimulated: Boolean(chapaResult.isSimulated),
        },
      });
    } catch (error) {
      transaction.status = "failed";
      await transaction.save();
      throw error;
    }
  } catch (error) {
    return sendPaymentError(
      res,
      error,
      "Payment initialization failed",
    );
  }
};

export const initializeProPayment = async (req, res) =>
  initializePaymentForPlan(req, res, "pro");

export const initializeEnterprisePayment = async (req, res) =>
  initializePaymentForPlan(req, res, "enterprise");

/**
 * Verify a stored transaction directly with Chapa.
 *
 * No application JWT is required. The stored transaction determines
 * the user and plan; client input never determines either.
 */
const verifyAndActivatePayment = async (tx_ref) => {
  const transaction = await Transaction.findOne({ tx_ref });

  if (!transaction) {
    return {
      httpStatus: 404,
      body: {
        success: false,
        error: "Transaction not found",
      },
    };
  }

  if (transaction.status === "success") {
    return {
      httpStatus: 200,
      body: {
        success: true,
        message: "Payment has already been verified",
        data: {
          tx_ref: transaction.tx_ref,
          tier: transaction.tier,
          amount: transaction.amount,
          currency: transaction.currency,
          status: transaction.status,
        },
      },
    };
  }

  if (transaction.status !== "pending") {
    return {
      httpStatus: 409,
      body: {
        success: false,
        error: "This transaction is not pending verification",
      },
    };
  }

  if (!transaction.userId) {
    return {
      httpStatus: 400,
      body: {
        success: false,
        error: "Transaction is not linked to a user",
      },
    };
  }

  const plan = getPlan(transaction.tier);

  if (!plan || plan.id === "free") {
    return {
      httpStatus: 400,
      body: {
        success: false,
        error: "Transaction contains an invalid subscription plan",
      },
    };
  }

  // Verify with Chapa. Never trust a browser redirect or webhook body.
  const result = await chapaService.verifyPayment(tx_ref);

  if (
    !result?.success ||
    result.status !== "success" ||
    result.tx_ref !== transaction.tx_ref
  ) {
    return {
      httpStatus: 409,
      body: {
        success: false,
        error: "Chapa has not confirmed a successful payment",
      },
    };
  }

  // Require the actual verified amount and currency to match.
  if (
    !Number.isFinite(Number(result.amount)) ||
    Number(result.amount) !== Number(transaction.amount) ||
    String(result.currency).toUpperCase() !==
      String(transaction.currency).toUpperCase()
  ) {
    return {
      httpStatus: 400,
      body: {
        success: false,
        error: "Verified payment details do not match the stored transaction",
      },
    };
  }

  const user = await User.findById(transaction.userId);

  if (!user || !user.isActive) {
    return {
      httpStatus: 400,
      body: {
        success: false,
        error: "The transaction user account is unavailable",
      },
    };
  }

  // Claim the pending transaction atomically to prevent repeated activation.
  const claimedTransaction = await Transaction.findOneAndUpdate(
    {
      _id: transaction._id,
      status: "pending",
    },
    {
      $set: {
        status: "success",
        paymentMethod: result.paymentMethod || "unknown",
        chapaReference: result.reference || undefined,
        verifiedAt: new Date(),
      },
    },
    {
      new: true,
      runValidators: true,
    },
  );

  if (!claimedTransaction) {
    const latestTransaction = await Transaction.findById(transaction._id);

    if (latestTransaction?.status === "success") {
      return {
        httpStatus: 200,
        body: {
          success: true,
          message: "Payment has already been verified",
          data: {
            tx_ref,
            tier: latestTransaction.tier,
            amount: latestTransaction.amount,
            currency: latestTransaction.currency,
            status: latestTransaction.status,
          },
        },
      };
    }

    return {
      httpStatus: 409,
      body: {
        success: false,
        error: "Transaction is already being processed or is no longer pending",
      },
    };
  }

  // Activate only the owner of the verified, stored transaction.
  const expiresAt = new Date();
  expiresAt.setDate(
    expiresAt.getDate() +
      (claimedTransaction.billingCycle === "annual" ? 365 : 30),
  );

  await User.findByIdAndUpdate(
    user._id,
    {
      $set: {
        subscriptionTier: claimedTransaction.tier,
        subscriptionStatus: "active",
        subscriptionExpiresAt: expiresAt,
        chapaCustomerRef: claimedTransaction.chapaReference,
      },
    },
    {
      runValidators: true,
    },
  );

  return {
    httpStatus: 200,
    body: {
      success: true,
      message: `Payment verified. Sentrix ${claimedTransaction.tier.toUpperCase()} subscription activated.`,
      data: {
        tx_ref,
        tier: claimedTransaction.tier,
        status: "active",
        expiresAt,
        amount: claimedTransaction.amount,
        currency: claimedTransaction.currency,
        paymentMethod: claimedTransaction.paymentMethod,
      },
    },
  };
};

/**
 * Public payment verification endpoint.
 */
export const verifyChapaPayment = async (req, res) => {
  const tx_ref = req.params.tx_ref;

  if (
    typeof tx_ref !== "string" ||
    tx_ref.length > 128 ||
    !/^stx-[a-f0-9]+$/i.test(tx_ref)
  ) {
    return res.status(400).json({
      success: false,
      error: "A valid transaction reference is required",
    });
  }

  try {
    const result = await verifyAndActivatePayment(tx_ref);

    return res.status(result.httpStatus).json(result.body);
  } catch (error) {
    return sendPaymentError(
      res,
      error,
      "Payment verification failed",
    );
  }
};

/**
 * Chapa webhook handler.
 *
 * The payload is not trusted as payment evidence. The server independently
 * verifies the referenced transaction with Chapa before activating a plan.
 */
export const handleChapaWebhook = async (req, res) => {
  const tx_ref = req.body?.tx_ref;

  if (
    typeof tx_ref !== "string" ||
    tx_ref.length > 128 ||
    !/^stx-[a-f0-9]+$/i.test(tx_ref)
  ) {
    return res.status(400).json({
      success: false,
      error: "A valid transaction reference is required",
    });
  }

  try {
    const result = await verifyAndActivatePayment(tx_ref);

    if (result.httpStatus >= 500) {
      return res.status(500).json({
        received: false,
        error: "Webhook processing failed",
      });
    }

    // A valid webhook delivery is acknowledged even if payment is not yet
    // confirmed; the client may use the public verification endpoint later.
    if (result.httpStatus === 200) {
      return res.status(200).json({
        received: true,
        verified: true,
      });
    }

    if (result.httpStatus === 409) {
      return res.status(200).json({
        received: true,
        verified: false,
      });
    }

    return res.status(result.httpStatus).json({
      received: false,
      error: result.body.error,
    });
  } catch (error) {
    return sendPaymentError(
      res,
      error,
      "Webhook processing failed",
    );
  }
};

/**
 * Downgrade the authenticated user's subscription to Free.
 */
export const cancelSubscription = async (req, res) => {
  try {
    const user = await User.findById(req.user?._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found",
      });
    }

    user.subscriptionTier = "free";
    user.subscriptionStatus = "canceled";
    user.subscriptionExpiresAt = new Date();

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Subscription downgraded to Free Community tier",
    });
  } catch (error) {
    return sendPaymentError(
      res,
      error,
      "Failed to cancel subscription",
    );
  }
};