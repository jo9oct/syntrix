// STATUS: CREATED

import Joi from "joi";

import { scanIdSchema } from "./scan.validator.js";

const crawlPaginationSchema = Joi.object({
  limit: Joi.number().integer().min(1).max(100).default(50),

  skip: Joi.number().integer().min(0).max(100_000).default(0),
}).required();

export { scanIdSchema, crawlPaginationSchema };
