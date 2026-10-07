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
  getParameters,
  setParameter,
} from '../shared/parameterTester.js';

import {
  getPayloads,
} from '../shared/payloadManager.js';

import {
  assertSafeUrl,
} from '../../recon/shared/resolver.js';

const MAX_PARAMETERS = 5;
const MAX_PAYLOADS_PER_PARAMETER = 2;

const SQL_ERROR_PATTERNS = [
  /sql syntax/i,
  /mysql/i,
  /postgresql/i,
  /sqlite/i,
  /ora-\d+/i,
  /microsoft sql server/i,
  /odbc sql/i,
  /database error/i,
];

const containsSqlError = (
  body,
) =>
  typeof body === 'string' &&
  SQL_ERROR_PATTERNS.some(
    (pattern) =>
      pattern.test(body),
  );

const scanner =
  createSecurityScanner({
    id:
      'security.sqli',

    name:
      'SQL Injection Detection',

    description:
      'Performs a conservative SQL error-surface assessment using controlled parameter input.',

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
            testedParameters: [],
            errorSignatureDetected:
              false,
          },

          findings: [],

          evidence: [],

          fingerprints: [],

          verificationRecords: [],

          metadata: {
            cancelled: true,
            parametersTested: 0,
            requestsTested: 0,
          },
        };
      }

      const parameters =
        getParameters(
          targetUrl,
        );

      const selectedParameters =
        parameters.slice(
          0,
          MAX_PARAMETERS,
        );

      const payloads =
        getPayloads(
          'sqli',
        );

      const selectedPayloads =
        payloads.slice(
          0,
          MAX_PAYLOADS_PER_PARAMETER,
        );

      const findings = [];
      const evidence = [];

      let requestsTested = 0;

      const requestHeaders =
        context?.session
          ?.getHeaders?.() ?? {};

      for (
        const parameter of
          selectedParameters
      ) {
        if (
          context?.signal
            ?.aborted
        ) {
          break;
        }

        for (
          const payload of
            selectedPayloads
        ) {
          if (
            context?.signal
              ?.aborted
          ) {
            break;
          }

          const testUrl =
            setParameter(
              targetUrl,
              parameter,
              payload,
            );

          await assertSafeUrl(
            testUrl,
          );

          const response =
            await get(
              testUrl,
              {
                signal:
                  context?.signal,

                headers:
                  requestHeaders,
              },
            );

          requestsTested += 1;

          if (
            containsSqlError(
              response.data,
            )
          ) {
            findings.push(
              normalizeFinding({
                scannerId:
                  'security.sqli',

                title:
                  'Potential SQL Error Disclosure',

                description:
                  `A database-related error signature was observed after controlled input was supplied to "${parameter}". This indicates a potential SQL error disclosure condition, but does not by itself confirm exploitable SQL injection.`,

                severity:
                  'high',

                confidence:
                  calculateConfidence({
                    confirmed:
                      false,
                  }),

                remediation:
                  'Use parameterized database queries, validate input, and avoid exposing database errors or database implementation details to clients.',

                category:
                  'sqli',

                metadata: {
                  parameter,

                  payloadType:
                    'controlled-sqli',

                  detection:
                    'database-error-signature',
                },
              }),
            );

            evidence.push(
              createSecurityEvidence({
                request: {
                  method:
                    'GET',

                  url:
                    testUrl,

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

                  body:
                    response.data,
                },
              }),
            );

            break;
          }
        }
      }

      const cancelled =
        context?.signal
          ?.aborted === true;

      return {
        data: {
          testedParameters:
            selectedParameters,

          errorSignatureDetected:
            findings.length > 0,
        },

        findings,

        evidence,

        fingerprints: [],

        verificationRecords: [],

        metadata: {
          cancelled,

          parametersTested:
            selectedParameters.length,

          requestsTested,

          payloadsPerParameter:
            selectedPayloads.length,
        },
      };
    },
  });

export default scanner;