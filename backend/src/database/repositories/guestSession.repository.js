// STATUS: CREATED

import GuestSession from '../models/guestSession.model.js';

const findByGuestOwnerId = async (
  guestOwnerId,
) =>
  GuestSession.findOne({
    guestOwnerId,
  }).lean();

const create = async ({
  guestOwnerId,
  expiresAt,
}) =>
  GuestSession.create({
    guestOwnerId,
    expiresAt,
  });

const updateExpiration = async ({
  guestOwnerId,
  expiresAt,
}) =>
  GuestSession.findOneAndUpdate(
    {
      guestOwnerId,
    },
    {
      $set: {
        expiresAt,
      },
    },
    {
      new: true,
    },
  ).lean();

const deleteByGuestOwnerId = async (
  guestOwnerId,
) =>
  GuestSession.deleteOne({
    guestOwnerId,
  });

export {
  findByGuestOwnerId,
  create,
  updateExpiration,
  deleteByGuestOwnerId,
};