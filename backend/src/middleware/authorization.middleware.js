/* STATUS: UPDATED
 * FILE: src/middleware/authorization.middleware.js
 */

import mongoose from "mongoose";

import * as guestSessionService from "../services/guestSession.service.js";

const GUEST_COOKIE_NAME = "guest-id";

const GUEST_COOKIE_MAX_AGE = guestSessionService.getGuestSessionTtlMs();

/*
 * Normalize an owner ID without trusting its source.
 */
const normalizeOwnerId = (value) => {
  if (typeof value !== "string" || value.trim().length === 0) {
    return null;
  }

  const normalized = value.trim();

  if (normalized.length > 256) {
    return null;
  }

  return normalized;
};

/*
 * Retained for compatibility with existing integrations.
 *
 * IMPORTANT:
 * An x-owner-id header is not proof of authentication.
 * Never use it alone to establish a registered user's identity.
 */
const getExternalOwnerId = (req) => {
  const headerValue = req.headers["x-owner-id"];

  if (typeof headerValue !== "string") {
    return null;
  }

  return normalizeOwnerId(headerValue);
};

const getGuestIdFromCookie = (req) => {
  const cookieHeader = req.headers.cookie;

  if (typeof cookieHeader !== "string" || cookieHeader.trim().length === 0) {
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
      return normalizeOwnerId(decodeURIComponent(value));
    } catch {
      return null;
    }
  }

  return null;
};

const createTemporaryGuestOwnerId = () =>
  new mongoose.Types.ObjectId().toString();

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

const isValidGuestOwnerId = (ownerId) =>
  typeof ownerId === "string" && mongoose.isValidObjectId(ownerId);

const createNewGuestSession = async (res) => {
  const guestOwnerId = createTemporaryGuestOwnerId();

  await guestSessionService.getOrCreateGuestSession({
    guestOwnerId,
  });

  setGuestCookie(res, guestOwnerId);

  return guestOwnerId;
};

/*
 * General authorization middleware.
 *
 * Existing verified authentication middleware should run before
 * this middleware when a Bearer token is supplied.
 *
 * Existing guest-cookie behavior is preserved for routes that
 * allow guest access, including eligible scan routes.
 */
const requireAuthorization = async (req, res, next) => {
  try {
    // An upstream authentication middleware has already
    // established the request identity.
    if (req.auth?.ownerId) {
      return next();
    }

    // Do not treat x-owner-id as authenticated identity.
    // It is client-controlled and can be spoofed.

    const authorization = req.headers.authorization;

    if (
      typeof authorization === "string" &&
      /^Bearer\s+\S+$/i.test(authorization)
    ) {
      const error = new Error(
        "The Bearer token has not been verified by the authentication middleware.",
      );

      error.statusCode = 401;
      error.code = "TOKEN_VERIFICATION_REQUIRED";

      return next(error);
    }

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

    /*
     * Never restore an expired guest identity.
     * Create a fresh guest session instead.
     */
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

/*
 * Registered-user-only authorization.
 *
 * Use this for saved scopes and other resources that must
 * never be available to guest identities.
 *
 * This function checks the verified request identity;
 * it does not independently verify JWT signatures.
 */
const requireAuthenticatedUser = (req, res, next) => {
  const authorization = req.headers.authorization;

  if (
    typeof authorization !== "string" ||
    !/^Bearer\s+\S+$/i.test(authorization)
  ) {
    const error = new Error("A Bearer access token is required.");

    error.statusCode = 401;
    error.code = "AUTHENTICATION_REQUIRED";

    return next(error);
  }

  if (!req.auth?.ownerId || req.auth.userType === "guest") {
    const error = new Error("A verified registered-user identity is required.");

    error.statusCode = 401;
    error.code = "REGISTERED_USER_REQUIRED";

    return next(error);
  }

  return next();
};

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

const getOwnerId = (req) => normalizeOwnerId(req.auth?.ownerId);

const getUserType = (req) =>
  req.auth?.userType === "guest" ? "guest" : "user";

const isGuestRequest = (req) => getUserType(req) === "guest";

const isAuthenticatedRequest = (req) =>
  Boolean(req.auth?.ownerId && req.auth.userType !== "guest");

export {
  GUEST_COOKIE_NAME,
  GUEST_COOKIE_MAX_AGE,
  normalizeOwnerId,
  getExternalOwnerId,
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
