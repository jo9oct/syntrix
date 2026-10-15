import { get } from "../../request/request.js";

import { createSecurityEvidence } from "../shared/evidenceBuilder.js";

import { calculateConfidence } from "../shared/confidence.js";

import { normalizeFinding } from "../shared/findingNormalizer.js";

import {
  createSecurityScanner,
  getTargetUrl,
} from "../shared/scannerContract.js";

import { getParameters, setParameter } from "../shared/parameterTester.js";

import { getPayloads } from "../shared/payloadManager.js";

import { assertSafeUrl } from "../../recon/shared/resolver.js";

const scanner = createSecurityScanner({
  id: "security.ssrf",

  name: "SSRF Surface Detection",

  description:
    "Checks URL-like parameters for behavior suggesting server-side URL retrieval.",

  async run(context) {
    const targetUrl = getTargetUrl(context);

    await assertSafeUrl(targetUrl);

    const parameters = getParameters(targetUrl);

    const payload = getPayloads("ssrf")[0];

    const findings = [];
    const evidence = [];

    for (const parameter of parameters.slice(0, 5)) {
      if (context?.signal?.aborted) {
        break;
      }

      const testUrl = setParameter(targetUrl, parameter, payload);

      await assertSafeUrl(testUrl);

      const response = await get(testUrl, {
        signal: context?.signal,

        headers: context?.session?.getHeaders?.() ?? {},

        maxRedirects: 0,

        validateStatus: () => true,
      });

      const body = typeof response.data === "string" ? response.data : "";

      const possibleUrlRetrieval =
        /example\.invalid/i.test(body) ||
        response.status === 502 ||
        response.status === 504;

      if (possibleUrlRetrieval) {
        findings.push(
          normalizeFinding({
            scannerId: "security.ssrf",

            title: "Potential Server-Side URL Retrieval Surface",

            description: `The parameter "${parameter}" produced behavior consistent with server-side URL processing.`,

            severity: "high",

            confidence: calculateConfidence({
              differential: true,
            }),

            remediation:
              "Use strict URL allowlists, validate destination addresses, and block private or reserved network ranges.",

            category: "ssrf",

            metadata: {
              parameter,

              status: response.status,
            },
          }),
        );

        evidence.push(
          createSecurityEvidence({
            request: {
              method: "GET",

              url: testUrl,

              headers: context?.session?.getHeaders?.() ?? {},
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

        possibleUrlRetrieval: findings.length > 0,
      },

      findings,

      evidence,
    };
  },
});

export default scanner;
