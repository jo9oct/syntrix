// STATUS: UPDATED

import mongoose from "mongoose";

const { Schema, model } = mongoose;

const requestSchema = new Schema(
  {
    method: {
      type: String,
      uppercase: true,
      maxlength: 16,
    },

    url: {
      type: String,
      maxlength: 2048,
    },

    headers: {
      type: Schema.Types.Mixed,
      default: {},
    },

    body: {
      type: String,
      maxlength: 20_000,
      default: null,
    },

    parameters: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    _id: false,
    versionKey: false,
  },
);

const responseSchema = new Schema(
  {
    statusCode: {
      type: Number,
      min: 100,
      max: 599,
    },

    headers: {
      type: Schema.Types.Mixed,
      default: {},
    },

    bodySnippet: {
      type: String,
      maxlength: 20_000,
      default: null,
    },

    contentType: {
      type: String,
      maxlength: 512,
      default: null,
    },

    bodyLength: {
      type: Number,
      min: 0,
      default: null,
    },
  },
  {
    _id: false,
    versionKey: false,
  },
);

const observationSchema = new Schema(
  {
    description: {
      type: String,
      maxlength: 10_000,
      default: null,
    },

    expected: {
      type: String,
      maxlength: 10_000,
      default: null,
    },

    actual: {
      type: String,
      maxlength: 10_000,
      default: null,
    },
  },
  {
    _id: false,
    versionKey: false,
  },
);

const evidenceSchema = new Schema(
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

    findingId: {
      type: Schema.Types.ObjectId,
      ref: "Finding",
      default: null,
      index: true,
    },

    scannerId: {
      type: String,
      trim: true,
      maxlength: 128,
      index: true,
    },

    type: {
      type: String,
      enum: [
        "request",
        "response",
        "http_exchange",
        "comparison",
        "header",
        "body",
        "dns",
        "certificate",
        "metadata",
      ],
      required: true,
    },

    request: {
      type: requestSchema,
      default: null,
    },

    response: {
      type: responseSchema,
      default: null,
    },

    observation: {
      type: observationSchema,
      default: null,
    },

    // Backward-compatible fields.
    method: {
      type: String,
      uppercase: true,
      maxlength: 16,
    },

    url: {
      type: String,
      maxlength: 2048,
    },

    statusCode: {
      type: Number,
      min: 100,
      max: 599,
    },

    headers: {
      type: Schema.Types.Mixed,
      default: {},
    },

    bodyExcerpt: {
      type: String,
      maxlength: 20_000,
    },

    summary: {
      type: String,
      maxlength: 5_000,
    },

    fingerprint: {
      type: String,
      trim: true,
      maxlength: 256,
      index: true,
    },

    sensitiveDataRedacted: {
      type: Boolean,
      default: true,
    },

    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

// Existing query indexes.
evidenceSchema.index({
  ownerId: 1,
  findingId: 1,
});

evidenceSchema.index({
  ownerId: 1,
  scanId: 1,
  createdAt: -1,
});

evidenceSchema.index({
  ownerId: 1,
  scannerId: 1,
});

// Prevent duplicate evidence identities.
evidenceSchema.index(
  {
    ownerId: 1,
    scanId: 1,
    findingId: 1,
    fingerprint: 1,
  },
  {
    name: "unique_evidence_identity",
    unique: true,
    partialFilterExpression: {
      fingerprint: {
        $type: "string",
      },
    },
  },
);

const Evidence = model("Evidence", evidenceSchema);

export default Evidence;
