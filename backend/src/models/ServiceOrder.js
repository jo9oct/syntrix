import mongoose, { Schema } from "mongoose";

const serviceOrderSchema = new Schema(
  {
    orderNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    clientId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      index: true,
    },
    serviceType: {
      type: String,
      enum: ["security_assessment", "secure_development", "malware_analysis"],
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    requirements: {
      type: Schema.Types.Mixed,
      default: "",
    },
    targetUrl: {
      type: String,
      trim: true,
      default: "",
    },
    attachments: [
      {
        fileName: { type: String, default: "" },
        name: { type: String, default: "" },
        fileUrl: { type: String, default: "" },
        fileSize: { type: Number, default: 0 },
        fileType: { type: String, default: "" },
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    priority: {
      type: String,
      enum: ["low", "medium", "high", "critical"],
      default: "medium",
    },
    deadline: {
      type: Date,
    },
    status: {
      type: String,
      enum: [
        "submitted",
        "under_review",
        "info_requested",
        "accepted",
        "rejected",
        "converted_to_project",
        "in_progress",
        "completed",
        "canceled",
      ],
      default: "submitted",
      index: true,
    },
    rejectionReason: {
      type: String,
      default: "",
    },
    infoRequests: [
      {
        requestedBy: { type: Schema.Types.ObjectId, ref: "User" },
        question: { type: String, required: true },
        response: { type: String, default: "" },
        respondedAt: { type: Date },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    estimatedBudget: {
      amount: { type: Number, default: 0 },
      estimated: { type: Number, default: 0 },
      currency: { type: String, default: "USD" },
    },
    assignedLead: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    assignedTeam: {
      type: String,
      enum: [
        "developer",
        "development",
        "security_engineer",
        "security_engineering",
        "malware_analyst",
        "malware_analysis",
        "unassigned",
      ],
      default: "unassigned",
    },
    projectId: {
      type: Schema.Types.ObjectId,
      ref: "ServiceProject",
    },
    progress: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    phase: {
      type: String,
      default: "",
    },
    isDelivered: {
      type: Boolean,
      default: false,
    },
    deliveredAt: {
      type: Date,
    },
    comments: [
      {
        sender: {
          type: Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        senderRole: {
          type: String,
          default: "",
        },
        senderName: {
          type: String,
          default: "",
        },
        message: {
          type: String,
          required: true,
          trim: true,
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  {
    timestamps: true,
  },
);

export const ServiceOrder = mongoose.model("ServiceOrder", serviceOrderSchema);

