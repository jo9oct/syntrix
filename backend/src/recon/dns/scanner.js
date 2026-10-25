/* STATUS: UPDATED */

import net from "node:net";

import {
  createReconScanner,
  getTargetHostname,
} from "../shared/reconContract.js";

import { resolveDnsRecords } from "../shared/resolver.js";
import { createFingerprint } from "../shared/fingerprint.js";

const RECORD_TYPES = Object.freeze(["A", "AAAA", "CNAME", "MX", "NS", "TXT"]);

const MAX_RECORDS_PER_TYPE = 100;
const MAX_VALUE_LENGTH = 2048;
const MAX_HOSTNAME_LENGTH = 253;

const isCancelled = (context) => context?.signal?.aborted === true;

const normalizeHostname = (value) => {
  if (typeof value !== "string") {
    throw new Error("DNS scanner requires a hostname.");
  }

  const hostname = value.trim().toLowerCase().replace(/\.$/, "");

  if (
    !hostname ||
    hostname.length > MAX_HOSTNAME_LENGTH ||
    hostname.includes("://") ||
    hostname.includes("/") ||
    hostname.includes("@") ||
    hostname.includes(":")
  ) {
    throw new Error("Invalid DNS target hostname.");
  }

  // If IP address, return normalized IP
  if (net.isIP(hostname) !== 0) {
    return hostname;
  }

  const labels = hostname.split(".");

  if (
    labels.some(
      (label) =>
        !label ||
        label.length > 63 ||
        !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(label),
    )
  ) {
    throw new Error("Invalid DNS hostname labels.");
  }

  return hostname;
};

const normalizeRecordValues = (values) => {
  if (values === undefined || values === null) {
    return [];
  }

  return Array.isArray(values) ? values : [values];
};

const normalizeRecord = (value, recordType) => {
  if (value === null || value === undefined) {
    return null;
  }

  // TXT records may contain verification tokens or sensitive data; do not persist contents.
  if (recordType === "TXT") {
    return {
      value: "[REDACTED]",
      redacted: true,
    };
  }

  if (typeof value === "string") {
    const normalized = value.trim();

    return normalized
      ? {
          value: normalized.slice(0, MAX_VALUE_LENGTH),
          redacted: false,
        }
      : null;
  }

  if (typeof value === "object") {
    const safeObject = {};

    for (const [key, propertyValue] of Object.entries(value)) {
      if (propertyValue === null || propertyValue === undefined) {
        continue;
      }

      if (
        typeof propertyValue === "string" ||
        typeof propertyValue === "number" ||
        typeof propertyValue === "boolean"
      ) {
        safeObject[key] = String(propertyValue).slice(0, MAX_VALUE_LENGTH);
      }
    }

    return Object.keys(safeObject).length > 0
      ? {
          value: safeObject,
          redacted: false,
        }
      : null;
  }

  return null;
};

const emptyRecords = () =>
  Object.fromEntries(RECORD_TYPES.map((type) => [type, []]));

const cancelledResult = (hostname) => ({
  data: {
    hostname,
    records: emptyRecords(),
  },
  evidence: [],
  fingerprints: [],
  verificationRecords: [],
  metadata: {
    cancelled: true,
    recordTypes: RECORD_TYPES,
    resolutionStatus: "cancelled",
  },
});

const normalizeRecords = (rawRecords) => {
  const records = emptyRecords();
  const counts = {};
  const truncatedTypes = [];

  for (const recordType of RECORD_TYPES) {
    const rawValues = normalizeRecordValues(rawRecords?.[recordType]);

    counts[recordType] = rawValues.length;

    if (rawValues.length > MAX_RECORDS_PER_TYPE) {
      truncatedTypes.push(recordType);
    }

    const normalizedValues = rawValues
      .slice(0, MAX_RECORDS_PER_TYPE)
      .map((entry) => normalizeRecord(entry, recordType))
      .filter((entry) => entry !== null);

    records[recordType] = normalizedValues.map((entry) => entry.value);
  }

  return {
    records,
    counts,
    truncatedTypes,
  };
};

const scanner = createReconScanner({
  id: "recon.dns",

  name: "DNS Reconnaissance",

  description:
    "Collects and normalizes common DNS records for the authorized target hostname without expanding active scan scope.",

  async run(context) {
    let hostname;
    try {
      hostname = normalizeHostname(getTargetHostname(context));
    } catch (err) {
      return {
        data: {
          hostname: String(context?.target?.url ?? ""),
          records: emptyRecords(),
        },
        evidence: [],
        fingerprints: [],
        verificationRecords: [],
        metadata: {
          cancelled: false,
          resolutionStatus: "invalid_hostname",
          error: err.message,
        },
      };
    }

    if (isCancelled(context)) {
      return cancelledResult(hostname);
    }

    // IP addresses don't have standard forward DNS records
    if (net.isIP(hostname) !== 0) {
      return {
        data: {
          hostname,
          records: {
            ...emptyRecords(),
            A: [hostname],
          },
        },
        evidence: [
          {
            type: "dns",
            hostname,
            recordType: "A",
            value: hostname,
          },
        ],
        fingerprints: [],
        verificationRecords: [],
        metadata: {
          isIpAddress: true,
          resolutionStatus: "ip_target",
          cancelled: false,
        },
      };
    }

    let rawRecords;

    try {
      rawRecords = await resolveDnsRecords(hostname);
    } catch (error) {
      if (isCancelled(context)) {
        return cancelledResult(hostname);
      }

      const code = String(error?.code ?? "DNS_RESOLUTION_FAILED").toUpperCase();

      return {
        data: {
          hostname,
          records: emptyRecords(),
        },
        evidence: [],
        fingerprints: [],
        verificationRecords: [],
        metadata: {
          cancelled: false,
          recordTypes: RECORD_TYPES,
          resolutionStatus: "failed",
          errorCode: code,
          errorMessage: error?.message ?? "DNS resolution failed",
        },
      };
    }

    if (isCancelled(context)) {
      return cancelledResult(hostname);
    }

    const { records, counts, truncatedTypes } = normalizeRecords(rawRecords);

    const evidence = [];
    const fingerprints = [];

    for (const recordType of RECORD_TYPES) {
      const values = records[recordType];

      if (recordType === "TXT") {
        if (counts.TXT > 0) {
          evidence.push({
            type: "dns",
            hostname,
            recordType,
            value: "[REDACTED]",
            count: counts.TXT,
          });
        }
        continue;
      }

      for (const value of values) {
        evidence.push({
          type: "dns",
          hostname,
          recordType,
          value,
        });

        fingerprints.push(
          createFingerprint({
            type: "dns",
            name: `${hostname}:${recordType}`,
            version: null,
            confidence: "high",
            source: "dns",
            evidence: {
              recordType,
              value,
            },
          }),
        );
      }
    }

    return {
      data: {
        hostname,
        records,
      },

      evidence,
      fingerprints,
      verificationRecords: [],

      metadata: {
        recordTypes: RECORD_TYPES,
        recordCounts: counts,
        truncatedTypes,
        resolutionStatus: "completed",
        cancelled: false,
        txtValuesRedacted: true,
        scopeExpanded: false,
      },
    };
  },
});

export default scanner;
export { scanner, normalizeHostname };
