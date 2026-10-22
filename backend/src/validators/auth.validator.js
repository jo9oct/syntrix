// STATUS: CREATED
// FILE: src/validators/auth.validator.js

import Joi from "joi";

export const ALLOWED_ROLES = [
  "admin",
  "security_engineer",
  "developer",
  "malware_analyst",
  "client_owner",
  "client_member",
];

export const normalizeRoleString = (value) => {
  if (typeof value !== "string") return value;
  return value.trim().toLowerCase().replace(/\s+/g, "_");
};

export const roleValidator = Joi.string()
  .trim()
  .custom((value, helpers) => {
    const normalized = normalizeRoleString(value);
    if (!ALLOWED_ROLES.includes(normalized)) {
      return helpers.error("any.only", { valids: ALLOWED_ROLES });
    }
    return normalized;
  })
  .messages({
    "any.only": `Role must be one of: ${ALLOWED_ROLES.join(", ")}`,
  });

export const registerSchema = Joi.object({
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

  role: roleValidator.optional(),

  organization: Joi.string().trim().allow("", null).optional(),

  isOwner: Joi.boolean().optional(),
  isSecurityResponsible: Joi.boolean().optional(),
  employees: Joi.string().allow("", null).optional(),
  platformUsers: Joi.string().allow("", null).optional(),
}).unknown(true);

export const loginSchema = Joi.object({
  email: Joi.string().trim().email().required().messages({
    "string.empty": "Email is required",
    "string.email": "Please provide a valid email address",
    "any.required": "Email is required",
  }),

  password: Joi.string().required().messages({
    "string.empty": "Password is required",
    "any.required": "Password is required",
  }),
}).unknown(true);

