/* STATUS: UPDATED
 * FILE: src/database/models/scan.model.js
 */

import mongoose from "mongoose";

const { Schema, model, models } = mongoose;

const scopeSnapshotSchema = new Schema(
  {
    scopeId: {
      type: Schema.Types.ObjectId,
      ref: "Scope",
      required: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },

    hostnames: {
      type: [String],
      required: true,
      default: [],
    },

    ports: {
      type: [Number],
      required: true,
      default: [],
    },

    includeSubdomains: {
      type: Boolean,
      required: true,
      default: false,
    },

    schemaVersion: {
      type: Number,
      required: true,
      default: 1,
      min: 1,
    },

    capturedAt: {
      type: Date,
      required: true,
    },

    targetHostname: {
      type: String,
      required: true,
    },

    targetPort: {
      type: Number,
      required: true,
      min: 1,
      max: 65535,
    },
  },
  {
    _id: false,
  },
);

const scannerOutcomeSchema = new Schema(
  {
    scannerId: {
      type: String,
      required: true,
      trim: true,
    },

    status: {
      type: String,
      enum: ["pending", "running", "completed", "failed", "skipped"],
      required: true,
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
    },

    errorMessage: {
      type: String,
      default: null,
    },
  },
  {
    _id: false,
  },
);

const companyRuleEvaluationSchema = new Schema(
  {
    ruleId: {
      type: String,
      required: true,
    },

    ruleName: {
      type: String,
      default: null,
    },

    status: {
      type: String,
      enum: ["passed", "violated", "unsupported", "error"],
      required: true,
    },

    supported: {
      type: Boolean,
      default: false,
    },

    violated: {
      type: Boolean,
      default: false,
    },

    actual: {
      type: Schema.Types.Mixed,
      default: null,
    },

    expected: {
      type: Schema.Types.Mixed,
      default: null,
    },

    operator: {
      type: String,
      default: null,
    },

    scannerId: {
      type: String,
      default: null,
    },

    source: {
      type: String,
      default: null,
    },

    error: {
      type: Schema.Types.Mixed,
      default: null,
    },
  },
  {
    _id: false,
  },
);

const companyRuleAnalysisSchema = new Schema(
  {
    enabled: {
      type: Boolean,
      default: false,
    },

    rulesEvaluated: {
      type: Number,
      min: 0,
      default: 0,
    },

    violatedRules: {
      type: Number,
      min: 0,
      default: 0,
    },

    evaluations: {
      type: [companyRuleEvaluationSchema],
      default: [],
    },
  },
  {
    _id: false,
  },
);

const statusHistorySchema = new Schema(
  {
    from: {
      type: String,
      default: null,
    },

    to: {
      type: String,
      required: true,
    },

    changedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },

    reason: {
      type: String,
      default: null,
    },

    type: {
      type: String,
      enum: ["system", "user", "worker", "recovery", "purge"],
      default: "system",
    },

    actor: {
      type: Schema.Types.ObjectId,
      default: null,
    },
  },
  {
    _id: false,
  },
);

const scanSchema = new Schema(
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

    targetUrl: {
      type: String,
      required: true,
      trim: true,
    },

    // Reference to the saved scope used to create this scan.
    // The reference is informational; execution uses scopeSnapshot.
    scopeId: {
      type: Schema.Types.ObjectId,
      ref: "Scope",
      default: null,
      index: true,
    },

    // Immutable copy of the effective scope at scan creation.
    // Do not replace this from the saved Scope document during execution.
    scopeSnapshot: {
      type: scopeSnapshotSchema,
      default: undefined,
    },

    scanSelection: {
      recon: {
        type: [String],
        default: [],
      },

      security: {
        type: [String],
        default: [],
      },
    },

    companyRuleIds: {
      type: [Schema.Types.ObjectId],
      default: [],
    },

    companyRuleAnalysis: {
      type: companyRuleAnalysisSchema,
      default: undefined,
    },

    status: {
      type: String,
      enum: [
        "pending",
        "running",
        "completed",
        "failed",
        "cancelled",
        "deleted",
      ],
      default: "pending",
      required: true,
      index: true,
    },

    // Legacy scans may not have a version.
    // Versions are allocated by the target's atomic counter.
    version: {
      type: Number,
      min: 1,
      default: undefined,
    },

    scannerOutcomes: {
      type: [scannerOutcomeSchema],
      default: [],
    },

    startedAt: {
      type: Date,
      default: null,
    },

    completedAt: {
      type: Date,
      default: null,
    },

    cancelledAt: {
      type: Date,
      default: null,
    },

    failedAt: {
      type: Date,
      default: null,
    },

    deletedAt: {
      type: Date,
      default: null,
      index: true,
    },

    previousStatus: {
      type: String,
      enum: ["pending", "running", "completed", "failed", "cancelled"],
      default: null,
    },

    // Purge coordination. These fields do not change the scan's status.
    // A repository must claim a purge atomically before deleting resources.
    purgeToken: {
      type: String,
      default: null,
      select: false,
    },

    purgeLeaseUntil: {
      type: Date,
      default: null,
      select: false,
    },

    statusHistory: {
      type: [statusHistorySchema],
      default: [],
    },

    progress: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },

    totalScanners: {
      type: Number,
      min: 0,
      default: 0,
    },

    completedScanners: {
      type: Number,
      min: 0,
      default: 0,
    },

    findingCounts: {
      critical: {
        type: Number,
        default: 0,
      },

      high: {
        type: Number,
        default: 0,
      },

      medium: {
        type: Number,
        default: 0,
      },

      low: {
        type: Number,
        default: 0,
      },

      info: {
        type: Number,
        default: 0,
      },
    },

    riskScore: {
      type: Number,
      min: 0,
      max: 100,
      default: null,
    },

    errorCode: {
      type: String,
      default: null,
    },

    errorMessage: {
      type: String,
      default: null,
    },

    // Never persist usernames, passwords, cookies, or authentication tokens.
    credentials: {
      credentialProvided: {
        type: Boolean,
        default: false,
      },
    },

    idempotencyKey: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

scanSchema.index({
  ownerId: 1,
  createdAt: -1,
});

scanSchema.index({
  ownerId: 1,
  status: 1,
});

scanSchema.index({
  targetId: 1,
  createdAt: -1,
});

scanSchema.index(
  {
    ownerId: 1,
    idempotencyKey: 1,
  },
  {
    unique: true,
    partialFilterExpression: {
      idempotencyKey: {
        $type: "string",
      },
    },
  },
);

scanSchema.index({
  status: 1,
  deletedAt: 1,
});

scanSchema.index({
  status: 1,
  deletedAt: 1,
  purgeLeaseUntil: 1,
});

const Scan = models.Scan || model("Scan", scanSchema);

export default Scan;
