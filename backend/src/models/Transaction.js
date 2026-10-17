import mongoose, { Schema } from "mongoose";

const transactionSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },

    tx_ref: {
      type: String,
      required: true,
      unique: true,
    },

    amount: {
      type: Number,
      required: true,
    },

    currency: {
      type: String,
      default: "ETB",
    },

    tier: {
      type: String,
      enum: ["free", "pro", "enterprise"],
      required: true,
    },

    billingCycle: {
      type: String,
      enum: ["monthly", "annual"],
      default: "monthly",
    },

    status: {
      type: String,
      enum: ["pending", "success", "failed"],
      default: "pending",
    },

    paymentMethod: {
      type: String,
    },

    chapaReference: {
      type: String,
    },

    customerEmail: {
      type: String,
      required: true,
    },

    customerName: {
      type: String,
      required: true,
    },

    customerPhone: {
      type: String,
    },

    checkoutUrl: {
      type: String,
    },

    verifiedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  },
);

export const Transaction = mongoose.model("Transaction", transactionSchema);
