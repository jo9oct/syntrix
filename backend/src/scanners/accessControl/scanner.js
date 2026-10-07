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

const SENSITIVE_PATHS = [
  '/admin',
  '/administrator',
  '/manage',
  '/dashboard',
  '/internal',
];

const scanner = createSecurityScanner({
  id: 'security.access-control',
  name: 'Access Control',
  description:
    'Performs a bounded unauthenticated access-control surface assessment.',

  async run(context) {
    const targetUrl = getTargetUrl(context);

    const base = new URL(targetUrl);

    const findings = [];
    const evidence = [];
    const results = [];

    for (const pathname of SENSITIVE_PATHS) {
      if (context?.signal?.aborted) {
        break;
      }

      const candidate = new URL(
        pathname,
        base.origin,
      ).toString();

      await assertSafeUrl(candidate);

      const response = await get(candidate, {
        signal: context?.signal,
        headers:
          context?.session?.getHeaders?.() ?? {},
        maxRedirects: 0,
        validateStatus: () => true,
      });

      results.push({
        path: pathname,
        status: response.status,
      });

      if (
        response.status >= 200 &&
        response.status < 300
      ) {
        findings.push(
          normalizeFinding({
            scannerId:
              'security.access-control',
            title:
              'Potentially Exposed Sensitive Endpoint',
            description:
              `A potentially administrative endpoint "${pathname}" returned a successful response to the assessment request.`,
            severity: 'high',
            confidence:
              calculateConfidence({
                confirmed: true,
              }),
            remediation:
              'Enforce authorization checks on administrative and sensitive endpoints.',
            category: 'access-control',
            metadata: {
              path: pathname,
              status: response.status,
            },
          }),
        );
      }

      evidence.push(
        createSecurityEvidence({
          request: {
            method: 'GET',
            url: candidate,
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

    return {
      data: {
        testedPaths: results,
      },
      findings,
      evidence,
    };
  },
});

export default scanner;