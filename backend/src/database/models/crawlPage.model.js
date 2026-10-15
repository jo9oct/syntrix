// STATUS: UPDATED
// File: src/database/models/crawlPage.model.js

import mongoose from "mongoose";

const { Schema, model } = mongoose;

const OPENAPI_METHODS = [
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "OPTIONS",
  "HEAD",
  "TRACE",
];

const MAX_OPTIONS_PER_SELECT = 100;
const MAX_ACCEPT_ITEMS = 32;

const discoveredOptionSchema = new Schema(
  {
    value: { type: String, required: true, maxlength: 256 },
    label: { type: String, required: true, maxlength: 256 },
    selected: { type: Boolean, default: false },
  },
  { _id: false },
);

const discoveredInputSchema = new Schema(
  {
    tag: {
      type: String,
      enum: ["input", "textarea", "select", "button"],
      required: true,
    },
    name: { type: String, default: null, maxlength: 512 },
    type: { type: String, default: null, maxlength: 64 },
    id: { type: String, default: null, maxlength: 512 },
    label: { type: String, default: null, maxlength: 512 },
    ariaLabel: { type: String, default: null, maxlength: 512 },
    placeholder: { type: String, default: null, maxlength: 512 },
    formId: { type: String, default: null, maxlength: 512 },
    required: { type: Boolean, default: false },
    disabled: { type: Boolean, default: false },
    autocomplete: { type: String, default: null, maxlength: 128 },

    // HTML validation metadata. These are constraints, not submitted values.
    pattern: { type: String, default: null, maxlength: 512 },
    min: { type: String, default: null, maxlength: 128 },
    max: { type: String, default: null, maxlength: 128 },
    step: { type: String, default: null, maxlength: 128 },
    minlength: { type: Number, default: null, min: 0 },
    maxlength: { type: Number, default: null, min: 0 },

    readonly: { type: Boolean, default: false },
    multiple: { type: Boolean, default: false },

    accept: {
      type: [String],
      default: [],
      validate: {
        validator(value) {
          return (
            Array.isArray(value) &&
            value.length <= MAX_ACCEPT_ITEMS &&
            value.every(
              (item) => typeof item === "string" && item.length <= 256,
            )
          );
        },
        message: "Invalid or excessive file accept metadata.",
      },
    },

    options: {
      type: [discoveredOptionSchema],
      default: [],
      validate: {
        validator(value) {
          return Array.isArray(value) && value.length <= MAX_OPTIONS_PER_SELECT;
        },
        message: "At most 100 select options may be stored per input.",
      },
    },
  },
  { _id: false },
);

const discoveredFormSchema = new Schema(
  {
    action: {
      type: String,
      required: true,
      maxlength: 2048,
    },
    method: {
      type: String,
      enum: ["GET", "POST", "DIALOG"],
      required: true,
    },
    id: { type: String, default: null, maxlength: 512 },
    inputs: {
      type: [discoveredInputSchema],
      default: [],
    },
  },
  { _id: false },
);

const apiRequestSchema = new Schema(
  {
    url: { type: String, required: true, maxlength: 2048 },
    method: { type: String, required: true, maxlength: 16 },
    resourceType: { type: String, default: null, maxlength: 64 },
    contentType: { type: String, default: null, maxlength: 256 },
    queryParameterNames: { type: [String], default: [] },
    bodyParameterNames: { type: [String], default: [] },
    statusCode: { type: Number, default: null },
  },
  { _id: false },
);

const openApiEndpointSchema = new Schema(
  {
    path: {
      type: String,
      required: true,
      maxlength: 2048,
      validate: {
        validator(value) {
          return (
            typeof value === "string" &&
            value.length > 0 &&
            value.startsWith("/") &&
            !value.startsWith("//") &&
            !/[?#\\\u0000-\u001F\u007F]/.test(value) &&
            !/%2f|%5c/i.test(value)
          );
        },
        message: "OpenAPI endpoint path is invalid.",
      },
    },
    method: {
      type: String,
      required: true,
      enum: OPENAPI_METHODS,
    },
  },
  { _id: false, strict: "throw" },
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
      ref: "Scan",
      required: true,
      index: true,
    },
    pageKey: {
      type: String,
      required: true,
      minlength: 64,
      maxlength: 64,
      immutable: true,
    },
    url: {
      type: String,
      required: true,
      maxlength: 2048,
    },
    depth: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: ["success", "failed"],
      required: true,
    },
    statusCode: { type: Number, default: null },
    contentType: { type: String, default: null, maxlength: 512 },
    discoveredLinks: { type: [String], default: [] },
    queryParameterNames: { type: [String], default: [] },
    forms: {
      type: [discoveredFormSchema],
      default: [],
    },
    inputs: {
      type: [discoveredInputSchema],
      default: [],
    },
    apiRequests: {
      type: [apiRequestSchema],
      default: [],
    },
    openApiEndpoints: {
      type: [openApiEndpointSchema],
      default: [],
      validate: {
        validator(value) {
          return Array.isArray(value) && value.length <= 500;
        },
        message: "At most 500 OpenAPI endpoints may be stored per page.",
      },
    },
    errorCode: { type: String, default: null, maxlength: 128 },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

crawlPageSchema.index(
  { scanId: 1, pageKey: 1 },
  { unique: true, name: "scanId_1_pageKey_1" },
);

crawlPageSchema.index({ ownerId: 1, scanId: 1, depth: 1 });

const CrawlPage =
  mongoose.models.CrawlPage || model("CrawlPage", crawlPageSchema);

export default CrawlPage;
