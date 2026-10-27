// STATUS: UPDATED

import mongoose from "mongoose";

const { Schema, model, models } = mongoose;

const targetSchema = new Schema(
  {
    ownerId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },

    name: {
      type: String,
      trim: true,
      default: null,
    },

    url: {
      type: String,
      required: true,
      trim: true,
    },

    normalizedUrl: {
      type: String,
      required: true,
      trim: true,
    },

    hostname: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },

    lastScannedAt: {
      type: Date,
      default: null,
    },

    scanCount: {
      type: Number,
      min: 0,
      default: 0,
    },

    // Monotonically increasing counter for this target.
    // It is not reset when scans are deleted.
    scanVersionCounter: {
      type: Number,
      min: 0,
      default: 0,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

targetSchema.index(
  {
    ownerId: 1,
    normalizedUrl: 1,
  },
  {
    unique: true,
  },
);

targetSchema.index({
  ownerId: 1,
  hostname: 1,
});

targetSchema.index({
  ownerId: 1,
  lastScannedAt: -1,
});

const Target = models.Target || model("Target", targetSchema);

export default Target;
