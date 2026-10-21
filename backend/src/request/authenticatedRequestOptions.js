// STATUS: UPDATED
// File: src/request/authenticatedRequestOptions.js

const createInvalidAuthenticationError = (message) => {
  const error = new Error(message);
  error.code = "INVALID_AUTHENTICATED_REQUEST";
  return error;
};

const getAuthenticatedRequestOptions = (context) => {
  const authenticated = context?.request?.authenticated ?? null;

  if (authenticated === null) {
    return {};
  }

  if (
    typeof authenticated !== "object" ||
    Array.isArray(authenticated) ||
    typeof authenticated.authOrigin !== "string" ||
    typeof authenticated.resolveHeaders !== "function"
  ) {
    throw createInvalidAuthenticationError(
      "The scan authentication configuration is invalid.",
    );
  }

  let parsedOrigin;

  try {
    parsedOrigin = new URL(authenticated.authOrigin);
  } catch {
    throw createInvalidAuthenticationError(
      "The scan authentication origin is invalid.",
    );
  }

  if (
    !["http:", "https:"].includes(parsedOrigin.protocol) ||
    parsedOrigin.username ||
    parsedOrigin.password ||
    parsedOrigin.pathname !== "/" ||
    parsedOrigin.search ||
    parsedOrigin.hash ||
    parsedOrigin.origin !== authenticated.authOrigin
  ) {
    throw createInvalidAuthenticationError(
      "The scan authentication origin is invalid.",
    );
  }

  return {
    authOrigin: authenticated.authOrigin,
    resolveHeaders: authenticated.resolveHeaders,
  };
};

export { getAuthenticatedRequestOptions };
