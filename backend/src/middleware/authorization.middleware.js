// STATUS: UPDATED
// File: src/middleware/authorization.middleware.js

import mongoose from "mongoose";

import * as guestSessionService from "../services/guestSession.service.js";

const GUEST_COOKIE_NAME = "guest-id";

const GUEST_COOKIE_MAX_AGE = guestSessionService.getGuestSessionTtlMs();

/**
 * Normalize an owner ID without trusting client-supplied identity.
 */
const normalizeOwnerId = (value) => {
  if (value === undefined || value === null) {
    return null;
  }

  const normalized = String(value).trim();

  if (!normalized || normalized.length > 256) {
    return null;
  }

  return normalized;
};

/**
 * Obtain the registered user's ID from the authenticated user object.
 * The protect middleware must verify the JWT before setting req.user.
 */
const getAuthenticatedUserId = (req) => {
  const userId = req.user?._id;

  if (!userId || !mongoose.isValidObjectId(String(userId))) {
    return null;
  }

  return String(userId);
};

/**
 * Parse the guest session ID from the guest-id cookie.
 */
const getGuestIdFromCookie = (req) => {
  const cookieHeader = req.headers.cookie;

  if (typeof cookieHeader !== "string" || !cookieHeader.trim()) {
    return null;
  }

  const cookies = cookieHeader.split(";").map((cookie) => cookie.trim());

  for (const cookie of cookies) {
    const separatorIndex = cookie.indexOf("=");

    if (separatorIndex === -1) {
      continue;
    }

    const name = cookie.slice(0, separatorIndex).trim();

    if (name !== GUEST_COOKIE_NAME) {
      continue;
    }

    const value = cookie.slice(separatorIndex + 1).trim();

    try {
      const guestId = normalizeOwnerId(decodeURIComponent(value));

      return guestId && mongoose.isValidObjectId(guestId) ? guestId : null;
    } catch {
      return null;
    }
  }

  return null;
};

/**
 * Create a temporary guest owner ID.
 */
const createTemporaryGuestOwnerId = () =>
  new mongoose.Types.ObjectId().toString();

/**
 * Set the guest session cookie.
 */
const setGuestCookie = (res, guestOwnerId) => {
  const encodedGuestId = encodeURIComponent(guestOwnerId);

  res.setHeader(
    "Set-Cookie",
    [
      `${GUEST_COOKIE_NAME}=${encodedGuestId}`,
      "Path=/",
      `Max-Age=${Math.floor(GUEST_COOKIE_MAX_AGE / 1000)}`,
      "HttpOnly",
      "SameSite=Lax",
    ].join("; "),
  );
};

/**
 * Check whether a guest owner ID is a valid MongoDB ObjectId.
 */
const isValidGuestOwnerId = (ownerId) =>
  typeof ownerId === "string" && mongoose.isValidObjectId(ownerId);

/**
 * Create a new guest session and set its cookie.
 */
const createNewGuestSession = async (res) => {
  const guestOwnerId = createTemporaryGuestOwnerId();

  await guestSessionService.getOrCreateGuestSession({
    guestOwnerId,
  });

  setGuestCookie(res, guestOwnerId);

  return guestOwnerId;
};

/**
 * General authorization middleware.
 *
 * Registered users:
 *   Uses req.user._id from the verified protect middleware.
 *
 * Guests:
 *   Uses the existing guest-id cookie and guest session.
 *
 * IMPORTANT:
 *   Routes must explicitly run protect before this middleware
 *   when they require registered-user authentication.
 */
const requireAuthorization = async (req, res, next) => {
  try {
    // Prefer the registered user identity established by protect.
    const authenticatedUserId = getAuthenticatedUserId(req);

    if (authenticatedUserId) {
      req.auth = {
        ownerId: authenticatedUserId,
        userType: "user",
      };

      return next();
    }

    // Do not silently downgrade a request with an invalid user
    // identity to a guest session.
    if (req.user) {
      const error = new Error("Authenticated user identity is invalid.");

      error.statusCode = 401;
      error.code = "INVALID_USER_IDENTITY";

      return next(error);
    }

    // A supplied Bearer token must be verified by protect.
    const authorization = req.headers.authorization;

    if (
      typeof authorization === "string" &&
      /^Bearer\s+\S+$/i.test(authorization)
    ) {
      const error = new Error(
        "The Bearer token must be verified by authentication middleware.",
      );

      error.statusCode = 401;
      error.code = "TOKEN_VERIFICATION_REQUIRED";

      return next(error);
    }

    // Guest identity is supported only on routes that permit guests.
    const cookieGuestOwnerId = getGuestIdFromCookie(req);

    if (!isValidGuestOwnerId(cookieGuestOwnerId)) {
      const guestOwnerId = await createNewGuestSession(res);

      req.auth = {
        ownerId: guestOwnerId,
        userType: "guest",
      };

      return next();
    }

    const existingSession = await guestSessionService.getGuestSession({
      guestOwnerId: cookieGuestOwnerId,
    });

    if (
      !existingSession ||
      !existingSession.expiresAt ||
      new Date(existingSession.expiresAt).getTime() <= Date.now()
    ) {
      const guestOwnerId = await createNewGuestSession(res);

      req.auth = {
        ownerId: guestOwnerId,
        userType: "guest",
      };

      return next();
    }

    req.auth = {
      ownerId: cookieGuestOwnerId,
      userType: "guest",
    };

    return next();
  } catch (error) {
    return next(error);
  }
};

/**
 * Require a verified registered user.
 *
 * The protect middleware verifies the JWT and sets req.user.
 * This middleware must not be used as a replacement for protect.
 */
const requireAuthenticatedUser = (req, res, next) => {
  const authenticatedUserId = getAuthenticatedUserId(req);

  if (!authenticatedUserId) {
    const error = new Error("A verified registered-user identity is required.");

    error.statusCode = 401;
    error.code = "AUTHENTICATION_REQUIRED";

    return next(error);
  }

  req.auth = {
    ownerId: authenticatedUserId,
    userType: "user",
  };

  return next();
};

/**
 * Require an owner identity.
 */
const requireOwner = (req, res, next) => {
  const ownerId = normalizeOwnerId(req.auth?.ownerId);

  if (!ownerId) {
    const error = new Error("Owner identity is required.");

    error.statusCode = 403;
    error.code = "OWNER_CONTEXT_REQUIRED";

    return next(error);
  }

  req.auth.ownerId = ownerId;

  return next();
};

/**
 * Reject attempts to access resources belonging to another owner.
 */
const requireOwnerMatch = (req, res, next) => {
  const authenticatedOwnerId = normalizeOwnerId(req.auth?.ownerId);

  const requestedOwnerId = normalizeOwnerId(
    req.params?.ownerId ?? req.body?.ownerId ?? req.query?.ownerId,
  );

  if (!authenticatedOwnerId) {
    const error = new Error("Owner identity is required.");

    error.statusCode = 403;
    error.code = "OWNER_CONTEXT_REQUIRED";

    return next(error);
  }

  if (requestedOwnerId && requestedOwnerId !== authenticatedOwnerId) {
    const error = new Error(
      "Access to the requested owner resource is denied.",
    );

    error.statusCode = 403;
    error.code = "OWNER_ACCESS_DENIED";

    return next(error);
  }

  return next();
};

/**
 * Get the current request's owner ID.
 */
const getOwnerId = (req) => normalizeOwnerId(req.auth?.ownerId);

/**
 * Get the current request's user type.
 */
const getUserType = (req) =>
  req.auth?.userType === "guest" ? "guest" : "user";

/**
 * Check whether this is a guest request.
 */
const isGuestRequest = (req) => getUserType(req) === "guest";

/**
 * Check whether a verified registered-user identity is established.
 */
const isAuthenticatedRequest = (req) =>
  Boolean(
    getAuthenticatedUserId(req) &&
    req.auth?.ownerId === getAuthenticatedUserId(req) &&
    req.auth?.userType === "user",
  );

export {
  GUEST_COOKIE_NAME,
  GUEST_COOKIE_MAX_AGE,
  normalizeOwnerId,
  getAuthenticatedUserId,
  getGuestIdFromCookie,
  createTemporaryGuestOwnerId,
  setGuestCookie,
  requireAuthorization,
  requireAuthenticatedUser,
  requireOwner,
  requireOwnerMatch,
  getOwnerId,
  getUserType,
  isGuestRequest,
  isAuthenticatedRequest,
};
