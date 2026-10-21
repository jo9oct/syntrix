// STATUS: REPLACE
// FILE: src/controllers/payment.controller.js

import { randomBytes } from "node:crypto";

import { chapaService, SUBSCRIPTION_PLANS } from "../services/chapa.service.js";

import { Transaction } from "../models/Transaction.js";
import { User } from "../models/User.js";

const getPlan = (tier) => SUBSCRIPTION_PLANS.find((plan) => plan.id === tier);

const sendPaymentError = (res, error, message) => {
  // Do not log provider response bodies, authorization headers, or secrets.
  console.error("[Payment]", message, {
    name: error instanceof Error ? error.name : "UnknownError",
  });

  return res.status(500).json({
    success: false,
    error: message,
  });
};

const validTxRef = (value) =>
  typeof value === "string" &&
  value.length <= 128 &&
  /^stx-[a-f0-9]{36}$/i.test(value);

const getExpiryDate = (transaction) => {
  if (transaction.subscriptionExpiresAt) {
    return new Date(transaction.subscriptionExpiresAt);
  }

  // Backward compatibility for older successful transactions.
  const baseDate = transaction.verifiedAt || transaction.createdAt;

  if (!baseDate) {
    throw new Error("Transaction has no reliable verification timestamp.");
  }

  const expiresAt = new Date(baseDate);
  expiresAt.setDate(
    expiresAt.getDate() + (transaction.billingCycle === "annual" ? 365 : 30),
  );

  return expiresAt;
};

const transactionResponse = (transaction) => ({
  tx_ref: transaction.tx_ref,
  tier: transaction.tier,
  amount: transaction.amount,
  currency: transaction.currency,
  status: transaction.status,
  activationStatus: transaction.activationStatus,
  expiresAt: transaction.subscriptionExpiresAt || null,
});

/**
 * Public plan catalog.
 */
export const getPlans = async (req, res) =>
  res.status(200).json({
    success: true,
    data: SUBSCRIPTION_PLANS,
    currency: "ETB",
  });

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
      .select(
        "tx_ref amount currency tier billingCycle status activationStatus paymentMethod createdAt verifiedAt subscriptionExpiresAt",
      )
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
    return sendPaymentError(res, error, "Failed to retrieve subscription");
  }
};

/**
 * Initiate a payment using a server-selected plan.
 */
const initializePaymentForPlan = async (req, res, tier) => {
  let transaction;

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

    // Price, currency, and cycle are server-controlled.
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
    const email = String(user.email || "")
      .trim()
      .toLowerCase();

    if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
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

    if (
      returnUrl.protocol !== "https:" ||
      returnUrl.username ||
      returnUrl.password
    ) {
      return res.status(503).json({
        success: false,
        error: "CHAPA_RETURN_URL must be a valid HTTPS URL",
      });
    }

    const callbackUrl = process.env.CHAPA_WEBHOOK_URL || undefined;

    if (callbackUrl) {
      let parsedCallback;

      try {
        parsedCallback = new URL(callbackUrl);
      } catch {
        return res.status(503).json({
          success: false,
          error: "CHAPA_WEBHOOK_URL is invalid",
        });
      }

      if (
        parsedCallback.protocol !== "https:" ||
        parsedCallback.username ||
        parsedCallback.password
      ) {
        return res.status(503).json({
          success: false,
          error: "CHAPA_WEBHOOK_URL must be a valid HTTPS URL",
        });
      }
    }

    const tx_ref = `stx-${randomBytes(18).toString("hex")}`;
    const nameParts = name.split(/\s+/);

    returnUrl.searchParams.set("tx_ref", tx_ref);
    returnUrl.searchParams.set("status", "verify");

    // Create the authoritative transaction before contacting Chapa.
    transaction = await Transaction.create({
      userId: user._id,
      tx_ref,
      amount,
      currency,
      tier: plan.id,
      billingCycle,
      status: "pending",
      activationStatus: "pending",
      customerName: name,
      customerEmail: email,
    });

    const chapaResult = await chapaService.initializePayment({
      amount,
      currency,
      email,
      firstName: nameParts[0] || "User",
      lastName: nameParts.slice(1).join(" ") || "Customer",
      tx_ref,
      returnUrl: returnUrl.toString(),
      callbackUrl,
      customizationTitle: `Sentrix ${plan.name}`,
      customizationDescription: "Monthly Sentrix subscription",
    });

    if (!chapaResult?.checkoutUrl || chapaResult.tx_ref !== tx_ref) {
      throw new Error("Chapa returned an invalid initialization result.");
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
    // Do not mark a transaction failed just because a network request timed
    // out: Chapa may have created it even though our request lost the reply.
    // It remains pending and cannot activate without independent verification.
    return sendPaymentError(
      res,
      error,
      "Payment initialization failed. Check the transaction before retrying.",
    );
  }
};

export const initializeProPayment = (req, res) =>
  initializePaymentForPlan(req, res, "pro");

export const initializeEnterprisePayment = (req, res) =>
  initializePaymentForPlan(req, res, "enterprise");

/**
 * Complete subscription activation from an already verified transaction.
 *
 * Reapplying the same stored expiry date makes recovery idempotent:
 * retries do not add another 30 or 365 days.
 */
const completeSubscriptionActivation = async (transaction) => {
  if (transaction.status !== "success") {
    return {
      httpStatus: 409,
      body: {
        success: false,
        error: "Payment has not been verified successfully",
      },
    };
  }

  const plan = getPlan(transaction.tier);

  if (!plan || plan.id === "free" || !transaction.userId) {
    throw new Error("Verified transaction contains invalid subscription data.");
  }

  const expiresAt = getExpiryDate(transaction);

  if (!Number.isFinite(expiresAt.getTime())) {
    throw new Error("Transaction subscription expiry is invalid.");
  }

  const user = await User.findById(transaction.userId);

  if (!user || !user.isActive) {
    // Leave activationStatus pending so an operator can recover it after
    // restoring the account. Never silently mark activation complete.
    throw new Error("The transaction user is unavailable or inactive.");
  }

  const update = {
    subscriptionTier: transaction.tier,
    subscriptionStatus: "active",
    subscriptionExpiresAt: expiresAt,
  };

  if (transaction.chapaReference) {
    update.chapaCustomerRef = transaction.chapaReference;
  }

  const updatedUser = await User.findOneAndUpdate(
    {
      _id: user._id,
      isActive: true,
    },
    {
      $set: update,
    },
    {
      new: true,
      runValidators: true,
    },
  );

  if (!updatedUser) {
    throw new Error("Subscription activation could not update the user.");
  }

  const completedTransaction = await Transaction.findOneAndUpdate(
    {
      _id: transaction._id,
      status: "success",
      activationStatus: { $ne: "complete" },
    },
    {
      $set: {
        activationStatus: "complete",
        subscriptionExpiresAt: expiresAt,
      },
    },
    {
      new: true,
      runValidators: true,
    },
  );

  if (completedTransaction) {
    return {
      httpStatus: 200,
      body: {
        success: true,
        message: "Payment verified and subscription activated.",
        data: transactionResponse(completedTransaction),
      },
    };
  }

  // Another request may have completed the same activation concurrently.
  const latest = await Transaction.findById(transaction._id);

  if (latest?.status === "success" && latest.activationStatus === "complete") {
    return {
      httpStatus: 200,
      body: {
        success: true,
        message: "Payment has already been verified and activated.",
        data: transactionResponse(latest),
      },
    };
  }

  // User was updated, but the transaction completion marker did not persist.
  // A retry safely applies the same expiry date and finishes the marker.
  throw new Error(
    "Subscription was updated but activation tracking needs retry.",
  );
};

/**
 * Verify the payment with Chapa and recover any incomplete activation.
 */
const verifyAndActivatePayment = async (tx_ref) => {
  let transaction = await Transaction.findOne({ tx_ref });

  if (!transaction) {
    return {
      httpStatus: 404,
      body: {
        success: false,
        error: "Transaction not found",
      },
    };
  }

  // A previously verified transaction still needs activation recovery if the
  // database failed after payment verification.
  if (transaction.status === "success") {
    const activation = await completeSubscriptionActivation(transaction);

    // Refresh to return the persisted activation state.
    const latest = await Transaction.findById(transaction._id);

    if (latest?.activationStatus === "complete") {
      return {
        ...activation,
        body: {
          ...activation.body,
          data: transactionResponse(latest),
        },
      };
    }

    return activation;
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

  const plan = getPlan(transaction.tier);

  if (
    !plan ||
    plan.id === "free" ||
    !transaction.userId ||
    transaction.currency !== "ETB" ||
    !Number.isFinite(transaction.amount) ||
    transaction.amount <= 0
  ) {
    return {
      httpStatus: 400,
      body: {
        success: false,
        error: "Stored transaction details are invalid",
      },
    };
  }

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

  if (
    !Number.isFinite(Number(result.amount)) ||
    Number(result.amount) !== Number(transaction.amount) ||
    String(result.currency).toUpperCase() !== transaction.currency
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

  const now = new Date();
  const expiresAt = new Date(now);

  expiresAt.setDate(
    expiresAt.getDate() + (transaction.billingCycle === "annual" ? 365 : 30),
  );

  // Atomic claim: only one request changes pending to success.
  const claimedTransaction = await Transaction.findOneAndUpdate(
    {
      _id: transaction._id,
      status: "pending",
    },
    {
      $set: {
        status: "success",
        activationStatus: "pending",
        verifiedAt: now,
        subscriptionExpiresAt: expiresAt,
        ...(result.paymentMethod
          ? { paymentMethod: result.paymentMethod }
          : {}),
        ...(result.reference ? { chapaReference: result.reference } : {}),
      },
    },
    {
      new: true,
      runValidators: true,
    },
  );

  if (claimedTransaction) {
    // If this fails, the transaction stays success + activation pending.
    // A later verification/webhook retry can safely complete activation.
    return completeSubscriptionActivation(claimedTransaction);
  }

  // Another request won the atomic claim. Recover or report its final state.
  transaction = await Transaction.findById(transaction._id);

  if (transaction?.status === "success") {
    return completeSubscriptionActivation(transaction);
  }

  return {
    httpStatus: 409,
    body: {
      success: false,
      error: "Transaction is already being processed or is no longer pending",
    },
  };
};

/**
 * Public verification endpoint.
 *
 * The transaction reference identifies a transaction; Chapa verification,
 * stored amount, currency, and user ownership control activation.
 */
export const verifyChapaPayment = async (req, res) => {
  const tx_ref = req.params.tx_ref;

  if (!validTxRef(tx_ref)) {
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
      "Payment verification failed. Retry verification later.",
    );
  }
};

/**
 * Webhook payloads are not trusted as payment evidence.
 * The backend verifies the transaction directly with Chapa.
 */
export const handleChapaWebhook = async (req, res) => {
  const tx_ref = req.body?.tx_ref;

  if (!validTxRef(tx_ref)) {
    return res.status(400).json({
      received: false,
      error: "A valid transaction reference is required",
    });
  }

  try {
    const result = await verifyAndActivatePayment(tx_ref);

    if (result.httpStatus === 200) {
      return res.status(200).json({
        received: true,
        verified: true,
      });
    }

    if (result.httpStatus === 409) {
      // Chapa may retry later. Do not claim that payment was verified.
      return res.status(200).json({
        received: true,
        verified: false,
      });
    }

    if (result.httpStatus >= 500) {
      return res.status(500).json({
        received: false,
        error: "Webhook processing failed",
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
      "Webhook processing failed. Chapa may retry later.",
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
    return sendPaymentError(res, error, "Failed to cancel subscription");
  }
};
