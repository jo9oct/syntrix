
/* STATUS: CREATED */

import {
  normalizeHostname,
  validateAndDeduplicateCandidates,
} from "./subdomainValidation.js";

const DEFAULT_MAX_CANDIDATES = 500;
const MAX_RECURSION_DEPTH = 3;

const DEFAULT_LABELS = Object.freeze([
  "www",
  "api",
  "admin",
  "dev",
  "test",
  "staging",
  "portal",
  "app",
  "internal",
  "secure",
]);

const normalizeLimit = (value) => {
  if (value === undefined || value === null) {
    return DEFAULT_MAX_CANDIDATES;
  }

  if (!Number.isInteger(value) || value < 0) {
    throw new Error("Invalid recursive candidate limit.");
  }

  return Math.min(value, DEFAULT_MAX_CANDIDATES);
};

const normalizeDepth = (value) => {
  if (value === undefined || value === null) {
    return 2;
  }

  if (!Number.isInteger(value) || value < 0) {
    throw new Error("Invalid recursive discovery depth.");
  }

  return Math.min(value, MAX_RECURSION_DEPTH);
};

const normalizeLabels = (labels) => {
  if (!Array.isArray(labels)) {
    throw new Error("Recursive discovery labels must be an array.");
  }

  const results = [];
  const seen = new Set();

  for (const value of labels) {
    if (typeof value !== "string") {
      continue;
    }

    const label = value.trim().toLowerCase();

    if (
      !label ||
      label.length > 63 ||
      !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(label) ||
      seen.has(label)
    ) {
      continue;
    }

    seen.add(label);
    results.push(label);
  }

  return results;
};

/**
 * Generate recursive subdomain candidates from already discovered hosts.
 *
 * No DNS requests, HTTP requests, or active security tests are performed.
 */
const discoverRecursively = async ({
  hostname,
  discovered = [],
  labels = DEFAULT_LABELS,
  signal,
  maxCandidates = DEFAULT_MAX_CANDIDATES,
  maxDepth = 2,
} = {}) => {
  const root = normalizeHostname(hostname);
  const limit = normalizeLimit(maxCandidates);
  const depthLimit = normalizeDepth(maxDepth);
  const labelList = normalizeLabels(labels);

  if (
    signal?.aborted ||
    limit === 0 ||
    depthLimit === 0 ||
    !Array.isArray(discovered) ||
    discovered.length === 0
  ) {
    return [];
  }

  const knownHosts = validateAndDeduplicateCandidates(
    discovered,
    {
      rootHostname: root,
      maxCandidates: DEFAULT_MAX_CANDIDATES,
    },
  );

  const queue = knownHosts.map((entry) => ({
    hostname: entry.hostname,
    depth: Math.max(
      1,
      entry.hostname.split(".").length - root.split(".").length,
    ),
  }));

  const seen = new Set([
    root,
    ...knownHosts.map((entry) => entry.hostname),
  ]);

  const results = [];

  for (let index = 0; index < queue.length; index += 1) {
    if (signal?.aborted || results.length >= limit) {
      break;
    }

    const current = queue[index];

    if (current.depth >= depthLimit) {
      continue;
    }

    for (const label of labelList) {
      if (signal?.aborted || results.length >= limit) {
        break;
      }

      const candidate = `${label}.${current.hostname}`;

      if (
        candidate.length > 253 ||
        candidate === root ||
        !candidate.endsWith(`.${root}`) ||
        seen.has(candidate)
      ) {
        continue;
      }

      seen.add(candidate);

      const entry = {
        hostname: candidate,
        source: "recursive",
        depth: current.depth + 1,
      };

      results.push(entry);
      queue.push(entry);
    }
  }

  return validateAndDeduplicateCandidates(results, {
    rootHostname: root,
    maxCandidates: limit,
  });
};

export {
  DEFAULT_LABELS,
  discoverRecursively,
};
