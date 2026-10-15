// STATUS: CREATED

import Joi from "joi";

const evidenceIdSchema = Joi.object({
  evidenceId: Joi.string().trim().hex().length(24).required(),
}).required();

const findingIdQuerySchema = Joi.object({
  findingId: Joi.string().trim().hex().length(24).optional(),

  type: Joi.string()
    .valid(
      "request",
      "response",
      "http_exchange",
      "comparison",
      "header",
      "body",
      "dns",
      "certificate",
      "metadata",
    )
    .optional(),

  scannerId: Joi.string().trim().max(128).optional(),

  limit: Joi.number().integer().min(1).max(500).default(100),

  skip: Joi.number().integer().min(0).max(100_000).default(0),
}).required();

const scanEvidenceQuerySchema = Joi.object({
  scanId: Joi.string().trim().hex().length(24).required(),

  findingId: Joi.string().trim().hex().length(24).optional(),

  type: Joi.string()
    .valid(
      "request",
      "response",
      "http_exchange",
      "comparison",
      "header",
      "body",
      "dns",
      "certificate",
      "metadata",
    )
    .optional(),

  scannerId: Joi.string().trim().max(128).optional(),

  limit: Joi.number().integer().min(1).max(500).default(500),

  skip: Joi.number().integer().min(0).max(100_000).default(0),
}).required();

export { evidenceIdSchema, findingIdQuerySchema, scanEvidenceQuerySchema };
