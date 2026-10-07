import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const fingerprintSchema = new Schema(
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

    scanId: {
      type: Schema.Types.ObjectId,
      ref: 'Scan',
      required: true,
      index: true,
    },

    type: {
      type: String,
      enum: [
        'technology',
        'web_server',
        'framework',
        'runtime',
        'service',
        'certificate',
        'dns',
        'other',
      ],
      required: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 256,
    },

    version: {
      type: String,
      default: null,
      trim: true,
      maxlength: 128,
    },

    confidence: {
      type: String,
      enum: [
        'low',
        'medium',
        'high',
      ],
      required: true,
    },

    source: {
      type: String,
      required: true,
      trim: true,
      maxlength: 128,
    },

    evidence: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

fingerprintSchema.index({
  ownerId: 1,
  targetId: 1,
});

fingerprintSchema.index({
  scanId: 1,
  type: 1,
});

const Fingerprint = model('Fingerprint', fingerprintSchema);

export default Fingerprint;