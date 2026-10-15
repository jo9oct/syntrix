import mongoose from "mongoose";

const { Schema, model } = mongoose;

const reportSchema = new Schema(
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

    format: {
      type: String,
      enum: ["json", "html", "pdf"],
      required: true,
    },

    status: {
      type: String,
      enum: ["pending", "generating", "completed", "failed"],
      default: "pending",
      index: true,
    },

    storageProvider: {
      type: String,
      enum: ["cloudinary"],
      default: null,
    },

    storagePublicId: {
      type: String,
      default: null,
      trim: true,
      maxlength: 512,
    },

    storageUrl: {
      type: String,
      default: null,
      trim: true,
      maxlength: 4096,
    },

    contentType: {
      type: String,
      default: null,
      trim: true,
      maxlength: 256,
    },

    fileSize: {
      type: Number,
      default: null,
      min: 0,
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
      maxlength: 2_000,
    },

    generatedAt: {
      type: Date,
      default: null,
    },

    expiresAt: {
      type: Date,
      default: null,
      index: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

reportSchema.index({
  ownerId: 1,
  scanId: 1,
});

reportSchema.index({
  ownerId: 1,
  status: 1,
});

reportSchema.index({
  ownerId: 1,
  createdAt: -1,
});

const Report = model("Report", reportSchema);

export default Report;
