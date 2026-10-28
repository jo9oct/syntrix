
import sanitizeHtml from "sanitize-html";

/**
 * Sanitize a single string input
 * Removes all HTML tags and attributes
 */
export const sanitizeInput = (value) => {
  if (typeof value !== "string") return value;
  return sanitizeHtml(value, {
    allowedTags: [],       // remove all HTML tags
    allowedAttributes: {}  // remove all attributes
  });
};

/**
 * Sanitize all string fields in an object (like req.body)
 */
export const sanitizeObject = (obj) => {
  const sanitized = {};
  for (const key in obj) {
    if (Object.hasOwn(obj, key)) {
      const value = obj[key];
      sanitized[key] = typeof value === "string" ? sanitizeInput(value) : value;
    }
  }
  return sanitized;
};
