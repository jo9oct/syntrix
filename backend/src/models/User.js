import mongoose, { Schema } from "mongoose";

const userSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    password: {
      type: String,
      select: false,
    },

    role: {
      type: String,
      enum: [
        "admin",
        "client_owner",
        "client_member",
        "security_engineer",
        "developer",
        "malware_analyst",
      ],
      default: "client_member",
    },

    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
    },

    subscriptionTier: {
      type: String,
      enum: ["free", "pro", "enterprise"],
      default: "free",
    },

    subscriptionStatus: {
      type: String,
      enum: ["active", "inactive", "trial", "canceled"],
      default: "active",
    },

    subscriptionExpiresAt: {
      type: Date,
    },

    chapaCustomerRef: {
      type: String,
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    lastLogin: {
      type: Date,
    },
  },
  {
    timestamps: true,
  },
);

export const User = mongoose.model("User", userSchema);
