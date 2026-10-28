import mongoose, { Schema } from "mongoose";

const authSchema = new Schema(
  {
    userName: { type: String, unique: true, sparse: true, trim: true },
    name: { type: String, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: function () {
        return !this.googleId;
      },
    },
    role: {
      type: String,
      enum: [
        "user",
        "admin",
        "superAdmin",
        "client_owner",
        "client_member",
        "security_engineer",
        "developer",
        "malware_analyst",
      ],
      default: "user",
      required: true,
    },
    sessionToken: { type: String, default: "" },
    lastLogin: { type: Date, default: Date.now },
    status: {
      type: String,
      enum: ["inactive", "active", "suspended", "disabled"],
      default: "active",
    },
    isActive: { type: Boolean, default: true },

    organization: {
      type: String,
      trim: true,
      default: "",
    },
    isOwner: {
      type: Boolean,
      default: false,
    },
    isSecurityResponsible: {
      type: Boolean,
      default: false,
    },
    organizationOnboarded: {
      type: Boolean,
      default: true,
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

    // Google OAuth ID (optional for local users)
    googleId: { type: String, unique: true, sparse: true },

    // Authentication provider: local or Google
    provider: { type: String, enum: ["local", "google"], default: "local" },

    resetPasswordToken: String,
    resetpasswordExpiresAt: Date,

    verificationToken: String,
    verificationTokenExpiresAt: Date,
  },
  { timestamps: true }
);

// Map virtual id
authSchema.virtual("id").get(function () {
  return this._id.toHexString();
});
authSchema.set("toJSON", { virtuals: true });
authSchema.set("toObject", { virtuals: true });

// Map to "users" collection so all platform collections/seed actors are unified
const Auth = mongoose.models.Auth || mongoose.model("Auth", authSchema, "users");

export default Auth;

