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

const FILE_DISCLOSURE_PATTERNS = [
  /root:x:0:0:/i,
  /\[boot loader\]/i,
  /for 16-bit app support/i,
  /etc\/passwd/i,
];

const scanner = createSecurityScanner({
  id: "security.path-traversal",

  name: "Path Traversal",

  description: "Checks for controlled path traversal indicators.",

  async run(context) {
    const targetUrl = getTargetUrl(context);

    await assertSafeUrl(targetUrl);

    const parameters = getParameters(targetUrl);

    const payloads = getPayloads("pathTraversal");

    const findings = [];

    const evidence = [];

    for (const parameter of parameters.slice(0, 5)) {
      for (const payload of payloads.slice(0, 2)) {
        if (context?.signal?.aborted) {
          break;
        }

        const testUrl = setParameter(
          targetUrl,
          parameter,
          `${payload}etc/passwd`,
        );

        await assertSafeUrl(testUrl);

        const response = await get(testUrl, {
          signal: context?.signal,

          headers: context?.session?.getHeaders?.() ?? {},
        });

        const body = typeof response.data === "string" ? response.data : "";

        const disclosureDetected = FILE_DISCLOSURE_PATTERNS.some((pattern) =>
          pattern.test(body),
        );

        if (disclosureDetected) {
          findings.push(
            normalizeFinding({
              scannerId: "security.path-traversal",

              title: "Potential Path Traversal File Disclosure",

              description: `A response contained a signature consistent with local file disclosure after controlled traversal input in "${parameter}".`,

              severity: "high",

              confidence: calculateConfidence({
                confirmed: true,
              }),

              remediation:
                "Canonicalize paths, restrict file access to approved directories, and reject traversal sequences.",

              category: "path-traversal",

              metadata: {
                parameter,
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

                body: response.data,
              },
            }),
          );

          break;
        }
      }
    }

    return {
      data: {
        testedParameters: parameters.slice(0, 5),

        disclosureDetected: findings.length > 0,
      },

      findings,

      evidence,
    };
  },
});

export default scanner;
