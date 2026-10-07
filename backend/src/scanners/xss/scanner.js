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
  findReflection,
} from '../shared/reflectionDetector.js';

import {
  createSecurityScanner,
  getTargetUrl,
} from '../shared/scannerContract.js';

import {
  getParameters,
  setParameter,
} from '../shared/parameterTester.js';

import {
  getSafeMarker,
} from '../shared/payloadManager.js';

import {
  assertSafeUrl,
} from '../../recon/shared/resolver.js';

const MAX_PARAMETERS = 5;

const scanner =
  createSecurityScanner({
    id:
      'security.xss',

    name:
      'Cross-Site Scripting',

    description:
      'Performs a bounded reflected-input marker test.',

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
            reflectionDetected: false,
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

      if (
        selectedParameters.length ===
        0
      ) {
        return {
          data: {
            testedParameters: [],
            reflectionDetected: false,
          },

          findings: [],

          evidence: [],

          fingerprints: [],

          verificationRecords: [],

          metadata: {
            cancelled: false,
            parametersTested: 0,
            requestsTested: 0,
          },
        };
      }

      const marker =
        getSafeMarker();

      const findings = [];
      const evidence = [];
      const testedParameters = [];

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

        const testUrl =
          setParameter(
            targetUrl,
            parameter,
            marker,
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
          context?.signal
            ?.aborted
        ) {
          break;
        }

        const reflection =
          findReflection(
            response.data,
            marker,
          );

        testedParameters.push(
          parameter,
        );

        if (!reflection) {
          continue;
        }

        findings.push(
          normalizeFinding({
            scannerId:
              'security.xss',

            title:
              'Potential Reflected Input Injection',

            description:
              `The controlled marker was reflected in the response for parameter "${parameter}". Reflection alone does not confirm executable cross-site scripting.`,

            severity:
              'medium',

            confidence:
              calculateConfidence({
                confirmed:
                  false,
              }),

            remediation:
              'Apply context-aware output encoding, validate untrusted input, and ensure reflected data cannot be interpreted as executable HTML or JavaScript.',

            category:
              'xss',

            metadata: {
              parameter,

              reflectionContext:
                reflection.context,

              detection:
                'reflected-marker',
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

              contentType:
                response
                  .headers
                  ?.['content-type'],
            },

            metadata: {
              parameter,
              marker,
              reflectionContext:
                reflection.context,
            },
          }),
        );
      }

      const cancelled =
        context?.signal
          ?.aborted === true;

      return {
        data: {
          testedParameters,

          reflectionDetected:
            findings.length > 0,
        },

        findings,

        evidence,

        fingerprints: [],

        verificationRecords: [],

        metadata: {
          cancelled,

          parametersTested:
            testedParameters.length,

          requestsTested,
        },
      };
    },
  });

export default scanner;