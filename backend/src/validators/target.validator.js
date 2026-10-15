// STATUS: CREATED

import Joi from "joi";

const objectIdSchema = Joi.string().hex().length(24).required();

const paginationSchema = Joi.object({
  limit: Joi.number().integer().min(1).max(100).default(50),

  skip: Joi.number().integer().min(0).max(100000).default(0),
}).unknown(false);

const targetIdSchema = Joi.object({
  targetId: objectIdSchema,
}).unknown(false);

const targetListQuerySchema = paginationSchema;

const targetHistoryQuerySchema = paginationSchema;

const compareScansParamsSchema = Joi.object({
  scanId: objectIdSchema,

  otherScanId: objectIdSchema,
}).unknown(false);

export {
  targetIdSchema,
  targetListQuerySchema,
  targetHistoryQuerySchema,
  compareScansParamsSchema,
};
