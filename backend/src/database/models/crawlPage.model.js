
import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const discoveredInputSchema = new Schema(
  {
    tag: {
      type: String,
      enum: ['input', 'textarea', 'select', 'button'],
      required: true,
    },
    name: { type: String, default: null, maxlength: 512 },
    type: { type: String, default: null, maxlength: 64 },
    required: { type: Boolean, default: false },
    disabled: { type: Boolean, default: false },
    autocomplete: { type: String, default: null, maxlength: 128 },
  },
  { _id: false },
);

const discoveredFormSchema = new Schema(
  {
    action: { type: String, required: true, maxlength: 2048 },
    method: {
      type: String,
      enum: ['GET', 'POST', 'DIALOG'],
      required: true,
    },
    inputs: { type: [discoveredInputSchema], default: [] },
  },
  { _id: false },
);

const crawlPageSchema = new Schema(
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
    // HMAC of the canonical, full URL. Never expose this as a URL.
    pageKey: {
      type: String,
      required: true,
      minlength: 64,
      maxlength: 64,
      immutable: true,
    },
    // Query values, fragments and embedded credentials are redacted.
    url: {
      type: String,
      required: true,
      maxlength: 2048,
    },
    depth: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ['success', 'failed'],
      required: true,
    },
    statusCode: { type: Number, default: null },
    contentType: { type: String, default: null, maxlength: 512 },
    discoveredLinks: { type: [String], default: [] },
    queryParameterNames: { type: [String], default: [] },
    forms: { type: [discoveredFormSchema], default: [] },
    inputs: { type: [discoveredInputSchema], default: [] },
    errorCode: { type: String, default: null, maxlength: 128 },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

crawlPageSchema.index(
  { scanId: 1, pageKey: 1 },
  { unique: true, name: 'scanId_1_pageKey_1' },
);

crawlPageSchema.index({ ownerId: 1, scanId: 1, depth: 1 });

const CrawlPage =
  mongoose.models.CrawlPage ||
  model('CrawlPage', crawlPageSchema);

export default CrawlPage;
