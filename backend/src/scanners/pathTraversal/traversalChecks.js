// STATUS: UPDATED
// File: src/scanners/pathTraversal/traversalChecks.js

import { get } from "../../request/request.js";
import { getAuthenticatedRequestOptions } from "../../request/authenticatedRequestOptions.js";
import { createSecurityEvidence } from "../shared/evidenceBuilder.js";
import { calculateConfidence } from "../shared/confidence.js";
import { normalizeFinding } from "../shared/findingNormalizer.js";
import { setParameter } from "../shared/parameterTester.js";
import { assertSafeUrl } from "../../recon/shared/resolver.js";

export const FILE_DISCLOSURE_PATTERNS = [
  /root:x:0:0:/i,
  /\[boot loader\]/i,
  /for 16-bit app support/i,
  /etc\/passwd/i,
];

export const checkStandardTraversal = async ({
  targetUrl,
  parameter,
  payloads = ["../", "..\\"],
  context,
  requestHeaders = {},
}) => {
  const authenticatedRequestOptions = getAuthenticatedRequestOptions(context);
  const findings = [];
  const evidence = [];
  let requestsTested = 0;

  for (const payload of payloads) {
    if (context?.signal?.aborted) {
      break;
    }

    const testPayload = `${payload.repeat(4)}etc/passwd`;
    const testUrl = setParameter(targetUrl, parameter, testPayload);

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

    if (disclosureDetected) {
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
            technique: "standard-traversal",
            responseBodyRedacted: true,
          },
        }),
      );

      evidence.push(
        createSecurityEvidence({
          request: {
            method: "GET",
            url: testUrl,
            headers: { ...requestHeaders },
          },
          response: {
            status: response.status,
            statusText: response.statusText,
            headers: response.headers,
            contentType: response.headers?.["content-type"],
          },
          parameter,
          payload: testPayload,
          confidence: "medium",
          description: `A response contained a signature consistent with local file disclosure after controlled traversal input in "${parameter}".`,
          metadata: {
            parameter,
            payload: testPayload,
            technique: "standard-traversal",
            disclosureSignatureDetected: true,
            responseBodyRedacted: true,
          },
        }),
      );

      break;
    }
  }

  return { findings, evidence, requestsTested };
};

