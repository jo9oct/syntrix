// STATUS: CREATED

import Joi from "joi";

const objectIdSchema = Joi.string().hex().length(24).required();

const scanIdParamsSchema = Joi.object({
  scanId: objectIdSchema,
}).unknown(false);

const deletedScansQuerySchema = Joi.object({
  limit: Joi.number().integer().min(1).max(100).default(50),

  skip: Joi.number().integer().min(0).max(100000).default(0),
}).unknown(false);

const compareScansParamsSchema = Joi.object({
  scanId: objectIdSchema,
  otherScanId: objectIdSchema,
}).unknown(false);

export {
  scanIdParamsSchema,
  deletedScansQuerySchema,
  compareScansParamsSchema,
};
