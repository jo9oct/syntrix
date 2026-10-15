// STATUS: UPDATED
// File: src/services/scope.service.js

import { domainToASCII } from "node:url";
import * as scopeRepository from "../database/repositories/scope.repository.js";

const createServiceError = (code, message, statusCode = 400) => {
  const error = new Error(message);
  error.code = code;
  error.statusCode = statusCode;
  return error;
};

const normalizeScopeName = (value) => {
  if (typeof value !== "string") {
    throw createServiceError("INVALID_SCOPE_NAME", "Scope name is required.");
  }

  const name = value.trim();

  if (!name || name.length > 120) {
    throw createServiceError(
      "INVALID_SCOPE_NAME",
      "Scope name must contain between 1 and 120 characters.",
    );
  }

  return {
    name,
    nameKey: name.toLowerCase(),
  };
};

const normalizeHostname = (value) => {
  if (typeof value !== "string") {
    throw createServiceError(
      "INVALID_HOSTNAME",
      "Each hostname must be a string.",
    );
  }

  const hostname = value.trim().toLowerCase();

  if (
    !hostname ||
    hostname.includes("://") ||
    hostname.includes("/") ||
    hostname.includes("*") ||
    hostname.includes("@") ||
    hostname.includes(":") ||
    /\s/.test(hostname)
  ) {
    throw createServiceError("INVALID_HOSTNAME", `Invalid hostname: ${value}`);
  }

  const asciiHostname = domainToASCII(hostname.replace(/\.$/, ""));

  if (
    !asciiHostname ||
    asciiHostname.length > 253 ||
    !asciiHostname.includes(".") ||
    asciiHostname
      .split(".")
      .some(
        (label) =>
          !label ||
          label.length > 63 ||
          !/^[a-z\d](?:[a-z\d-]*[a-z\d])?$/i.test(label),
      )
  ) {
    throw createServiceError("INVALID_HOSTNAME", `Invalid hostname: ${value}`);
  }

  return asciiHostname;
};

const normalizeScopeInput = ({
  name,
  hostnames,
  ports,
  includeSubdomains = false,
}) => {
  const normalizedName = normalizeScopeName(name);

  if (
    !Array.isArray(hostnames) ||
    hostnames.length < 1 ||
    hostnames.length > 100
  ) {
    throw createServiceError(
      "INVALID_HOSTNAMES",
      "Provide between 1 and 100 hostnames.",
    );
  }

  const normalizedHostnames = hostnames.map(normalizeHostname);

  if (new Set(normalizedHostnames).size !== normalizedHostnames.length) {
    throw createServiceError(
      "DUPLICATE_HOSTNAMES",
      "Hostnames must be unique.",
    );
  }

  if (
    !Array.isArray(ports) ||
    ports.length < 1 ||
    ports.length > 100 ||
    ports.some((port) => !Number.isInteger(port) || port < 1 || port > 65535)
  ) {
    throw createServiceError(
      "INVALID_PORTS",
      "Provide between 1 and 100 valid ports (1–65535).",
    );
  }

  if (new Set(ports).size !== ports.length) {
    throw createServiceError("DUPLICATE_PORTS", "Ports must be unique.");
  }

  if (typeof includeSubdomains !== "boolean") {
    throw createServiceError(
      "INVALID_SUBDOMAIN_SETTING",
      "includeSubdomains must be a boolean.",
    );
  }

  return {
    ...normalizedName,
    hostnames: normalizedHostnames,
    ports: [...ports],
    includeSubdomains,
  };
};

const getTargetAddress = (targetUrl) => {
  let parsed;

  try {
    parsed = new URL(targetUrl);
  } catch {
    throw createServiceError(
      "INVALID_TARGET_URL",
      "A valid target URL is required.",
    );
  }

  if (
    !["http:", "https:"].includes(parsed.protocol) ||
    parsed.username ||
    parsed.password
  ) {
    throw createServiceError(
      "INVALID_TARGET_URL",
      "Target must be an HTTP or HTTPS URL without embedded credentials.",
    );
  }

  const hostname = normalizeHostname(parsed.hostname);
  const port = parsed.port
    ? Number(parsed.port)
    : parsed.protocol === "https:"
      ? 443
      : 80;

  return { hostname, port };
};

const scopeContainsTarget = (scope, target) => {
  const hostnameMatches = scope.hostnames.some(
    (allowedHostname) =>
      target.hostname === allowedHostname ||
      (scope.includeSubdomains &&
        target.hostname.endsWith(`.${allowedHostname}`)),
  );

  return hostnameMatches && scope.ports.includes(target.port);
};

const createScope = async ({ ownerId, ...input }) => {
  const normalized = normalizeScopeInput(input);

  return scopeRepository.create({
    ...normalized,
    ownerId,
  });
};

const listScopes = async ({ ownerId }) => {
  return scopeRepository.listByOwner(ownerId);
};

const getScope = async ({ ownerId, scopeId }) => {
  const scope = await scopeRepository.findByIdAndOwner({
    ownerId,
    scopeId,
  });

  if (!scope) {
    throw createServiceError("SCOPE_NOT_FOUND", "Scope was not found.", 404);
  }

  return scope;
};

const updateScope = async ({ ownerId, scopeId, updates }) => {
  const existing = await scopeRepository.findByIdAndOwner({
    ownerId,
    scopeId,
  });

  if (!existing) {
    throw createServiceError("SCOPE_NOT_FOUND", "Scope was not found.", 404);
  }

  const allowedFields = ["name", "hostnames", "ports", "includeSubdomains"];

  const unknownFields = Object.keys(updates).filter(
    (field) => !allowedFields.includes(field),
  );

  if (unknownFields.length) {
    throw createServiceError(
      "INVALID_SCOPE_UPDATE",
      `Unsupported scope fields: ${unknownFields.join(", ")}`,
    );
  }

  const merged = normalizeScopeInput({
    name: updates.name ?? existing.name,
    hostnames: updates.hostnames ?? existing.hostnames,
    ports: updates.ports ?? existing.ports,
    includeSubdomains: updates.includeSubdomains ?? existing.includeSubdomains,
  });

  const updated = await scopeRepository.updateByIdAndOwner({
    ownerId,
    scopeId,
    updates: merged,
  });

  if (!updated) {
    throw createServiceError("SCOPE_NOT_FOUND", "Scope was not found.", 404);
  }

  return updated;
};

const deleteScope = async ({ ownerId, scopeId }) => {
  const deleted = await scopeRepository.deleteByIdAndOwner({
    ownerId,
    scopeId,
  });

  if (!deleted) {
    throw createServiceError("SCOPE_NOT_FOUND", "Scope was not found.", 404);
  }

  return { deleted: true, scopeId };
};

const resolveScopeForTarget = async ({ ownerId, targetUrl, scopeId }) => {
  const target = getTargetAddress(targetUrl);
  let selectedScope;

  if (scopeId) {
    selectedScope = await scopeRepository.findByIdAndOwner({
      ownerId,
      scopeId,
    });

    if (!selectedScope) {
      throw createServiceError(
        "SCOPE_NOT_FOUND",
        "The selected scope was not found.",
        404,
      );
    }

    if (!scopeContainsTarget(selectedScope, target)) {
      throw createServiceError(
        "TARGET_OUTSIDE_SCOPE",
        "The target hostname or port is not allowed by the selected scope.",
        403,
      );
    }
  } else {
    const matchingScopes = await scopeRepository.findMatchingScopes({
      ownerId,
      hostname: target.hostname,
      port: target.port,
    });

    if (matchingScopes.length === 0) {
      throw createServiceError(
        "SCOPE_NOT_CONFIGURED",
        "No saved scope allows this target. Create a scope or choose an existing one.",
        403,
      );
    }

    if (matchingScopes.length > 1) {
      throw createServiceError(
        "SCOPE_SELECTION_REQUIRED",
        "Several saved scopes allow this target. Provide scopeId to select one.",
        409,
      );
    }

    [selectedScope] = matchingScopes;
  }

  return {
    scopeId: String(selectedScope._id),
    scopeSnapshot: {
      scopeId: String(selectedScope._id),
      name: selectedScope.name,
      hostnames: [...selectedScope.hostnames],
      ports: [...selectedScope.ports],
      includeSubdomains: selectedScope.includeSubdomains,
      schemaVersion: 1,
      capturedAt: new Date(),
      targetHostname: target.hostname,
      targetPort: target.port,
    },
  };
};

export {
  normalizeScopeInput,
  scopeContainsTarget,
  createScope,
  listScopes,
  getScope,
  updateScope,
  deleteScope,
  resolveScopeForTarget,
};
