import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const targetSchema = new Schema(
  {
    ownerId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },

    url: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2048,
    },

    normalizedUrl: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2048,
    },

    hostname: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      maxlength: 253,
    },

    lastScannedAt: {
      type: Date,
      default: null,
    },

    scanCount: {
      type: Number,
      default: 0,
      min: 0,
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

const Target = model('Target', targetSchema);

export default Target;