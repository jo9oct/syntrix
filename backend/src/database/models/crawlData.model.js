// STATUS: CREATED

import mongoose from "mongoose";

const { Schema, model } = mongoose;

const crawlDataSchema = new Schema(
  {
    ownerId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },

    scanId: {
      type: Schema.Types.ObjectId,
      ref: "Scan",
      required: true,
      unique: true,
      index: true,
    },

    targetUrl: {
      type: String,
      required: true,
      maxlength: 2048,
    },

    plan: {
      type: String,
      enum: ["free", "pro", "enterprise"],
      required: true,
    },

    maxPaths: {
      type: Number,
      required: true,
      min: 1,
    },

    maxDepth: {
      type: Number,
      required: true,
      min: 0,
    },

    requestsPerSecond: {
      type: Number,
      required: true,
      min: 0.1,
    },

    status: {
      type: String,
      enum: ["pending", "running", "completed", "failed", "cancelled"],
      default: "pending",
      index: true,
    },

    pagesAttempted: {
      type: Number,
      default: 0,
      min: 0,
    },

    pagesSucceeded: {
      type: Number,
      default: 0,
      min: 0,
    },

    pagesFailed: {
      type: Number,
      default: 0,
      min: 0,
    },

    startedAt: {
      type: Date,
      default: null,
    },

    completedAt: {
      type: Date,
      default: null,
    },

    errorCode: {
      type: String,
      default: null,
      maxlength: 128,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

crawlDataSchema.index({
  ownerId: 1,
  scanId: 1,
});

const CrawlData =
  mongoose.models.CrawlData || model("CrawlData", crawlDataSchema);

export default CrawlData;
