import {
  createReconScanner,
  getTargetHostname,
} from '../shared/reconContract.js';

import {
  resolveAndValidateHostname,
} from '../shared/resolver.js';

import {
  createFingerprint,
} from '../shared/fingerprint.js';

const COMMON_SUBDOMAINS = Object.freeze([
  'www',
  'api',
  'app',
  'admin',
  'portal',
  'dev',
  'test',
  'staging',
  'qa',
  'uat',
  'mail',
  'smtp',
  'ftp',
  'cdn',
  'static',
  'assets',
  'blog',
  'docs',
  'support',
  'status',
]);

const scanner = createReconScanner({
  id: 'recon.subdomains',

  name: 'Subdomain Discovery',

  description:
    'Performs bounded discovery of common subdomains under the target domain.',

  async run(context) {
    const hostname =
      getTargetHostname(context);

    const labels =
      hostname.split('.');

    if (labels.length < 2) {
      return {
        data: {
          hostname,
          discovered: [],
        },

        evidence: [],

        fingerprints: [],

        verificationRecords: [],

        metadata: {
          candidatesTested: 0,
        },
      };
    }

    const baseDomain =
      labels
        .slice(-2)
        .join('.');

    const discovered = [];
    const evidence = [];
    const fingerprints = [];

    let candidatesTested = 0;

    for (
      const label of COMMON_SUBDOMAINS
    ) {
      if (
        context?.signal?.aborted
      ) {
        break;
      }

      const candidate =
        `${label}.${baseDomain}`;

      candidatesTested += 1;

      try {
        const resolution =
          await resolveAndValidateHostname(
            candidate,
          );

        if (
          context?.signal?.aborted
        ) {
          break;
        }

        const discovery = {
          hostname: candidate,
          addresses:
            resolution.addresses,
        };

        discovered.push(
          discovery,
        );

        evidence.push({
          type: 'dns',

          hostname: candidate,

          recordType: 'A/AAAA',

          value:
            resolution.addresses,

          summary:
            `Discovered subdomain ${candidate}.`,
        });

        fingerprints.push(
          createFingerprint({
            type: 'dns',

            name: candidate,

            version: null,

            confidence: 'high',

            source: 'subdomains',

            evidence: {
              hostname: candidate,

              addresses:
                resolution.addresses,
            },
          }),
        );
      } catch {
        // Non-resolving or blocked candidates
        // are intentionally omitted.
      }
    }

    return {
      data: {
        hostname,
        baseDomain,
        discovered,
      },

      evidence,

      fingerprints,

      verificationRecords: [],

      metadata: {
        candidatesTested,
        candidatesAvailable:
          COMMON_SUBDOMAINS.length,
      },
    };
  },
});

export default scanner;