
/* STATUS: UPDATED */

import {
  createReconScanner,
  getTargetHostname,
} from "../shared/reconContract.js";

import { resolveDnsRecords } from "../shared/resolver.js";
import { createFingerprint } from "../shared/fingerprint.js";

const RECORD_TYPES = Object.freeze([
  "A",
  "AAAA",
  "CNAME",
  "MX",
  "NS",
  "TXT",
]);

const MAX_RECORDS_PER_TYPE = 100;
const MAX_VALUE_LENGTH = 2048;
const MAX_HOSTNAME_LENGTH = 253;

const DNS_ERROR_CODES = new Set([
  "ENOTFOUND",
  "ENODATA",
  "ENODOMAIN",
  "ENOTIMP",
  "ETIMEOUT",
  "ESERVFAIL",
  "EREFUSED",
  "ECONNREFUSED",
  "EAI_AGAIN",
]);

const isCancelled = (context) =>
  context?.signal?.aborted === true;

const normalizeHostname = (value) => {
  if (typeof value !== "string") {
    throw new Error("DNS scanner requires a hostname.");
  }

  const hostname = value
    .trim()
    .toLowerCase()
    .replace(/\.$/, "");

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

  // TXT records may contain verification tokens or
  // other sensitive data. Do not persist their contents.
  if (recordType === "TXT") {
    return {
      value: "[REDACTED]",
      redacted: true,
    };
  }

  if (typeof value === "string") {
    const normalized = value.trim();

    if (!normalized) {
      return null;
    }

    return {
      value: normalized.slice(0, MAX_VALUE_LENGTH),
      redacted: false,
    };
  }

  if (typeof value === "number") {
    return {
      value: String(value),
      redacted: false,
    };
  }

  if (Array.isArray(value)) {
    const parts = value
      .filter(
        (item) =>
          typeof item === "string" ||
          typeof item === "number",
      )
      .map(String);

    if (parts.length === 0) {
      return null;
    }

    return {
      value: parts.join(" ").slice(0, MAX_VALUE_LENGTH),
      redacted: false,
    };
  }

  if (typeof value === "object") {
    const safe = {};

    for (const key of [
      "exchange",
      "priority",
      "name",
      "value",
      "address",
    ]) {
      const field = value[key];

      if (
        typeof field === "string" ||
        typeof field === "number"
      ) {
        safe[key] =
          typeof field === "string"
            ? field.slice(0, MAX_VALUE_LENGTH)
            : field;
      }
    }

    if (Object.keys(safe).length === 0) {
      return null;
    }

    return {
      value: safe,
      redacted: false,
    };
  }

  return null;
};

const normalizeRecords = (rawRecords) => {
  const records = {};
  const counts = {};
  const truncatedTypes = [];

  for (const recordType of RECORD_TYPES) {
    const rawValues = normalizeRecordValues(
      rawRecords?.[recordType] ??
        rawRecords?.[recordType.toLowerCase()],
    );

    const seen = new Set();
    const normalized = [];

    for (const rawValue of rawValues) {
      const record = normalizeRecord(
        rawValue,
        recordType,
      );

      if (!record) {
        continue;
      }

      const key = JSON.stringify(record.value);

      if (seen.has(key)) {
        continue;
      }

      seen.add(key);

      if (normalized.length >= MAX_RECORDS_PER_TYPE) {
        if (!truncatedTypes.includes(recordType)) {
          truncatedTypes.push(recordType);
        }

        continue;
      }

      normalized.push(record.value);
    }

    records[recordType] = normalized;

    counts[recordType] =
      recordType === "TXT"
        ? rawValues.length
        : normalized.length;
  }

  return {
    records,
    counts,
    truncatedTypes,
  };
};

const emptyRecords = () =>
  Object.fromEntries(
    RECORD_TYPES.map((type) => [type, []]),
  );

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
  },
});

const scanner = createReconScanner({
  id: "recon.dns",

  name: "DNS Reconnaissance",

  description:
    "Collects and normalizes common DNS records for the authorized target hostname without expanding active scan scope.",

  async run(context) {
    const hostname = normalizeHostname(
      getTargetHostname(context),
    );

    if (isCancelled(context)) {
      return cancelledResult(hostname);
    }

    let rawRecords;

    try {
      rawRecords = await resolveDnsRecords(hostname);
    } catch (error) {
      if (isCancelled(context)) {
        return cancelledResult(hostname);
      }

      const code = String(
        error?.code ?? "DNS_RESOLUTION_FAILED",
      ).toUpperCase();

      if (!DNS_ERROR_CODES.has(code)) {
        throw error;
      }

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
        },
      };
    }

    if (isCancelled(context)) {
      return cancelledResult(hostname);
    }

    const {
      records,
      counts,
      truncatedTypes,
    } = normalizeRecords(rawRecords);

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
