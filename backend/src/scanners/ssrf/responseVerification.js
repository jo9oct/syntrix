// STATUS: UPDATED
// File: src/scanners/ssrf/responseVerification.js

import { createSecurityEvidence } from "../shared/evidenceBuilder.js";
import { calculateConfidence } from "../shared/confidence.js";
import { normalizeFinding } from "../shared/findingNormalizer.js";

export const evaluateSsrfResponse = ({
  response,
  parameter,
  payload,
  testUrl,
  requestHeaders = {},
}) => {
  const body = typeof response.data === "string" ? response.data : "";
  const reflectedTestDomain = /example\.invalid/i.test(body);
  const gatewayError = response.status === 502 || response.status === 504;

  if (!reflectedTestDomain && !gatewayError) {
    return null;
  }

  const findingKey = `security.ssrf:url-retrieval-surface:${parameter}`;

  const finding = normalizeFinding({
    scannerId: "security.ssrf",
    title: "Potential Server-Side URL Retrieval Surface",
    description: `The parameter "${parameter}" produced behavior that may be consistent with server-side URL processing. A reflected marker or gateway error alone does not confirm SSRF.`,
    severity: "high",
    confidence: calculateConfidence({
      confirmed: false,
    }),
    remediation:
      "Use strict URL allowlists, validate destination addresses after DNS resolution, block private and reserved network ranges, and revalidate every redirect destination.",
    category: "ssrf",
    metadata: {
      parameter,
      status: response.status,
      signal: reflectedTestDomain ? "test-domain-marker" : "gateway-error",
      responseBodyRedacted: true,
    },
  });

  const evidence = createSecurityEvidence({
    request: {
      method: "GET",
      url: testUrl,
      headers: requestHeaders,
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
    description:
      "Potential URL-processing behavior observed. Raw response body omitted from stored evidence.",
    metadata: {
      parameter,
      payload,
      responseBodyRedacted: true,
    },
    findingKey,
    type: "http_exchange",
  });

  return { finding, evidence };
};

