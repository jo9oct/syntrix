// STATUS: UPDATED

import mongoose from "mongoose";

import environment from "../config/environment.js";

import * as guestSessionRepository from "../database/repositories/guestSession.repository.js";

import { enqueueCleanupJob } from "../jobs/cleanup.job.js";

const getGuestSessionTtlMs = () =>
  environment.guest.sessionTtlMinutes * 60 * 1000;

const assertGuestOwnerId = (guestOwnerId) => {
  if (!mongoose.isValidObjectId(guestOwnerId)) {
    const error = new Error("Guest owner ID must be a valid ObjectId.");

    error.statusCode = 400;
    error.code = "INVALID_GUEST_OWNER_ID";

    throw error;
  }

  return new mongoose.Types.ObjectId(guestOwnerId);
};

const scheduleGuestCleanup = async ({ guestOwnerId, expiresAt }) => {
  const delay = Math.max(0, expiresAt.getTime() - Date.now());

  return enqueueCleanupJob({
    ownerId: guestOwnerId,

    resourceType: "guest-session",

    resourceId: guestOwnerId,

    delay,
  });
};

const createGuestSession = async ({ guestOwnerId, now = new Date() }) => {
  const normalizedGuestOwnerId = assertGuestOwnerId(guestOwnerId);

  const expiresAt = new Date(now.getTime() + getGuestSessionTtlMs());

  const session = await guestSessionRepository.create({
    guestOwnerId: normalizedGuestOwnerId,

    expiresAt,
  });

  await scheduleGuestCleanup({
    guestOwnerId: normalizedGuestOwnerId,

    expiresAt,
  });

  return session;
};

const getGuestSession = async ({ guestOwnerId }) => {
  const normalizedGuestOwnerId = assertGuestOwnerId(guestOwnerId);

  return guestSessionRepository.findByGuestOwnerId(normalizedGuestOwnerId);
};

const getOrCreateGuestSession = async ({ guestOwnerId, now = new Date() }) => {
  const normalizedGuestOwnerId = assertGuestOwnerId(guestOwnerId);

  const existingSession = await guestSessionRepository.findByGuestOwnerId(
    normalizedGuestOwnerId,
  );

  if (existingSession) {
    return {
      session: existingSession,

      created: false,
    };
  }

  const expiresAt = new Date(now.getTime() + getGuestSessionTtlMs());

  try {
    const session = await guestSessionRepository.create({
      guestOwnerId: normalizedGuestOwnerId,

      expiresAt,
    });

    await scheduleGuestCleanup({
      guestOwnerId: normalizedGuestOwnerId,

      expiresAt,
    });

    return {
      session,
      created: true,
    };
  } catch (error) {
    if (error?.code === 11000) {
      const session = await guestSessionRepository.findByGuestOwnerId(
        normalizedGuestOwnerId,
      );

      if (session) {
        return {
          session,
          created: false,
        };
      }
    }

    throw error;
  }
};

const refreshGuestSession = async ({ guestOwnerId, now = new Date() }) => {
  const normalizedGuestOwnerId = assertGuestOwnerId(guestOwnerId);

  const expiresAt = new Date(now.getTime() + getGuestSessionTtlMs());

  return guestSessionRepository.updateExpiration({
    guestOwnerId: normalizedGuestOwnerId,

    expiresAt,
  });
};

const deleteGuestSession = async ({ guestOwnerId }) => {
  const normalizedGuestOwnerId = assertGuestOwnerId(guestOwnerId);

  return guestSessionRepository.deleteByGuestOwnerId(normalizedGuestOwnerId);
};

export {
  getGuestSessionTtlMs,
  createGuestSession,
  getGuestSession,
  getOrCreateGuestSession,
  refreshGuestSession,
  deleteGuestSession,
};
