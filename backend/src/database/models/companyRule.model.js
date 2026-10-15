// STATUS: UPDATED
// File: src/database/models/companyRule.model.js

import mongoose from "mongoose";

const { Schema, model } = mongoose;

const companyRuleSchema = new Schema(
  {
    ownerId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 256,
    },

    normalizedName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 256,
    },

    category: {
      type: String,
      required: true,
      enum: [
        "cors",
        "transport",
        "authentication",
        "authorization",
        "security-headers",
        "csrf",
        "session",
        "api-security",
        "general",
      ],
      index: true,
    },

    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },

    severity: {
      type: String,
      required: true,
      enum: ["critical", "high", "medium", "low", "info"],
      default: "medium",
    },

    rule: {
      type: Schema.Types.Mixed,
      required: true,
    },

    enabled: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

companyRuleSchema.index(
  {
    ownerId: 1,
    normalizedName: 1,
  },
  {
    unique: true,
    name: "unique_company_rule_name",
  },
);

companyRuleSchema.index({
  ownerId: 1,
  createdAt: -1,
});

companyRuleSchema.index({
  ownerId: 1,
  category: 1,
  enabled: 1,
});

const CompanyRule = model("CompanyRule", companyRuleSchema);

export default CompanyRule;
