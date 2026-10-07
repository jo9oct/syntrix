// STATUS: UPDATED

import mongoose from 'mongoose';

import * as guestSessionService from '../services/guestSession.service.js';

const GUEST_COOKIE_NAME =
  'guest-id';

const GUEST_COOKIE_MAX_AGE =
  guestSessionService.getGuestSessionTtlMs();

const normalizeOwnerId = (value) => {
  if (
    typeof value !== 'string' ||
    value.trim().length === 0
  ) {
    return null;
  }

  const normalized =
    value.trim();

  if (normalized.length > 256) {
    return null;
  }

  return normalized;
};

const getExternalOwnerId = (req) => {
  const headerValue =
    req.headers['x-owner-id'];

  if (
    typeof headerValue !== 'string'
  ) {
    return null;
  }

  return normalizeOwnerId(
    headerValue,
  );
};

const getGuestIdFromCookie = (req) => {
  const cookieHeader =
    req.headers.cookie;

  if (
    typeof cookieHeader !== 'string' ||
    cookieHeader.trim().length === 0
  ) {
    return null;
  }

  const cookies =
    cookieHeader
      .split(';')
      .map((cookie) =>
        cookie.trim(),
      );

  for (const cookie of cookies) {
    const separatorIndex =
      cookie.indexOf('=');

    if (separatorIndex === -1) {
      continue;
    }

    const name =
      cookie
        .slice(0, separatorIndex)
        .trim();

    if (
      name !==
      GUEST_COOKIE_NAME
    ) {
      continue;
    }

    const value =
      cookie
        .slice(separatorIndex + 1)
        .trim();

    try {
      return normalizeOwnerId(
        decodeURIComponent(value),
      );
    } catch {
      return null;
    }
  }

  return null;
};

const createTemporaryGuestOwnerId =
  () =>
    new mongoose.Types.ObjectId()
      .toString();

const setGuestCookie = (
  res,
  guestOwnerId,
) => {
  const encodedGuestId =
    encodeURIComponent(
      guestOwnerId,
    );

  res.setHeader(
    'Set-Cookie',
    [
      `${GUEST_COOKIE_NAME}=${encodedGuestId}`,
      'Path=/',
      `Max-Age=${Math.floor(
        GUEST_COOKIE_MAX_AGE / 1000,
      )}`,
      'HttpOnly',
      'SameSite=Lax',
    ].join('; '),
  );
};

const isValidGuestOwnerId = (
  ownerId,
) =>
  typeof ownerId === 'string' &&
  mongoose.isValidObjectId(
    ownerId,
  );

const createNewGuestSession = async (
  res,
) => {
  const guestOwnerId =
    createTemporaryGuestOwnerId();

  await guestSessionService
    .getOrCreateGuestSession({
      guestOwnerId,
    });

  setGuestCookie(
    res,
    guestOwnerId,
  );

  return guestOwnerId;
};

const requireAuthorization = async (
  req,
  res,
  next,
) => {
  try {
    if (req.auth?.ownerId) {
      return next();
    }

    const externalOwnerId =
      getExternalOwnerId(req);

    if (externalOwnerId) {
      req.auth = {
        ownerId:
          externalOwnerId,

        userType:
          'user',
      };

      return next();
    }

    const cookieGuestOwnerId =
      getGuestIdFromCookie(req);

    if (
      !isValidGuestOwnerId(
        cookieGuestOwnerId,
      )
    ) {
      const guestOwnerId =
        await createNewGuestSession(
          res,
        );

      req.auth = {
        ownerId:
          guestOwnerId,

        userType:
          'guest',
      };

      return next();
    }

    const existingSession =
      await guestSessionService
        .getGuestSession({
          guestOwnerId:
            cookieGuestOwnerId,
        });

    /*
     * The browser may still send an old
     * guest cookie after the GuestSession
     * has expired or cleanup has removed it.
     *
     * Never recreate the old owner ID.
     * Create a completely new guest identity.
     */
    if (
      !existingSession ||
      !existingSession.expiresAt ||
      new Date(
        existingSession.expiresAt,
      ).getTime() <=
        Date.now()
    ) {
      const guestOwnerId =
        await createNewGuestSession(
          res,
        );

      req.auth = {
        ownerId:
          guestOwnerId,

        userType:
          'guest',
      };

      return next();
    }

    req.auth = {
      ownerId:
        cookieGuestOwnerId,

      userType:
        'guest',
    };

    return next();
  } catch (error) {
    return next(error);
  }
};

const requireOwner = (
  req,
  _res,
  next,
) => {
  const ownerId =
    normalizeOwnerId(
      req.auth?.ownerId,
    );

  if (!ownerId) {
    const error = new Error(
      'Owner identity is required.',
    );

    error.statusCode = 403;
    error.code =
      'OWNER_CONTEXT_REQUIRED';

    return next(error);
  }

  req.auth.ownerId =
    ownerId;

  return next();
};

const requireOwnerMatch = (
  req,
  _res,
  next,
) => {
  const authenticatedOwnerId =
    normalizeOwnerId(
      req.auth?.ownerId,
    );

  const requestedOwnerId =
    normalizeOwnerId(
      req.params?.ownerId ??
        req.body?.ownerId ??
        req.query?.ownerId,
    );

  if (!authenticatedOwnerId) {
    const error = new Error(
      'Owner identity is required.',
    );

    error.statusCode = 403;
    error.code =
      'OWNER_CONTEXT_REQUIRED';

    return next(error);
  }

  if (
    requestedOwnerId &&
    requestedOwnerId !==
      authenticatedOwnerId
  ) {
    const error = new Error(
      'Access to the requested owner resource is denied.',
    );

    error.statusCode = 403;
    error.code =
      'OWNER_ACCESS_DENIED';

    return next(error);
  }

  return next();
};

const getOwnerId = (req) =>
  normalizeOwnerId(
    req.auth?.ownerId,
  );

const getUserType = (req) =>
  req.auth?.userType === 'guest'
    ? 'guest'
    : 'user';

const isGuestRequest = (req) =>
  getUserType(req) === 'guest';

const isAuthenticatedRequest = (
  req,
) =>
  getUserType(req) === 'user';

export {
  GUEST_COOKIE_NAME,
  GUEST_COOKIE_MAX_AGE,
  normalizeOwnerId,
  getExternalOwnerId,
  getGuestIdFromCookie,
  createTemporaryGuestOwnerId,
  setGuestCookie,
  requireAuthorization,
  requireOwner,
  requireOwnerMatch,
  getOwnerId,
  getUserType,
  isGuestRequest,
  isAuthenticatedRequest,
};