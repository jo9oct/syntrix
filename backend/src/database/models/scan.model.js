// STATUS: UPDATED

import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const scanSelectionSchema = new Schema(
  {
    recon: {
      type: [String],
      default: [],
    },

    security: {
      type: [String],
      default: [],
    },
  },
  {
    _id: false,
  },
);

const scanCredentialsSchema = new Schema(
  {
    username: {
      type: String,
      trim: true,
      maxlength: 512,
    },

    credentialProvided: {
      type: Boolean,
      default: false,
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
      ref: 'Target',
      required: true,
      index: true,
    },

    targetUrl: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2048,
    },

    scanSelection: {
      type: scanSelectionSchema,
      required: true,
    },

    companyRuleIds: {
      type: [
        Schema.Types.ObjectId,
      ],
      ref: 'CompanyRule',
      default: [],
    },

    status: {
      type: String,
      enum: [
        'pending',
        'running',
        'completed',
        'failed',
        'cancelled',
      ],
      default: 'pending',
      index: true,
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

    progress: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },

    totalScanners: {
      type: Number,
      default: 0,
      min: 0,
    },

    completedScanners: {
      type: Number,
      default: 0,
      min: 0,
    },

    findingCounts: {
      critical: {
        type: Number,
        default: 0,
        min: 0,
      },

      high: {
        type: Number,
        default: 0,
        min: 0,
      },

      medium: {
        type: Number,
        default: 0,
        min: 0,
      },

      low: {
        type: Number,
        default: 0,
        min: 0,
      },

      info: {
        type: Number,
        default: 0,
        min: 0,
      },
    },

    riskScore: {
      type: Number,
      default: null,
      min: 0,
      max: 100,
    },

    errorCode: {
      type: String,
      default: null,
      trim: true,
      maxlength: 128,
    },

    errorMessage: {
      type: String,
      default: null,
      trim: true,
      maxlength: 2000,
    },

    credentials: {
      type: scanCredentialsSchema,
      default: null,
    },

    idempotencyKey: {
      type: String,
      default: null,
      trim: true,
      maxlength: 256,
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
        $type: 'string',
      },
    },
  },
);

const Scan = model('Scan', scanSchema);

export default Scan;