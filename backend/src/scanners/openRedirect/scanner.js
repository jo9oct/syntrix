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

const scanner = createSecurityScanner({
  id: 'security.open-redirect',
  name: 'Open Redirect',
  description:
    'Checks whether URL parameters control redirects to an external test domain.',

  async run(context) {
    const targetUrl = getTargetUrl(context);

    await assertSafeUrl(targetUrl);

    const parameters = getParameters(targetUrl);
    const payload =
      getPayloads('openRedirect')[0];

    const findings = [];
    const evidence = [];

    for (const parameter of parameters.slice(0, 5)) {
      if (context?.signal?.aborted) {
        break;
      }

      const testUrl = setParameter(
        targetUrl,
        parameter,
        payload,
      );

      await assertSafeUrl(testUrl);

      const response = await get(testUrl, {
        signal: context?.signal,
        headers:
          context?.session?.getHeaders?.() ?? {},
        maxRedirects: 0,
        validateStatus: () => true,
      });

      const location =
        response.headers?.location;

      if (
        typeof location === 'string' &&
        location.startsWith(payload)
      ) {
        findings.push(
          normalizeFinding({
            scannerId:
              'security.open-redirect',
            title: 'Potential Open Redirect',
            description:
              `The parameter "${parameter}" influenced a redirect toward a controlled external domain.`,
            severity: 'medium',
            confidence:
              calculateConfidence({
                confirmed: true,
              }),
            remediation:
              'Use allowlisted redirect destinations or server-side route identifiers.',
            category: 'open-redirect',
            metadata: {
              parameter,
              location,
            },
          }),
        );

        evidence.push(
          createSecurityEvidence({
            request: {
              method: 'GET',
              url: testUrl,
              headers:
                context?.session?.getHeaders?.() ?? {},
            },
            response: {
              status: response.status,
              statusText: response.statusText,
              headers: response.headers,
            },
          }),
        );
      }
    }

    return {
      data: {
        testedParameters: parameters.slice(0, 5),
        redirectDetected:
          findings.length > 0,
      },
      findings,
      evidence,
    };
  },
});

export default scanner;