import mongoose from "mongoose";

const { Schema, model } = mongoose;

const verificationSchema = new Schema(
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
      required: true,
      unique: true,
    },

    status: {
      type: String,
      enum: ["pending", "verified", "rejected", "inconclusive"],
      default: "pending",
      index: true,
    },

    method: {
      type: String,
      enum: ["automated", "manual", "secondary_check"],
      default: "automated",
    },

    confidence: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "low",
    },

    reason: {
      type: String,
      default: null,
      maxlength: 5_000,
    },

    evidenceIds: [
      {
        type: Schema.Types.ObjectId,
        ref: "Evidence",
      },
    ],

    verifiedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

verificationSchema.index({
  ownerId: 1,
  scanId: 1,
});

verificationSchema.index({
  ownerId: 1,
  status: 1,
});

const Verification = model("Verification", verificationSchema);

export default Verification;
