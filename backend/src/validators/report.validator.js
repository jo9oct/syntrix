import Joi from 'joi';

const reportIdSchema = Joi.object({
  reportId: Joi.string()
    .trim()
    .hex()
    .length(24)
    .required(),
}).required();

const reportFormat = Joi.string()
  .valid(
    'json',
    'html',
    'pdf',
  );

const createReportSchema = Joi.object({
  scanId: Joi.string()
    .trim()
    .hex()
    .length(24)
    .required(),

  format:
    reportFormat.required(),
}).required();

const listReportQuerySchema = Joi.object({
  scanId: Joi.string()
    .trim()
    .hex()
    .length(24)
    .optional(),

  format:
    reportFormat.optional(),

  status: Joi.string()
    .valid(
      'pending',
      'generating',
      'completed',
      'failed',
    )
    .optional(),

  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .default(50),

  skip: Joi.number()
    .integer()
    .min(0)
    .max(100_000)
    .default(0),
});

export {
  reportIdSchema,
  reportFormat,
  createReportSchema,
  listReportQuerySchema,
};