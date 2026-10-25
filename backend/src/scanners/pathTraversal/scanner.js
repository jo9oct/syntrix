// STATUS: UPDATED
// File: src/scanners/pathTraversal/scanner.js

import { get } from "../../request/request.js";
import { getAuthenticatedRequestOptions } from "../../request/authenticatedRequestOptions.js";
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
import { runConcurrent } from "../../utils/concurrency.js";

const MAX_TESTED_PARAMETERS = 5;
const MAX_PAYLOADS_PER_PARAMETER = 2;

const FILE_DISCLOSURE_PATTERNS = [
  /root:x:0:0:/i,
  /\[boot loader\]/i,
  /for 16-bit app support/i,
  /etc\/passwd/i,
];

const scanner = createSecurityScanner({
  id: "security.path-traversal",
  name: "Path Traversal",
  description: "Checks for controlled path traversal indicators in responses.",

  async run(context) {
    const targetUrl = getTargetUrl(context);

    await assertSafeUrl(targetUrl);

    const parameters = getParameters(targetUrl).slice(0, MAX_TESTED_PARAMETERS);

    const payloads = getPayloads("pathTraversal").slice(
      0,
      MAX_PAYLOADS_PER_PARAMETER,
    );

    const requestHeaders = context?.session?.getHeaders?.() ?? {};

    const authenticatedRequestOptions = getAuthenticatedRequestOptions(context);

    const findings = [];
    const evidence = [];
    let requestsTested = 0;

    await runConcurrent(
      parameters,
      10,
      async (parameter) => {
        for (const payload of payloads) {
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
            headers: requestHeaders,
            ...authenticatedRequestOptions,
          });

          requestsTested += 1;

          const body = typeof response.data === "string" ? response.data : "";

          const disclosureDetected = FILE_DISCLOSURE_PATTERNS.some((pattern) =>
            pattern.test(body),
          );

          if (!disclosureDetected) {
            continue;
          }

          findings.push(
            normalizeFinding({
              scannerId: "security.path-traversal",
              title: "Potential Path Traversal File Disclosure",
              description: `A response contained a signature consistent with local file disclosure after controlled traversal input in "${parameter}". Verify that the response originated from the requested resource and contains actual file content.`,
              severity: "high",
              confidence: calculateConfidence({
                confirmed: false,
              }),
              remediation:
                "Canonicalize paths, restrict file access to approved directories, and reject traversal sequences.",
              category: "path-traversal",
              metadata: {
                parameter,
                responseBodyRedacted: true,
              },
            }),
          );

          evidence.push(
            createSecurityEvidence({
              request: {
                method: "GET",
                url: testUrl,
                headers: {
                  ...requestHeaders,
                },
              },
              response: {
                status: response.status,
                statusText: response.statusText,
                headers: response.headers,
                contentType: response.headers?.["content-type"],
              },
              parameter,
              payload: `${payload}etc/passwd`,
              confidence: "medium",
              description: `A response contained a signature consistent with local file disclosure after controlled traversal input in "${parameter}".`,
              metadata: {
                parameter,
                payload: `${payload}etc/passwd`,
                disclosureSignatureDetected: true,
                responseBodyRedacted: true,
              },
            }),
          );

          break;
        }
      },
      context?.signal,
    );

    return {
      data: {
        testedParameters: parameters,
        disclosureDetected: findings.length > 0,
      },
      findings,
      evidence,
      fingerprints: [],
      verificationRecords: [],
      metadata: {
        cancelled: context?.signal?.aborted === true,
        requestsTested,
      },
    };
  },
});

export default scanner;
