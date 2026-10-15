// src/database/repositories/scope.repository.js

import mongoose from "mongoose";
import Scope from "../models/scope.model.js";

const createRepositoryError = (code, message, statusCode = 400) => {
  const error = new Error(message);
  error.code = code;
  error.statusCode = statusCode;
  return error;
};

const toObjectId = (value) => {
  const id = String(value ?? "");

  if (!/^[a-f\d]{24}$/i.test(id) || !mongoose.isValidObjectId(id)) {
    throw createRepositoryError(
      "INVALID_ID",
      "A valid owner ID or scope ID is required.",
      400,
    );
  }

  return new mongoose.Types.ObjectId(id);
};

const normalizeDatabaseError = (error) => {
  if (error?.code === 11000) {
    throw createRepositoryError(
      "SCOPE_NAME_ALREADY_EXISTS",
      "A scope with this name already exists in your account. Please use a different name.",
      409,
    );
  }

  throw error;
};

const create = async (data) => {
  try {
    const ownerId = toObjectId(data.ownerId);

    // Check first so the user receives a clear duplicate-name error.
    const existingScope = await Scope.findOne({
      ownerId,
      name: data.name,
    })
      .select("_id")
      .lean();

    if (existingScope) {
      throw createRepositoryError(
        "SCOPE_NAME_ALREADY_EXISTS",
        "This scope name is already in use. Please choose a different name.",
        409,
      );
    }

    return await Scope.create({
      ...data,
      ownerId,
    });
  } catch (error) {
    if (error?.code === "SCOPE_NAME_ALREADY_EXISTS") {
      throw error;
    }

    // The unique database index also protects against simultaneous requests.
    normalizeDatabaseError(error);
  }
};

const listByOwner = async (ownerId) => {
  const normalizedOwnerId = toObjectId(ownerId);

  return Scope.find({
    ownerId: normalizedOwnerId,
  })
    .sort({ createdAt: -1 })
    .lean();
};

const findByIdAndOwner = async ({ scopeId, ownerId }) => {
  const normalizedScopeId = toObjectId(scopeId);
  const normalizedOwnerId = toObjectId(ownerId);

  return Scope.findOne({
    _id: normalizedScopeId,
    ownerId: normalizedOwnerId,
  }).lean();
};

const updateByIdAndOwner = async ({ scopeId, ownerId, updates }) => {
  const normalizedScopeId = toObjectId(scopeId);
  const normalizedOwnerId = toObjectId(ownerId);

  if (!updates || typeof updates !== "object" || Array.isArray(updates)) {
    throw createRepositoryError(
      "INVALID_SCOPE_UPDATES",
      "Valid scope update data is required.",
      400,
    );
  }

  const safeUpdates = { ...updates };

  delete safeUpdates._id;
  delete safeUpdates.id;
  delete safeUpdates.ownerId;
  delete safeUpdates.createdAt;
  delete safeUpdates.updatedAt;
  delete safeUpdates.__v;

  try {
    // Reject a duplicate name before updating.
    if (typeof safeUpdates.name === "string") {
      const existingScope = await Scope.findOne({
        ownerId: normalizedOwnerId,
        name: safeUpdates.name,
        _id: { $ne: normalizedScopeId },
      })
        .select("_id")
        .lean();

      if (existingScope) {
        throw createRepositoryError(
          "SCOPE_NAME_ALREADY_EXISTS",
          "This scope name is already in use. Please choose a different name.",
          409,
        );
      }
    }

    return await Scope.findOneAndUpdate(
      {
        _id: normalizedScopeId,
        ownerId: normalizedOwnerId,
      },
      {
        $set: safeUpdates,
      },
      {
        new: true,
        runValidators: true,
        context: "query",
      },
    ).lean();
  } catch (error) {
    if (error?.code === "SCOPE_NAME_ALREADY_EXISTS") {
      throw error;
    }

    normalizeDatabaseError(error);
  }
};

const deleteByIdAndOwner = async ({ scopeId, ownerId }) => {
  const normalizedScopeId = toObjectId(scopeId);
  const normalizedOwnerId = toObjectId(ownerId);

  const deletedScope = await Scope.findOneAndDelete({
    _id: normalizedScopeId,
    ownerId: normalizedOwnerId,
  }).lean();

  return {
    deleted: Boolean(deletedScope),
    scopeId: deletedScope?._id?.toString() ?? null,
  };
};

const findMatchingScopes = async ({ ownerId, hostname, port }) => {
  const normalizedOwnerId = toObjectId(ownerId);

  if (
    typeof hostname !== "string" ||
    !hostname.trim() ||
    !Number.isInteger(port) ||
    port < 1 ||
    port > 65535
  ) {
    throw createRepositoryError(
      "INVALID_SCOPE_TARGET",
      "A valid target hostname and port are required.",
      400,
    );
  }

  const normalizedHostname = hostname.toLowerCase();

  const scopes = await Scope.find({
    ownerId: normalizedOwnerId,
    ports: port,
  }).lean();

  return scopes.filter((scope) =>
    scope.hostnames.some((allowedHostname) => {
      const allowed = allowedHostname.toLowerCase();

      if (normalizedHostname === allowed) {
        return true;
      }

      return (
        scope.includeSubdomains === true &&
        normalizedHostname.endsWith(`.${allowed}`)
      );
    }),
  );
};

export {
  create,
  listByOwner,
  findByIdAndOwner,
  updateByIdAndOwner,
  deleteByIdAndOwner,
  findMatchingScopes,
};
