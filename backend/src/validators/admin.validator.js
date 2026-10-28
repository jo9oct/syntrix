// STATUS: CREATED
// FILE: src/validators/admin.validator.js

import Joi from "joi";
import { roleValidator } from "./auth.validation.js";

export const createUserSchema = Joi.object({
  name: Joi.string().trim().min(3).max(100).required().messages({
    "string.empty": "Name is required",
    "string.min": "Name must be at least 3 characters long",
    "any.required": "Name is required",
  }),

  email: Joi.string().trim().email().required().messages({
    "string.empty": "Email is required",
    "string.email": "Please provide a valid email address",
    "any.required": "Email is required",
  }),

  password: Joi.string().min(6).max(128).required().messages({
    "string.empty": "Password is required",
    "string.min": "Password must be at least 6 characters long",
    "any.required": "Password is required",
  }),

  role: roleValidator.required().messages({
    "any.required": "Role is required",
  }),

  organization: Joi.string().trim().allow("", null).optional(),
}).unknown(true);


