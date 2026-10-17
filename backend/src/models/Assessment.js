import mongoose, { Schema } from "mongoose";

const assessmentSchema = new Schema(
  {
    projectId: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },

    targetType: {
      type: String,
      enum: ["web_app", "api", "both"],
      required: true,
    },

    targetUrl: {
      type: String,
      required: true,
    },

    environment: {
      type: String,
      enum: ["development", "staging", "production"],
      required: true,
    },

    scanMode: {
      type: String,
      enum: ["specific", "full"],
      default: "full",
    },

    selectedTests: [
      {
        type: String,
      },
    ],

    intensity: {
      type: String,
      enum: ["light", "standard", "deep"],
      default: "standard",
    },

    authConfig: {
      type: Schema.Types.Mixed,
    },

    status: {
      type: String,
      enum: ["pending", "running", "completed", "failed", "cancelled"],
      default: "pending",
    },

    progress: {
      type: Number,
      default: 0,
    },

    totalTests: {
      type: Number,
      default: 0,
    },

    completedTests: {
      type: Number,
      default: 0,
    },

    startedAt: {
      type: Date,
    },

    completedAt: {
      type: Date,
    },

    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },

    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

export const Assessment = mongoose.model("Assessment", assessmentSchema);
