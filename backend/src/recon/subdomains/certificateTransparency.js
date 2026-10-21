
/* STATUS: CREATED */

import axios from "axios";

import {
  normalizeHostname,
  validateAndDeduplicateCandidates,
} from "./subdomainValidation.js";

const CRT_SH_URL = "https://crt.sh/";
const REQUEST_TIMEOUT_MS = 15_000;
const MAX_RESPONSE_BYTES = 2 * 1024 * 1024;
const DEFAULT_MAX_CANDIDATES = 500;

const normalizeLimit = (value) => {
  if (value === undefined || value === null) {
    return DEFAULT_MAX_CANDIDATES;
  }

  if (!Number.isInteger(value) || value < 0) {
    throw new Error("Invalid certificate-transparency candidate limit.");
  }

  return Math.min(value, DEFAULT_MAX_CANDIDATES);
};

const extractCertificateNames = (records) => {
  if (!Array.isArray(records)) {
    throw new Error("Invalid Certificate Transparency response.");
  }

  const names = [];

  for (const record of records) {
    if (typeof record?.name_value !== "string") {
      continue;
    }

    for (const value of record.name_value.split(/[\r\n,]+/)) {
      const name = value.trim().toLowerCase();

      if (!name || name.startsWith("*.")) {
        names.push(name.replace(/^\*\./, ""));
        continue;
      }

      names.push(name);
    }
  }

  return names;
};

/**
 * Discover candidate hostnames from public Certificate Transparency logs.
 *
 * This function does not resolve hosts or perform active scanning.
 * DNS and scope validation remain the responsibility of the main scanner.
 */
const discoverCertificateTransparency = async ({
  hostname,
  signal,
  maxCandidates = DEFAULT_MAX_CANDIDATES,
} = {}) => {
  const root = normalizeHostname(hostname);
  const limit = normalizeLimit(maxCandidates);

  if (signal?.aborted || limit === 0) {
    return [];
  }

  const response = await axios.get(CRT_SH_URL, {
    params: {
      q: `%.${root}`,
      output: "json",
    },
    timeout: REQUEST_TIMEOUT_MS,
    signal,
    responseType: "json",
    maxContentLength: MAX_RESPONSE_BYTES,
    maxBodyLength: MAX_RESPONSE_BYTES,
    headers: {
      Accept: "application/json",
    },
  });

  if (signal?.aborted) {
    return [];
  }

  const names = extractCertificateNames(response.data);

  return validateAndDeduplicateCandidates(
    names.map((candidate) => ({
      hostname: candidate,
      source: "certificate-transparency",
      depth: candidate.split(".").length - root.split(".").length,
    })),
    {
      rootHostname: root,
      maxCandidates: limit,
    },
  );
};

export {
  discoverCertificateTransparency,
};
