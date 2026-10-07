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

const JWT_PATTERN =
  /\beyJ[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{5,}\b/g;

const scanner =
  createSecurityScanner({
    id:
      'security.jwt',

    name:
      'JWT Security',

    description:
      'Detects exposed JWT-like tokens and reports structural exposure.',

    async run(
      context,
    ) {
      const targetUrl =
        getTargetUrl(
          context,
        );

      await assertSafeUrl(
        targetUrl,
      );

      const response =
        await get(
          targetUrl,
          {
            signal:
              context?.signal,

            headers:
              context?.session
                ?.getHeaders?.() ??
              {},
          },
        );

      const body =
        typeof response.data ===
        'string'
          ? response.data
          : '';

      const headerText =
        Object.entries(
          response.headers ??
            {},
        )
          .map(
            (
              [key, value],
            ) =>
              `${key}: ${value}`,
          )
          .join(
            '\n',
          );

      const matches = [
        ...(body.match(
          JWT_PATTERN,
        ) ?? []),

        ...(headerText.match(
          JWT_PATTERN,
        ) ?? []),
      ];

      const uniqueMatches = [
        ...new Set(
          matches,
        ),
      ];

      const findings = [];

      if (
        uniqueMatches.length >
        0
      ) {
        findings.push(
          normalizeFinding({
            scannerId:
              'security.jwt',

            title:
              'JWT Token Exposure Detected',

            description:
              'A JWT-like token was exposed in the target response.',

            severity:
              'medium',

            confidence:
              calculateConfidence({
                confirmed:
                  true,
              }),

            remediation:
              'Avoid exposing authentication tokens in publicly accessible response content and minimize token lifetime and scope.',

            category:
              'jwt',

            metadata: {
              tokenCount:
                uniqueMatches.length,
            },
          }),
        );
      }

      return {
        data: {
          jwtLikeTokenCount:
            uniqueMatches.length,
        },

        findings,

        evidence:
          uniqueMatches.length >
          0
            ? [
                createSecurityEvidence({
                  request: {
                    method:
                      'GET',

                    url:
                      targetUrl,

                    headers:
                      context?.session
                        ?.getHeaders?.() ??
                      {},
                  },

                  response: {
                    status:
                      response.status,

                    statusText:
                      response.statusText,

                    headers:
                      response.headers,
                  },

                  metadata: {
                    tokensRedacted:
                      true,
                  },
                }),
              ]
            : [],
      };
    },
  });

export default scanner;