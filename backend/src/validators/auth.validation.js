import Joi from "joi";

export const ALLOWED_ROLES = [
  "admin",
  "security_engineer",
  "developer",
  "malware_analyst",
  "client_owner",
  "client_member",
  "user",
  "superAdmin",
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

/**
 * Validates password complexity:
 * - Least 8 characters
 * - Least one number (0–9) or a symbol
 * - Lowercase (a–z) and uppercase (A–Z)
 */
export const validatePasswordComplexity = (password) => {
  if (typeof password !== "string" || !password) {
    return { valid: false, message: "Password is required" };
  }
  if (password.length < 8) {
    return {
      valid: false,
      message: "Password must be at least 8 characters long",
    };
  }
  if (!/[a-z]/.test(password) || !/[A-Z]/.test(password)) {
    return {
      valid: false,
      message:
        "Password must contain both lowercase (a–z) and uppercase (A–Z) letters",
    };
  }
  if (!/[0-9\W_]/.test(password)) {
    return {
      valid: false,
      message: "Password must contain at least one number (0–9) or a symbol",
    };
  }
  return { valid: true };
};

export const passwordValidator = Joi.string()
  .min(8)
  .max(128)
  .custom((value, helpers) => {
    const result = validatePasswordComplexity(value);
    if (!result.valid) {
      return helpers.message(result.message);
    }
    return value;
  })
  .messages({
    "string.empty": "Password is required",
    "string.min": "Password must be at least 8 characters long",
    "any.required": "Password is required",
  });

export const registerSchema = Joi.object({
  name: Joi.string().trim().min(3).max(100).optional().messages({
    "string.empty": "Name is required",
    "string.min": "Name must be at least 3 characters long",
  }),

  userName: Joi.string().trim().min(3).max(100).optional().messages({
    "string.empty": "Username is required",
    "string.min": "Username must be at least 3 characters long",
  }),

  email: Joi.string().trim().email({ tlds: false }).required().messages({
    "string.empty": "Email is required",
    "string.email": "Please provide a valid email address",
    "any.required": "Email is required",
  }),

  password: passwordValidator.required(),

  // Role cannot be chosen by regular user during registration; assigned automatically by system
  role: Joi.any().strip(),

  organization: Joi.string().trim().allow("", null).optional(),

  isOwner: Joi.boolean().optional(),
  isSecurityResponsible: Joi.boolean().optional(),
})
  .or("name", "userName")
  .unknown(true);

export const loginSchema = Joi.object({
  email: Joi.string().trim().optional(),
  userName: Joi.string().trim().optional(),
  identifier: Joi.string().trim().optional(),

  password: Joi.string().required().messages({
    "string.empty": "Password is required",
    "any.required": "Password is required",
  }),
})
  .or("email", "userName", "identifier")
  .unknown(true);

export const forgotPasswordSchema = Joi.object({
  email: Joi.string().trim().email({ tlds: false }).required().messages({
    "string.empty": "Email is required",
    "string.email": "Please provide a valid email address",
    "any.required": "Email is required",
  }),
}).unknown(true);

export const changePasswordSchema = Joi.object({
  oldPassword: Joi.string().allow("", null).optional(),
  newPassword: passwordValidator.optional(),
  password: passwordValidator.optional(),
})
  .or("newPassword", "password")
  .unknown(true);

export const resetPasswordSchema = Joi.object({
  password: passwordValidator.required(),
}).unknown(true);

export const updateUserSchema = Joi.object({
  role: roleValidator.optional(),
  status: Joi.string()
    .valid("inactive", "active", "suspended", "disabled")
    .optional(),
}).unknown(true);
