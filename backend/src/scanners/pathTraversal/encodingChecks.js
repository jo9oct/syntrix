// STATUS: UPDATED
// File: src/scanners/pathTraversal/encodingChecks.js

import { get } from "../../request/request.js";
import { getAuthenticatedRequestOptions } from "../../request/authenticatedRequestOptions.js";
import { createSecurityEvidence } from "../shared/evidenceBuilder.js";
import { calculateConfidence } from "../shared/confidence.js";
import { normalizeFinding } from "../shared/findingNormalizer.js";
import { setParameter } from "../shared/parameterTester.js";
import { assertSafeUrl } from "../../recon/shared/resolver.js";
import { FILE_DISCLOSURE_PATTERNS } from "./traversalChecks.js";

const ENCODED_PAYLOADS = [
  "%2e%2e%2f%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd",
  "%252e%252e%252f%252e%252e%252f%252e%252e%252fetc%252fpasswd",
];

export const checkEncodedTraversal = async ({
  targetUrl,
  parameter,
  context,
  requestHeaders = {},
}) => {
  const authenticatedRequestOptions = getAuthenticatedRequestOptions(context);
  const findings = [];
  const evidence = [];
  let requestsTested = 0;

  for (const payload of ENCODED_PAYLOADS) {
    if (context?.signal?.aborted) {
      break;
    }

    const testUrl = setParameter(targetUrl, parameter, payload);

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
          title: "Path Traversal via Encoded Sequences",
          description: `The application processed encoded directory traversal sequences in parameter "${parameter}", resulting in potential file disclosure.`,
          severity: "high",
          confidence: calculateConfidence({
            confirmed: false,
          }),
          remediation:
            "Decode input before validation and ensure canonical path resolution remains within approved base paths.",
          category: "path-traversal",
          metadata: {
            parameter,
            technique: "encoded-traversal",
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
          payload,
          confidence: "medium",
          description: `The application processed encoded directory traversal sequence in "${parameter}".`,
          metadata: {
            parameter,
            payload,
            technique: "encoded-traversal",
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

