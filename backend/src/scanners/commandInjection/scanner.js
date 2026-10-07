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
  getSafeMarker,
} from '../shared/payloadManager.js';
import {
  assertSafeUrl,
} from '../../recon/shared/resolver.js';

const scanner = createSecurityScanner({
  id: 'security.command-injection',
  name: 'Command Injection Surface',
  description:
    'Performs a conservative command-injection surface assessment without executing commands.',

  async run(context) {
    const targetUrl = getTargetUrl(context);

    await assertSafeUrl(targetUrl);

    const parameters = getParameters(targetUrl);
    const marker =
      `${getSafeMarker()}-command`;

    const findings = [];
    const evidence = [];

    for (const parameter of parameters.slice(0, 5)) {
      if (context?.signal?.aborted) {
        break;
      }

      const testUrl = setParameter(
        targetUrl,
        parameter,
        marker,
      );

      await assertSafeUrl(testUrl);

      const response = await get(testUrl, {
        signal: context?.signal,
        headers:
          context?.session?.getHeaders?.() ?? {},
      });

      const body =
        typeof response.data === 'string'
          ? response.data
          : '';

      if (body.includes(marker)) {
        findings.push(
          normalizeFinding({
            scannerId:
              'security.command-injection',
            title:
              'Potential Command Processing Input Surface',
            description:
              `A controlled command-style marker was reflected or processed for parameter "${parameter}".`,
            severity: 'medium',
            confidence:
              calculateConfidence({
                confirmed: true,
              }),
            remediation:
              'Avoid shell interpretation of user input and use safe process APIs with strict input validation.',
            category: 'command-injection',
            metadata: {
              parameter,
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
              body,
            },
          }),
        );
      }
    }

    return {
      data: {
        testedParameters: parameters.slice(0, 5),
        markerObserved:
          findings.length > 0,
      },
      findings,
      evidence,
    };
  },
});

export default scanner;