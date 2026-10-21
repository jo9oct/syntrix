
/* STATUS: CREATED */

import {
  normalizeHostname,
  validateAndDeduplicateCandidates,
} from "./subdomainValidation.js";

const DEFAULT_WORDLIST = Object.freeze([
  "www",
  "api",
  "app",
  "admin",
  "portal",
  "dev",
  "test",
  "staging",
  "qa",
  "uat",
  "mail",
  "smtp",
  "ftp",
  "cdn",
  "static",
  "assets",
  "blog",
  "docs",
  "support",
  "status",
  "dashboard",
  "auth",
  "login",
  "account",
  "accounts",
  "secure",
  "vpn",
  "remote",
  "gateway",
  "internal",
  "monitor",
  "monitoring",
  "metrics",
  "grafana",
  "jenkins",
  "git",
  "gitlab",
  "registry",
  "storage",
  "files",
  "download",
  "uploads",
  "images",
  "media",
  "search",
  "shop",
  "store",
  "payments",
  "billing",
  "docs",
  "help",
]);

const MAX_WORDLIST_SIZE = 500;
const MAX_HOSTNAME_LENGTH = 253;

const normalizeLimit = (value) => {
  if (value === undefined || value === null) {
    return MAX_WORDLIST_SIZE;
  }

  if (!Number.isInteger(value) || value < 0) {
    throw new Error("Invalid wordlist candidate limit.");
  }

  return Math.min(value, MAX_WORDLIST_SIZE);
};

const normalizeLabels = (labels, maxCandidates) => {
  if (!Array.isArray(labels)) {
    throw new Error("Wordlist labels must be an array.");
  }

  const normalized = [];
  const seen = new Set();

  for (const value of labels) {
    if (typeof value !== "string") {
      continue;
    }

    const label = value.trim().toLowerCase();

    if (
      !label ||
      label.length > 63 ||
      !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(label)
    ) {
      continue;
    }

    if (seen.has(label)) {
      continue;
    }

    seen.add(label);
    normalized.push(label);

    if (normalized.length >= maxCandidates) {
      break;
    }
  }

  return normalized;
};

/**
 * Generate candidates only. This function performs no DNS lookups,
 * HTTP requests, or active security scans.
 */
const discoverWordlist = async ({
  hostname,
  labels,
  signal,
  maxCandidates = MAX_WORDLIST_SIZE,
} = {}) => {
  const root = normalizeHostname(hostname);
  const limit = normalizeLimit(maxCandidates);

  if (signal?.aborted || limit === 0) {
    return [];
  }

  const configuredLabels =
    labels === undefined || labels === null
      ? DEFAULT_WORDLIST
      : labels;

  const normalizedLabels = normalizeLabels(
    configuredLabels,
    limit,
  );

  const candidates = [];

  for (const label of normalizedLabels) {
    if (signal?.aborted || candidates.length >= limit) {
      break;
    }

    const candidate = `${label}.${root}`;

    if (candidate.length > MAX_HOSTNAME_LENGTH) {
      continue;
    }

    candidates.push({
      hostname: candidate,
      source: "wordlist",
      depth: 1,
    });
  }

  return validateAndDeduplicateCandidates(candidates, {
    rootHostname: root,
    maxCandidates: limit,
  });
};

export {
  DEFAULT_WORDLIST,
  discoverWordlist,
};
