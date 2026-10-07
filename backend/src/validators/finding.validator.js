import Joi from 'joi';

const findingIdSchema = Joi.object({
  findingId: Joi.string()
    .trim()
    .hex()
    .length(24)
    .required(),
}).required();

const findingSeverity = Joi.string()
  .valid(
    'critical',
    'high',
    'medium',
    'low',
    'info',
  );

const findingConfidence = Joi.string()
  .valid(
    'low',
    'medium',
    'high',
  );

const findingStatus = Joi.string()
  .valid(
    'detected',
    'verified',
    'false_positive',
    'accepted',
    'resolved',
  );

const listFindingQuerySchema = Joi.object({
  scanId: Joi.string()
    .trim()
    .hex()
    .length(24)
    .optional(),

  severity:
    findingSeverity.optional(),

  confidence:
    findingConfidence.optional(),

  status:
    findingStatus.optional(),

  scannerId: Joi.string()
    .trim()
    .max(128)
    .optional(),

  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .default(100),

  skip: Joi.number()
    .integer()
    .min(0)
    .max(100_000)
    .default(0),
});

const updateFindingSchema = Joi.object({
  status:
    findingStatus.optional(),

  remediation: Joi.string()
    .trim()
    .max(10_000)
    .allow(null)
    .optional(),
})
  .min(1)
  .required();

export {
  findingIdSchema,
  findingSeverity,
  findingConfidence,
  findingStatus,
  listFindingQuerySchema,
  updateFindingSchema,
};