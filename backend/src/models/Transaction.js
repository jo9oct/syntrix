// STATUS: REPLACE
// FILE: src/models/Transaction.js

import mongoose, { Schema } from "mongoose";

const transactionSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    tx_ref: {
      type: String,
      required: true,
      unique: true,
      immutable: true,
      trim: true,
      maxlength: 128,
      match: /^stx-[a-f0-9]+$/i,
    },

    amount: {
      type: Number,
      required: true,
      min: 0.01,
      validate: {
        validator: Number.isFinite,
        message: "Transaction amount must be finite.",
      },
    },

    currency: {
      type: String,
      required: true,
      enum: ["ETB"],
      default: "ETB",
      uppercase: true,
    },

    tier: {
      type: String,
      required: true,
      enum: ["pro", "enterprise"],
    },

    requestedRole: {
      type: String,
      enum: [
        "admin",
        "client_owner",
        "client_member",
        "security_engineer",
        "developer",
        "malware_analyst",
      ],
      default: "security_engineer",
    },

    billingCycle: {
      type: String,
      required: true,
      enum: ["monthly", "annual"],
      default: "monthly",
    },

    status: {
      type: String,
      required: true,
      enum: ["pending", "success", "failed"],
      default: "pending",
      index: true,
    },

    // "success" means Chapa verified the payment.
    // "complete" means the associated subscription update finished.
    activationStatus: {
      type: String,
      required: true,
      enum: ["pending", "complete"],
      default: "pending",
      index: true,
    },

    // Persisted once so a retry does not extend the same subscription again.
    subscriptionExpiresAt: {
      type: Date,
    },

    paymentMethod: {
      type: String,
      maxlength: 100,
    },

    chapaReference: {
      type: String,
      maxlength: 200,
    },

    customerEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      maxlength: 254,
    },

    customerName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },

    customerPhone: {
      type: String,
      maxlength: 32,
    },

    checkoutUrl: {
      type: String,
      maxlength: 2048,
    },

    verifiedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    strict: "throw",
  },
);

// unique:true declares a MongoDB index; verify that the index exists
// in the actual database, especially if indexes are managed manually.
transactionSchema.index({ userId: 1, createdAt: -1 });
transactionSchema.index({ status: 1, activationStatus: 1 });

export const Transaction = mongoose.model("Transaction", transactionSchema);
