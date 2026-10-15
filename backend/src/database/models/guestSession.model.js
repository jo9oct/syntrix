// STATUS: UPDATED

import mongoose from "mongoose";

const { Schema, model } = mongoose;

const guestSessionSchema = new Schema(
  {
    guestOwnerId: {
      type: Schema.Types.ObjectId,
      required: true,
      unique: true,
      index: true,
    },

    expiresAt: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

guestSessionSchema.index(
  {
    expiresAt: 1,
  },
  {
    expireAfterSeconds: 0,
  },
);

const GuestSession = model("GuestSession", guestSessionSchema);

export default GuestSession;
