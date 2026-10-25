/* STATUS: CREATED */

import axios from "axios";

import {
  normalizeHostname,
  validateAndDeduplicateCandidates,
} from "./subdomainValidation.js";

const HACKERTARGET_URL = "https://api.hackertarget.com/hostsearch/";

const REQUEST_TIMEOUT_MS = 3000;
const MAX_RESPONSE_BYTES = 512 * 1024;
const DEFAULT_MAX_CANDIDATES = 500;

const normalizeLimit = (value) => {
  if (value === undefined || value === null) {
    return DEFAULT_MAX_CANDIDATES;
  }

  if (!Number.isInteger(value) || value < 0) {
    throw new Error("Invalid public-source candidate limit.");
  }

  return Math.min(value, DEFAULT_MAX_CANDIDATES);
};

const parseHostSearchResponse = (responseText) => {
  if (typeof responseText !== "string") {
    throw new Error("Invalid public-source response.");
  }

  const trimmed = responseText.trim();

  if (!trimmed) {
    return [];
  }

  if (/^(error|invalid|api count limit|no records found)/i.test(trimmed)) {
    throw new Error(
      "The public hostname source returned an error or no usable data.",
    );
  }

  const candidates = [];

  for (const line of trimmed.split(/\r?\n/)) {
    const separator = line.indexOf(",");

    if (separator <= 0) {
      continue;
    }

    const hostname = line.slice(0, separator).trim();

    if (hostname) {
      candidates.push({
        hostname,
        source: "hackertarget",
      });
    }
  }

  return candidates;
};

/**
 * Discover candidates from a public hostname dataset.
 *
 * This function does not resolve candidates or perform active scans.
 * The main scanner remains responsible for DNS and scope validation.
 */
const discoverPublicSources = async ({
  hostname,
  signal,
  maxCandidates = DEFAULT_MAX_CANDIDATES,
} = {}) => {
  const root = normalizeHostname(hostname);
  const limit = normalizeLimit(maxCandidates);

  if (signal?.aborted || limit === 0) {
    return [];
  }

  const response = await axios.get(HACKERTARGET_URL, {
    params: {
      q: root,
    },
    timeout: REQUEST_TIMEOUT_MS,
    signal,
    responseType: "text",
    transformResponse: [(data) => data],
    maxContentLength: MAX_RESPONSE_BYTES,
    maxBodyLength: MAX_RESPONSE_BYTES,
    headers: {
      Accept: "text/plain",
    },
  });

  if (signal?.aborted) {
    return [];
  }

  const candidates = parseHostSearchResponse(response.data);

  return validateAndDeduplicateCandidates(candidates, {
    rootHostname: root,
    maxCandidates: limit,
  });
};

export { discoverPublicSources };
