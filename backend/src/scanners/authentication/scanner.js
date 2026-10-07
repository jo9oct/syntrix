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

const scanner = createSecurityScanner({
  id: 'security.authentication',
  name: 'Authentication Security',
  description:
    'Assesses exposed authentication behavior without credential guessing.',

  async run(context) {
    const targetUrl = getTargetUrl(context);

    await assertSafeUrl(targetUrl);

    const response = await get(targetUrl, {
      signal: context?.signal,
      headers:
        context?.session?.getHeaders?.() ?? {},
      maxRedirects: 0,
      validateStatus: () => true,
    });

    const wwwAuthenticate =
      response.headers?.['www-authenticate'] ?? null;

    const server =
      response.headers?.server ?? null;

    const findings = [];

    if (
      response.status === 401 &&
      !wwwAuthenticate
    ) {
      findings.push(
        normalizeFinding({
          scannerId:
            'security.authentication',
          title:
            'Authentication Challenge Missing WWW-Authenticate Header',
          description:
            'The endpoint returned HTTP 401 without an authentication challenge header.',
          severity: 'low',
          confidence:
            calculateConfidence({
              confirmed: true,
            }),
          remediation:
            'Return an appropriate authentication challenge when HTTP authentication is used.',
          category: 'authentication',
        }),
      );
    }

    if (
      server &&
      /login|auth/i.test(server)
    ) {
      findings.push(
        normalizeFinding({
          scannerId:
            'security.authentication',
          title:
            'Authentication Service Information Disclosure',
          description:
            'Authentication-related server information appears to be exposed in the response.',
          severity: 'low',
          confidence:
            calculateConfidence({
              confirmed: true,
            }),
          remediation:
            'Minimize unnecessary authentication implementation details in public response headers.',
          category: 'authentication',
        }),
      );
    }

    return {
      data: {
        status: response.status,
        authenticationChallenge:
          wwwAuthenticate,
      },
      findings,
      evidence: [
        createSecurityEvidence({
          request: {
            method: 'GET',
            url: targetUrl,
            headers:
              context?.session?.getHeaders?.() ?? {},
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