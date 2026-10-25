/* STATUS: UPDATED */

import { randomBytes } from "node:crypto";
import { isIP } from "node:net";

import {
  createReconScanner,
  getTargetHostname,
} from "../shared/reconContract.js";

import { resolveAndValidateHostname } from "../shared/resolver.js";

import { createFingerprint } from "../shared/fingerprint.js";

import { discoverWordlist } from "./wordlistDiscovery.js";
import { discoverCertificateTransparency } from "./certificateTransparency.js";
import { discoverPublicSources } from "./publicSourceDiscovery.js";
import { discoverRecursively } from "./recursiveDiscovery.js";
import {
  normalizeHostname,
  validateAndDeduplicateCandidates,
} from "./subdomainValidation.js";
import { runConcurrent } from "../../utils/concurrency.js";

const COMMON_SUBDOMAINS = Object.freeze([
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
]);

const MAX_CANDIDATES = 500;
const MAX_ADDRESSES = 32;
const MAX_HOSTNAME_LENGTH = 253;

const DEFAULT_OPTIONS = Object.freeze({
  wordlist: true,
  certificateTransparency: true,
  publicSources: true,
  recursive: true,
  maxCandidates: 500,
  maxDepth: 2,
});

const normalizeOptions = (options = {}) => {
  const source =
    options && typeof options === "object" && !Array.isArray(options)
      ? options
      : {};

  const enabled = (value, fallback) =>
    typeof value === "boolean" ? value : fallback;

  const boundedInteger = (value, fallback, maximum) => {
    if (value === undefined || value === null) {
      return fallback;
    }

    if (!Number.isInteger(value) || value < 0) {
      throw new Error("Invalid subdomain discovery limit.");
    }

    return Math.min(value, maximum);
  };

  return {
    wordlist: enabled(source.wordlist, DEFAULT_OPTIONS.wordlist),
    certificateTransparency: enabled(
      source.certificateTransparency,
      DEFAULT_OPTIONS.certificateTransparency,
    ),
    publicSources: enabled(source.publicSources, DEFAULT_OPTIONS.publicSources),
    recursive: enabled(source.recursive, DEFAULT_OPTIONS.recursive),
    maxCandidates: boundedInteger(
      source.maxCandidates,
      DEFAULT_OPTIONS.maxCandidates,
      MAX_CANDIDATES,
    ),
    maxDepth: boundedInteger(source.maxDepth, DEFAULT_OPTIONS.maxDepth, 3),
  };
};

const normalizeLabels = (configured) => {
  const source =
    configured === undefined || configured === null
      ? COMMON_SUBDOMAINS
      : configured;

  if (!Array.isArray(source)) {
    throw new Error("Subdomain candidates must be an array.");
  }

  const labels = [];
  const seen = new Set();

  for (const raw of source) {
    if (typeof raw !== "string") {
      throw new Error("Subdomain candidate must be a string.");
    }

    const label = raw.trim().toLowerCase();

    if (
      !label ||
      label.length > 63 ||
      !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(label)
    ) {
      throw new Error("Invalid subdomain candidate label.");
    }

    if (!seen.has(label)) {
      seen.add(label);
      labels.push(label);
    }

    if (labels.length > MAX_CANDIDATES) {
      throw new Error(
        `Subdomain discovery supports at most ${MAX_CANDIDATES} labels.`,
      );
    }
  }

  return labels;
};

const normalizeAddresses = (addresses) => {
  const source = Array.isArray(addresses)
    ? addresses
    : addresses == null
      ? []
      : [addresses];

  const result = new Set();

  for (const entry of source) {
    const address = typeof entry === "string" ? entry : entry?.address;

    if (typeof address === "string" && isIP(address) !== 0) {
      result.add(address);
    }

    if (result.size >= MAX_ADDRESSES) {
      break;
    }
  }

  return [...result].sort();
};

const getErrorCode = (error) =>
  String(error?.code ?? error?.name ?? "UNKNOWN")
    .toUpperCase()
    .slice(0, 80);

const isExpectedDnsFailure = (error) =>
  [
    "ENOTFOUND",
    "ENODATA",
    "ENODOMAIN",
    "ENOTIMP",
    "ESERVFAIL",
    "ETIMEOUT",
    "EAI_AGAIN",
    "EREFUSED",
    "ECONNREFUSED",
    "SSRF_TARGET_BLOCKED",
  ].includes(getErrorCode(error));

const resolveCandidate = async (hostname) => {
  const resolution = await resolveAndValidateHostname(hostname);

  return normalizeAddresses(resolution?.addresses);
};

const sameAddresses = (left, right) =>
  left.length === right.length &&
  left.every((address, index) => address === right[index]);

const makeResult = ({
  hostname,
  discovered,
  candidatesTested,
  candidatesAvailable,
  sourceCounts,
  wildcardDetected,
  wildcardCheckStatus,
  wildcardMatches,
  failures,
  sourceStatuses,
  cancelled,
  maxDepth,
}) => {
  const evidence = discovered.map((item) => ({
    type: "dns",
    hostname: item.hostname,
    recordType: "A/AAAA",
    value: item.addresses,
    summary: `DNS addresses observed for ${item.hostname}.`,
    source: item.sources,
  }));

  const fingerprints = discovered.map((item) =>
    createFingerprint({
      type: "dns",
      name: item.hostname,
      version: null,
      confidence: item.wildcardSuspected ? "medium" : "high",
      source: "subdomains",
      evidence: {
        hostname: item.hostname,
        addresses: item.addresses,
        discoverySources: item.sources,
        dnsOnly: true,
      },
    }),
  );

  return {
    data: {
      hostname,
      baseDomain: hostname,
      discovered,
      totalDiscovered: discovered.length,
      sourceCounts,
    },

    evidence,
    fingerprints,
    verificationRecords: [],

    metadata: {
      candidatesTested,
      candidatesAvailable,
      wildcardDetected,
      wildcardCheckStatus,
      wildcardMatches,
      failures,
      sourceStatuses,
      cancelled,
      maxDepth,
      scopeExpanded: false,
      detectionMethod: "multi-source-subdomain-discovery",
      discoveryRoot: hostname,
    },
  };
};

const scanner = createReconScanner({
  id: "recon.subdomains",

  name: "Subdomain Discovery",

  description:
    "Discovers subdomain candidates using bounded wordlists, Certificate Transparency, supported public sources, and optional recursive discovery. Discovery never expands active scan scope.",

  async run(context) {
    const rawHostname = getTargetHostname(context);

    if (isIP(rawHostname) !== 0) {
      return {
        data: {
          hostname: rawHostname,
          subdomains: [],
          totalDiscovered: 0,
        },
        evidence: [],
        fingerprints: [],
        metadata: {
          isIpAddress: true,
          discoveryStatus: "skipped_ip_target",
          subdomainCount: 0,
          cancelled: false,
        },
      };
    }

    let hostname;
    try {
      hostname = normalizeHostname(rawHostname);
    } catch (err) {
      return {
        data: {
          hostname: rawHostname,
          subdomains: [],
          totalDiscovered: 0,
        },
        evidence: [],
        fingerprints: [],
        metadata: {
          discoveryStatus: "invalid_hostname",
          error: err.message,
          cancelled: false,
        },
      };
    }

    const rawOptions = context?.options?.subdomains ?? {};
    const options = normalizeOptions(rawOptions);

    const configuredLabels = rawOptions.labels ?? rawOptions.candidates;

    const labels = normalizeLabels(configuredLabels);

    const discoveredByHostname = new Map();
    const failures = {};
    const sourceStatuses = {};
    const sourceCounts = {};

    let candidatesTested = 0;
    let wildcardDetected = false;
    let wildcardCheckStatus = "not_run";
    let wildcardMatches = 0;
    let wildcardAddresses = [];
    let candidatesAvailable = 0;

    const addFailure = (error) => {
      const code = getErrorCode(error);
      failures[code] = (failures[code] ?? 0) + 1;
    };

    const recordCandidates = (items, source) => {
      if (!Array.isArray(items)) {
        return;
      }

      for (const item of items) {
        const candidate = typeof item === "string" ? item : item?.hostname;

        if (typeof candidate !== "string") {
          continue;
        }

        let normalized;

        try {
          normalized = normalizeHostname(candidate);
        } catch {
          continue;
        }

        if (normalized === hostname || !normalized.endsWith(`.${hostname}`)) {
          continue;
        }

        const existing = discoveredByHostname.get(normalized) ?? {
          hostname: normalized,
          addresses: [],
          sources: [],
          wildcardSuspected: false,
        };

        if (!existing.sources.includes(source)) {
          existing.sources.push(source);
        }

        discoveredByHostname.set(normalized, existing);
      }
    };

    const validateCandidates = async (sourceName) => {
      const candidates = [...discoveredByHostname.values()].filter(
        (item) => item.addresses.length === 0,
      );

      const remainingSlots = Math.max(
        0,
        options.maxCandidates - candidatesTested,
      );
      const candidatesToTest = candidates.slice(0, remainingSlots);

      await runConcurrent(
        candidatesToTest,
        10,
        async (item) => {
          if (context?.signal?.aborted) {
            return;
          }

          candidatesTested += 1;

          try {
            const addresses = await resolveCandidate(item.hostname);

            if (context?.signal?.aborted || addresses.length === 0) {
              return;
            }

            const matchesWildcard =
              wildcardDetected && sameAddresses(addresses, wildcardAddresses);

            if (matchesWildcard) {
              wildcardMatches += 1;
              item.wildcardSuspected = true;
              return;
            }

            item.addresses = addresses;
          } catch (error) {
            if (context?.signal?.aborted) {
              return;
            }

            addFailure(error);
          }
        },
        context?.signal,
      );

      sourceStatuses[sourceName] ??= "completed";
    };

    if (context?.signal?.aborted) {
      return makeResult({
        hostname,
        discovered: [],
        candidatesTested,
        candidatesAvailable,
        sourceCounts,
        wildcardDetected,
        wildcardCheckStatus: "cancelled",
        wildcardMatches,
        failures,
        sourceStatuses,
        cancelled: true,
        maxDepth: options.maxDepth,
      });
    }

    // Wildcard check uses a random name and does not authorize scanning.
    const randomLabel = `scan-check-${randomBytes(10).toString("hex")}`;
    const wildcardHostname = `${randomLabel}.${hostname}`;

    try {
      if (wildcardHostname.length <= MAX_HOSTNAME_LENGTH) {
        wildcardAddresses = await resolveCandidate(wildcardHostname);
        wildcardDetected = wildcardAddresses.length > 0;
        wildcardCheckStatus = wildcardDetected ? "detected" : "not_detected";
      } else {
        wildcardCheckStatus = "skipped_hostname_length";
      }
    } catch (error) {
      if (context?.signal?.aborted) {
        wildcardCheckStatus = "cancelled";
      } else if (isExpectedDnsFailure(error)) {
        wildcardCheckStatus = "not_detected";
      } else {
        wildcardCheckStatus = "not_detected";
        addFailure(error);
      }
    }

    const runSource = async (name, enabled, operation) => {
      if (!enabled || context?.signal?.aborted) {
        sourceStatuses[name] = enabled ? "cancelled" : "disabled";
        return;
      }

      try {
        const result = await operation();

        if (context?.signal?.aborted) {
          sourceStatuses[name] = "cancelled";
          return;
        }

        const candidates = Array.isArray(result)
          ? result
          : (result?.candidates ?? []);

        recordCandidates(candidates, name);
        sourceCounts[name] = candidates.length;
        sourceStatuses[name] = "completed";
      } catch (error) {
        if (context?.signal?.aborted) {
          sourceStatuses[name] = "cancelled";
          return;
        }

        // An unavailable external source should not discard results
        // from other independent discovery methods.
        sourceStatuses[name] = "failed";
        addFailure(error);
      }
    };

    await runSource("wordlist", options.wordlist, () =>
      discoverWordlist({
        hostname,
        labels,
        signal: context?.signal,
        maxCandidates: options.maxCandidates,
      }),
    );

    await runSource(
      "certificate-transparency",
      options.certificateTransparency,
      () =>
        discoverCertificateTransparency({
          hostname,
          signal: context?.signal,
          maxCandidates: options.maxCandidates,
        }),
    );

    await runSource("public-sources", options.publicSources, () =>
      discoverPublicSources({
        hostname,
        signal: context?.signal,
        maxCandidates: options.maxCandidates,
      }),
    );

    candidatesAvailable = discoveredByHostname.size;

    // Validate candidates before recursive discovery.
    await validateCandidates("dns-validation");

    if (options.recursive && !context?.signal?.aborted) {
      try {
        const recursiveCandidates = await discoverRecursively({
          hostname,
          discovered: [...discoveredByHostname.values()].filter(
            (item) => item.addresses.length > 0,
          ),
          signal: context?.signal,
          maxCandidates: options.maxCandidates,
          maxDepth: options.maxDepth,
        });

        recordCandidates(recursiveCandidates, "recursive");
        sourceCounts.recursive = recursiveCandidates.length;
        sourceStatuses.recursive = "completed";

        await validateCandidates("recursive-validation");
      } catch (error) {
        if (context?.signal?.aborted) {
          sourceStatuses.recursive = "cancelled";
        } else {
          sourceStatuses.recursive = "failed";
          addFailure(error);
        }
      }
    } else {
      sourceStatuses.recursive = options.recursive ? "cancelled" : "disabled";
    }

    const discovered = [...discoveredByHostname.values()]
      .filter((item) => item.addresses.length > 0)
      .map((item) => ({
        hostname: item.hostname,
        addresses: item.addresses,
        sources: item.sources,
        wildcardSuspected: item.wildcardSuspected,
      }))
      .sort((left, right) => left.hostname.localeCompare(right.hostname));

    return makeResult({
      hostname,
      discovered,
      candidatesTested,
      candidatesAvailable,
      sourceCounts,
      wildcardDetected,
      wildcardCheckStatus,
      wildcardMatches,
      failures,
      sourceStatuses,
      cancelled: context?.signal?.aborted === true,
      maxDepth: options.maxDepth,
    });
  },
});

export default scanner;
