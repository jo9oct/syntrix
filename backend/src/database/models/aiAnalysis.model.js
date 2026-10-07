import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const aiAnalysisSchema = new Schema(
  {
    ownerId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },

    scanId: {
      type: Schema.Types.ObjectId,
      ref: 'Scan',
      required: true,
      index: true,
    },

    findingId: {
      type: Schema.Types.ObjectId,
      ref: 'Finding',
      default: null,
      index: true,
    },

    status: {
      type: String,
      enum: [
        'pending',
        'processing',
        'completed',
        'failed',
      ],
      default: 'pending',
      index: true,
    },

    provider: {
      type: String,
      default: null,
      trim: true,
      maxlength: 128,
    },

    model: {
      type: String,
      default: null,
      trim: true,
      maxlength: 256,
    },

    analysisType: {
      type: String,
      enum: [
        'finding',
        'remediation',
        'summary',
        'risk',
      ],
      required: true,
    },

    result: {
      type: Schema.Types.Mixed,
      default: null,
    },

    inputFingerprint: {
      type: String,
      default: null,
      trim: true,
      maxlength: 256,
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

    completedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

aiAnalysisSchema.index({
  ownerId: 1,
  scanId: 1,
});

aiAnalysisSchema.index({
  ownerId: 1,
  findingId: 1,
});

const AiAnalysis = model('AiAnalysis', aiAnalysisSchema);

export default AiAnalysis;