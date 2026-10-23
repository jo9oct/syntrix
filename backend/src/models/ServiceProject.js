import mongoose, { Schema } from "mongoose";

const serviceProjectSchema = new Schema(
  {
    projectCode: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    orderId: {
      type: Schema.Types.ObjectId,
      ref: "ServiceOrder",
      required: true,
      index: true,
    },
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      index: true,
    },
    clientOwnerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
    },
    projectType: {
      type: String,
      enum: ["security_assessment", "secure_development", "malware_analysis"],
      required: true,
    },
    status: {
      type: String,
      enum: [
        "planning",
        "in_development",
        "ready_for_security_review",
        "in_security_testing",
        "remediation_in_progress",
        "final_approval",
        "completed",
        "archived",
      ],
      default: "planning",
      index: true,
    },
    progress: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    deadline: {
      type: Date,
    },
    assignedDevelopers: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    assignedSecurityEngineers: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    assignedMalwareAnalysts: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    targetId: {
      type: Schema.Types.ObjectId,
      ref: "Target",
    },
    linkedScanIds: [
      {
        type: Schema.Types.ObjectId,
        ref: "Scan",
      },
    ],
    deliverables: [
      {
        title: { type: String, required: true },
        description: { type: String, default: "" },
        url: { type: String, required: true },
        submittedBy: { type: Schema.Types.ObjectId, ref: "User" },
        submittedAt: { type: Date, default: Date.now },
      },
    ],
    signOffs: {
      securityLead: {
        isApproved: { type: Boolean, default: false },
        signedBy: { type: Schema.Types.ObjectId, ref: "User" },
        signedAt: { type: Date },
        notes: { type: String, default: "" },
      },
      adminLead: {
        isApproved: { type: Boolean, default: false },
        signedBy: { type: Schema.Types.ObjectId, ref: "User" },
        signedAt: { type: Date },
        notes: { type: String, default: "" },
      },
      clientAcceptance: {
        isAccepted: { type: Boolean, default: false },
        acceptedBy: { type: Schema.Types.ObjectId, ref: "User" },
        acceptedAt: { type: Date },
        feedback: { type: String, default: "" },
      },
    },
  },
  {
    timestamps: true,
  },
);

export const ServiceProject = mongoose.model("ServiceProject", serviceProjectSchema);

