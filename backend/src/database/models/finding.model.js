// STATUS: UPDATED

import mongoose from "mongoose";

const { Schema, model } = mongoose;

const findingSchema = new Schema(
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
      index: true,
    },

    targetId: {
      type: Schema.Types.ObjectId,
      ref: "Target",
      required: true,
      index: true,
    },

    scannerId: {
      type: String,
      required: true,
      trim: true,
      maxlength: 128,
    },

    category: {
      type: String,
      required: true,
      trim: true,
      maxlength: 128,
    },

    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },

    description: {
      type: String,
      required: true,
      maxlength: 10_000,
    },

    impact: {
      type: String,
      default: null,
      maxlength: 10_000,
    },

    severity: {
      type: String,
      enum: ["critical", "high", "medium", "low", "info"],
      required: true,
      index: true,
    },

    confidence: {
      type: String,
      enum: ["low", "medium", "high"],
      required: true,
      index: true,
    },

    status: {
      type: String,
      enum: ["detected", "verified", "false_positive", "accepted", "resolved"],
      default: "detected",
      index: true,
    },

    verificationStatus: {
      type: String,
      enum: ["pending", "verified", "rejected", "inconclusive"],
      default: "pending",
      index: true,
    },

    location: {
      url: {
        type: String,
        maxlength: 2048,
      },

      path: {
        type: String,
        maxlength: 2048,
      },

      parameter: {
        type: String,
        maxlength: 512,
      },

      method: {
        type: String,
        uppercase: true,
        maxlength: 16,
      },

      requestId: {
        type: String,
        maxlength: 256,
      },

      component: {
        type: String,
        maxlength: 512,
      },
    },

    evidenceIds: [
      {
        type: Schema.Types.ObjectId,
        ref: "Evidence",
      },
    ],

    verificationId: {
      type: Schema.Types.ObjectId,
      ref: "Verification",
      default: null,
    },

    references: [
      {
        type: {
          type: String,
          trim: true,
          maxlength: 64,
        },

        value: {
          type: String,
          trim: true,
          maxlength: 512,
        },

        url: {
          type: String,
          trim: true,
          maxlength: 2048,
        },
      },
    ],

    tags: [
      {
        type: String,
        trim: true,
        maxlength: 128,
      },
    ],

    fingerprint: {
      type: String,
      required: true,
      trim: true,
      maxlength: 256,
    },

    remediation: {
      type: String,
      default: null,
      maxlength: 10_000,
    },

    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },

    firstDetectedAt: {
      type: Date,
      default: Date.now,
    },

    lastDetectedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

findingSchema.index({
  ownerId: 1,
  scanId: 1,
});

findingSchema.index({
  ownerId: 1,
  targetId: 1,
  severity: 1,
});

findingSchema.index({
  ownerId: 1,
  scannerId: 1,
});

findingSchema.index({
  ownerId: 1,
  fingerprint: 1,
});

findingSchema.index(
  {
    scanId: 1,
    fingerprint: 1,
  },
  {
    unique: true,
  },
);

const Finding = model("Finding", findingSchema);

export default Finding;
