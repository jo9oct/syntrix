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

const TEST_ORIGIN =
  'https://assessment.invalid';

const scanner = createSecurityScanner({
  id: 'security.cors',
  name: 'CORS Security',
  description:
    'Checks for unsafe cross-origin response configuration.',

  async run(context) {
    const targetUrl = getTargetUrl(context);

    await assertSafeUrl(targetUrl);

    const response = await get(targetUrl, {
      signal: context?.signal,
      headers: {
        ...(context?.session?.getHeaders?.() ?? {}),
        Origin: TEST_ORIGIN,
      },
    });

    const allowOrigin =
      response.headers?.['access-control-allow-origin'];

    const allowCredentials =
      String(
        response.headers?.[
          'access-control-allow-credentials'
        ] ?? '',
      ).toLowerCase() === 'true';

    const findings = [];

    if (
      allowOrigin === TEST_ORIGIN &&
      allowCredentials
    ) {
      findings.push(
        normalizeFinding({
          scannerId: 'security.cors',
          title:
            'Potentially Unsafe CORS Origin and Credential Configuration',
          description:
            'The application reflected a controlled external origin while allowing credentials.',
          severity: 'high',
          confidence: calculateConfidence({
            confirmed: true,
            repeated: true,
          }),
          remediation:
            'Allow only explicitly trusted origins and enable credentials only when required.',
          category: 'cors',
        }),
      );
    } else if (allowOrigin === '*') {
      findings.push(
        normalizeFinding({
          scannerId: 'security.cors',
          title: 'Wildcard CORS Policy',
          description:
            'The application exposes a wildcard Access-Control-Allow-Origin policy.',
          severity: 'low',
          confidence: calculateConfidence({
            confirmed: true,
          }),
          remediation:
            'Restrict cross-origin access to trusted origins where appropriate.',
          category: 'cors',
        }),
      );
    }

    return {
      data: {
        testedOrigin: TEST_ORIGIN,
        allowOrigin: allowOrigin ?? null,
        allowCredentials,
      },
      findings,
      evidence: [
        createSecurityEvidence({
          request: {
            method: 'GET',
            url: targetUrl,
            headers: {
              Origin: TEST_ORIGIN,
            },
          },
          response: {
            status: response.status,
            statusText: response.statusText,
            headers: response.headers,
          },
        }),
      ],
    };
  },
});

export default scanner;