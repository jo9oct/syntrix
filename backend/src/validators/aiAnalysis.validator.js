// STATUS: CREATED
// FILE: backend/src/validators/aiAnalysis.validator.js
// PURPOSE: Validation schemas for AI analysis routes

import Joi from "joi";

const scanIdParamSchema = Joi.object({
  scanId: Joi.string().trim().hex().length(24).required(),
}).required();

const findingIdParamSchema = Joi.object({
  findingId: Joi.string().trim().hex().length(24).required(),
}).required();

export { scanIdParamSchema, findingIdParamSchema };

