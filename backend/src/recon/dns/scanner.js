import {
  createReconScanner,
  getTargetHostname,
} from "../shared/reconContract.js";

import { resolveDnsRecords } from "../shared/resolver.js";

import { createFingerprint } from "../shared/fingerprint.js";

const RECORD_TYPES = Object.freeze(["A", "AAAA", "CNAME", "MX", "NS", "TXT"]);

const normalizeRecordValues = (values) => {
  if (values === undefined || values === null) {
    return [];
  }

  return Array.isArray(values) ? values : [values];
};

const scanner = createReconScanner({
  id: "recon.dns",

  name: "DNS Reconnaissance",

  description:
    "Collects common DNS records for the authorized target hostname.",

  async run(context) {
    const hostname = getTargetHostname(context);

    if (context?.signal?.aborted) {
      return {
        data: {
          hostname,
          records: null,
        },

        evidence: [],

        fingerprints: [],

        verificationRecords: [],

        metadata: {
          cancelled: true,

          recordTypes: RECORD_TYPES,
        },
      };
    }

    const records = await resolveDnsRecords(hostname);

    if (context?.signal?.aborted) {
      return {
        data: {
          hostname,
          records,
        },

        evidence: [],

        fingerprints: [],

        verificationRecords: [],

        metadata: {
          cancelled: true,

          recordTypes: RECORD_TYPES,
        },
      };
    }

    const evidence = [];
    const fingerprints = [];

    for (const recordType of RECORD_TYPES) {
      const values = normalizeRecordValues(records?.[recordType]);

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
      },
    };
  },
});

export default scanner;
