// STATUS: CREATED
// FILE: src/validators/admin.validator.js

import Joi from "joi";
import { ALLOWED_ROLES, roleValidator } from "./auth.validator.js";

const objectIdSchema = Joi.string().hex().length(24).required().messages({
  "string.length": "User ID must be a 24-character hexadecimal string",
  "string.hex": "User ID must be a 24-character hexadecimal string",
  "any.required": "User ID is required",
});

export const userIdParamSchema = Joi.object({
  id: objectIdSchema,
}).unknown(false);

export const createUserSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).required().messages({
    "string.empty": "Name is required",
    "string.min": "Name must be at least 2 characters long",
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

export const updateUserRoleSchema = Joi.object({
  role: roleValidator.required().messages({
    "any.required": "Role is required",
  }),
}).unknown(false);

