// STATUS: UPDATED
// File: src/database/models/scanComparison.model.js

import mongoose from "mongoose";

const { Schema, model, models } = mongoose;

const scannerComparisonSchema = new Schema(
  {
    comparable: {
      type: [String],
      default: [],
    },
    baselineOnly: {
      type: [String],
      default: [],
    },
    comparisonOnly: {
      type: [String],
      default: [],
    },
    outcomeDataAvailable: {
      type: Boolean,
      default: false,
    },
  },
  {
    _id: false,
  },
);

const comparisonSummarySchema = new Schema(
  {
    added: {
      type: Number,
      required: true,
      min: 0,
    },
    persistent: {
      type: Number,
      required: true,
      min: 0,
    },
    resolved: {
      type: Number,
      required: true,
      min: 0,
    },
    comparableScanners: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  {
    _id: false,
  },
);

const scanComparisonSchema = new Schema(
  {
    ownerId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    targetId: {
      type: Schema.Types.ObjectId,
      ref: "Target",
      required: true,
      index: true,
    },
    baselineScanId: {
      type: Schema.Types.ObjectId,
      ref: "Scan",
      required: true,
    },
    comparisonScanId: {
      type: Schema.Types.ObjectId,
      ref: "Scan",
      required: true,
    },
    baselineVersion: {
      type: Number,
      default: null,
      min: 1,
    },
    comparisonVersion: {
      type: Number,
      default: null,
      min: 1,
    },
    baselineCompletedAt: {
      type: Date,
      default: null,
    },
    comparisonCompletedAt: {
      type: Date,
      required: true,
    },
    scannerComparison: {
      type: scannerComparisonSchema,
      required: true,
    },
    summary: {
      type: comparisonSummarySchema,
      required: true,
    },
    findings: {
      added: {
        type: [Schema.Types.Mixed],
        default: [],
      },
      persistent: {
        type: [Schema.Types.Mixed],
        default: [],
      },
      resolved: {
        type: [Schema.Types.Mixed],
        default: [],
      },
    },
    comparedAt: {
      type: Date,
      default: Date.now,
      required: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
    minimize: false,
  },
);

/*
 * Keep exactly one latest comparison document per owner and target.
 * The repository must use an atomic upsert to update this document.
 */
scanComparisonSchema.index(
  {
    ownerId: 1,
    targetId: 1,
  },
  {
    unique: true,
    name: "unique_latest_comparison_per_target",
  },
);

const ScanComparison =
  models.ScanComparison ?? model("ScanComparison", scanComparisonSchema);

export default ScanComparison;
