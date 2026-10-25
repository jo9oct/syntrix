/* STATUS: CREATED */

import { isIP } from "node:net";

const MAX_HOSTNAME_LENGTH = 253;
const MAX_LABEL_LENGTH = 63;
const DEFAULT_MAX_CANDIDATES = 500;

const normalizeHostname = (value) => {
  if (typeof value !== "string") {
    throw new Error("Subdomain hostname must be a string.");
  }

  const hostname = value.trim().toLowerCase().replace(/\.$/, "");

  if (
    !hostname ||
    hostname.length > MAX_HOSTNAME_LENGTH ||
    isIP(hostname) !== 0 ||
    hostname.includes("://") ||
    hostname.includes("/") ||
    hostname.includes("@") ||
    hostname.includes(":") ||
    /\s/.test(hostname)
  ) {
    throw new Error("Invalid DNS hostname.");
  }

  const labels = hostname.split(".");

  if (
    labels.length < 2 ||
    labels.some(
      (label) =>
        label.length < 1 ||
        label.length > MAX_LABEL_LENGTH ||
        !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(label),
    )
  ) {
    throw new Error("Invalid DNS hostname.");
  }

  return hostname;
};

const normalizeLimit = (maxCandidates) => {
  if (maxCandidates === undefined || maxCandidates === null) {
    return DEFAULT_MAX_CANDIDATES;
  }

  if (!Number.isInteger(maxCandidates) || maxCandidates < 0) {
    throw new Error("Invalid subdomain candidate limit.");
  }

  return Math.min(maxCandidates, DEFAULT_MAX_CANDIDATES);
};

const isWithinDiscoveryRoot = (candidate, root) =>
  candidate !== root && candidate.endsWith(`.${root}`);

const validateAndDeduplicateCandidates = (
  candidates,
  { rootHostname, maxCandidates = DEFAULT_MAX_CANDIDATES } = {},
) => {
  if (!Array.isArray(candidates)) {
    throw new Error("Subdomain candidates must be an array.");
  }

  const limit = normalizeLimit(maxCandidates);
  const root =
    rootHostname === undefined || rootHostname === null
      ? null
      : normalizeHostname(rootHostname);

  const results = [];
  const seen = new Set();

  for (const entry of candidates) {
    if (results.length >= limit) {
      break;
    }

    const rawHostname = typeof entry === "string" ? entry : entry?.hostname;

    if (typeof rawHostname !== "string") {
      continue;
    }

    let hostname;

    try {
      hostname = normalizeHostname(rawHostname);
    } catch {
      continue;
    }

    if (root && !isWithinDiscoveryRoot(hostname, root)) {
      continue;
    }

    if (seen.has(hostname)) {
      continue;
    }

    seen.add(hostname);

    if (typeof entry === "string") {
      results.push({
        hostname,
        source: "unknown",
      });
    } else {
      results.push({
        ...entry,
        hostname,
      });
    }
  }

  return results;
};

export {
  isWithinDiscoveryRoot,
  normalizeHostname,
  validateAndDeduplicateCandidates,
};
