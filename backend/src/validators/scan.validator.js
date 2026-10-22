
/* STATUS: UPDATED */
/* FILE: src/validators/scan.validator.js */

import Joi from "joi";
import { hasScanner } from "../engine/scannerRegistry.js";

const SCANNER_ID_ALIASES = Object.freeze({
  "security-headers": "securityHeaders",
});

const normalizeScannerId = (scannerId) =>
  SCANNER_ID_ALIASES[scannerId] ?? scannerId;

const scannerNamePattern = /^[a-zA-Z0-9_-]+$/;

const scannerName = Joi.string()
  .trim()
  .pattern(scannerNamePattern)
  .max(128)
  .custom((value, helpers) => {
    const normalizedId = normalizeScannerId(value);

    if (!hasScanner(normalizedId)) {
      return helpers.error("any.invalid");
    }

    return normalizedId;
  })
  .messages({
    "any.invalid": "One or more selected scanner IDs are not supported.",
  });

const scannerSelection = Joi.array()
  .items(scannerName)
  .max(100)
  .unique();

const companyRuleId = Joi.string().trim().hex().length(24);

const companyRuleIds = Joi.array()
  .items(companyRuleId)
  .max(100)
  .unique()
  .optional();

const scopeId = Joi.string().trim().hex().length(24);

const scopes = Joi.array()
  .items(scopeId)
  .max(1)
  .unique()
  .default([])
  .messages({
    "array.max": "Only one saved scope can be selected per scan.",
    "string.hex": "Each scope ID must be a valid hexadecimal ID.",
    "string.length": "Each scope ID must contain exactly 24 characters.",
  });

const targetUrl = Joi.string()
  .trim()
  .uri({ scheme: ["http", "https"], allowRelative: false })
  .max(2048)
  .custom((value, helpers) => {
    let parsedUrl;

    try {
      parsedUrl = new URL(value);
    } catch {
      return helpers.error("any.invalid");
    }

    if (
      !["http:", "https:"].includes(parsedUrl.protocol) ||
      !parsedUrl.hostname ||
      parsedUrl.hostname.length > 253 ||
      parsedUrl.username ||
      parsedUrl.password
    ) {
      return helpers.error("any.invalid");
    }

    return value;
  });

const usernamePasswordCredentials = Joi.object({
  username: Joi.string().trim().min(1).max(512).required(),
  password: Joi.string().min(1).max(4096).required(),
}).unknown(false);

const sessionCookieCredentials = Joi.object({
  sessionCookie: Joi.string()
    .trim()
    .min(1)
    .max(8192)
    .pattern(/^[^\r\n\0]+$/)
    .custom((value, helpers) => {
      if (
        !value.includes("=") ||
        value.split(";").some((part) => !part.trim().includes("="))
      ) {
        return helpers.error("any.invalid");
      }

      return value;
    })
    .required(),
}).unknown(false);

const credentialsSchema = Joi.alternatives()
  .try(usernamePasswordCredentials, sessionCookieCredentials)
  .required();

const scanSelectionSchema = Joi.object({
  recon: scannerSelection.default([]),
  security: scannerSelection.default([]),
})
  .required()
  .custom((value, helpers) => {
    if (
      (value.recon?.length ?? 0) === 0 &&
      (value.security?.length ?? 0) === 0
    ) {
      return helpers.error("any.custom");
    }

    return value;
  })
  .messages({
    "any.custom": "At least one recon or security scanner must be selected.",
  });

const createScanSchema = Joi.object({
  targetUrl: targetUrl.required(),
  scanSelection: scanSelectionSchema,
  scopes,
  companyRuleIds,
  credentials: credentialsSchema.optional(),
  idempotencyKey: Joi.string()
    .trim()
    .min(8)
    .max(256)
    .pattern(/^[a-zA-Z0-9._:-]+$/)
    .optional(),
}).required();

const scanIdSchema = Joi.object({
  scanId: Joi.string().trim().hex().length(24).required(),
}).required();

const cancelScanSchema = scanIdSchema;

const listScanQuerySchema = Joi.object({
  status: Joi.string()
    .valid("pending", "running", "completed", "failed", "cancelled")
    .optional(),
  limit: Joi.number().integer().min(1).max(100).default(50),
  skip: Joi.number().integer().min(0).max(100_000).default(0),
});

const normalizeSelection = (selection) => ({
  recon: [
    ...new Set((selection?.recon ?? []).map(normalizeScannerId)),
  ],
  security: [
    ...new Set((selection?.security ?? []).map(normalizeScannerId)),
  ],
});

const normalizeCompanyRuleIds = (ruleIds) => [
  ...new Set(Array.isArray(ruleIds) ? ruleIds : []),
];

const getSelectedScannerIds = (selection) => {
  const normalized = normalizeSelection(selection);

  return [...normalized.recon, ...normalized.security];
};

export {
  targetUrl,
  scannerName,
  scannerSelection,
  companyRuleId,
  companyRuleIds,
  scopeId,
  scopes,
  scanSelectionSchema,
  createScanSchema,
  scanIdSchema,
  cancelScanSchema,
  listScanQuerySchema,
  normalizeSelection,
  normalizeCompanyRuleIds,
  getSelectedScannerIds,
};
