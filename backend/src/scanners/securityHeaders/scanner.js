// STATUS: UPDATED

import {
  get,
} from '../../request/request.js';

import {
  createSecurityEvidence,
} from '../shared/evidenceBuilder.js';

import {
  calculateConfidence,
} from '../shared/confidence.js';

import {
  normalizeFinding,
} from '../shared/findingNormalizer.js';

import {
  createSecurityScanner,
  getTargetUrl,
} from '../shared/scannerContract.js';

import {
  assertSafeUrl,
} from '../../recon/shared/resolver.js';

const REQUIRED_HEADERS = [
  {
    name:
      'strict-transport-security',

    title:
      'Missing Strict-Transport-Security Header',

    severity:
      'medium',

    remediation:
      'Configure Strict-Transport-Security for HTTPS deployments.',
  },

  {
    name:
      'content-security-policy',

    title:
      'Missing Content-Security-Policy Header',

    severity:
      'medium',

    remediation:
      'Define an appropriate Content-Security-Policy.',
  },

  {
    name:
      'x-content-type-options',

    title:
      'Missing X-Content-Type-Options Header',

    severity:
      'low',

    remediation:
      'Set X-Content-Type-Options to nosniff.',
  },

  {
    name:
      'referrer-policy',

    title:
      'Missing Referrer-Policy Header',

    severity:
      'low',

    remediation:
      'Configure an appropriate Referrer-Policy.',
  },
];

const normalizeHeaders = (
  headers,
) =>
  Object.fromEntries(
    Object.entries(
      headers ?? {},
    ).map(
      ([key, value]) => [
        key.toLowerCase(),
        value,
      ],
    ),
  );

const scanner =
  createSecurityScanner({
    id:
      'security.security-headers',

    name:
      'Security Headers',

    description:
      'Checks common HTTP security response headers.',

    async run(context) {
      const targetUrl =
        getTargetUrl(
          context,
        );

      await assertSafeUrl(
        targetUrl,
      );

      if (
        context?.signal
          ?.aborted
      ) {
        return {
          data: {
            headers: {},
            present: [],
            missing: [],
          },

          findings: [],

          evidence: [],

          fingerprints: [],

          verificationRecords: [],

          metadata: {
            cancelled: true,
          },
        };
      }

      const requestHeaders =
        context?.session
          ?.getHeaders?.() ?? {};

      const response =
        await get(
          targetUrl,
          {
            signal:
              context?.signal,

            headers:
              requestHeaders,
          },
        );

      if (
        context?.signal
          ?.aborted
      ) {
        return {
          data: {
            headers:
              normalizeHeaders(
                response.headers,
              ),

            present: [],

            missing: [],
          },

          findings: [],

          evidence: [],

          fingerprints: [],

          verificationRecords: [],

          metadata: {
            cancelled: true,
          },
        };
      }

      const headers =
        normalizeHeaders(
          response.headers,
        );

      const present =
        REQUIRED_HEADERS
          .filter(
            (item) =>
              headers[
                item.name
              ],
          )
          .map(
            (item) =>
              item.name,
          );

      const missing =
        REQUIRED_HEADERS
          .filter(
            (item) =>
              !headers[
                item.name
              ],
          )
          .map(
            (item) =>
              item.name,
          );

      const findings = [];

      const evidence = [];

      for (
        const required of
          REQUIRED_HEADERS
      ) {
        if (
          headers[
            required.name
          ]
        ) {
          continue;
        }

        const title =
          required.title;

        const description =
          `The response does not expose the ${required.name} security header.`;

        const findingKey =
          `security.security-headers:${title}`;

        findings.push(
          normalizeFinding({
            scannerId:
              'security.security-headers',

            title,

            description,

            severity:
              required.severity,

            confidence:
              calculateConfidence({
                confirmed:
                  true,
              }),

            remediation:
              required.remediation,

            category:
              'security-headers',

            metadata: {
              header:
                required.name,

              responseStatus:
                response.status,
            },
          }),
        );

        evidence.push(
          createSecurityEvidence({
            request: {
              method:
                'GET',

              url:
                targetUrl,

              headers:
                requestHeaders,
            },

            response: {
              status:
                response.status,

              statusText:
                response.statusText,

              headers:
                response.headers,

              contentType:
                response
                  .headers
                  ?.['content-type'],
            },

            description,

            metadata: {
              header:
                required.name,

              responseStatus:
                response.status,
            },

            findingKey,

            type:
              'http_exchange',
          }),
        );
      }

      return {
        data: {
          headers,

          present,

          missing,

          status:
            response.status,
        },

        findings,

        evidence,

        fingerprints: [],

        verificationRecords: [],

        metadata: {
          requiredHeaderCount:
            REQUIRED_HEADERS.length,

          presentHeaderCount:
            present.length,

          missingHeaderCount:
            missing.length,

          cancelled: false,
        },
      };
    },
  });

export default scanner;