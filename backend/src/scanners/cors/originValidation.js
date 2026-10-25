// STATUS: UPDATED
// File: src/scanners/cors/originValidation.js

import { get } from "../../request/request.js";
import { getAuthenticatedRequestOptions } from "../../request/authenticatedRequestOptions.js";
import { createSecurityEvidence } from "../shared/evidenceBuilder.js";
import { calculateConfidence } from "../shared/confidence.js";
import { normalizeFinding } from "../shared/findingNormalizer.js";

export const TEST_ORIGINS = {
  ARBITRARY: "https://assessment.invalid",
  NULL: "null",
};

export const checkOriginReflection = async ({
  targetUrl,
  context,
  testOrigin = TEST_ORIGINS.ARBITRARY,
}) => {
  const requestHeaders = {
    ...(context?.session?.getHeaders?.() ?? {}),
    Origin: testOrigin,
  };

  const authenticatedRequestOptions = getAuthenticatedRequestOptions(context);

  const response = await get(targetUrl, {
    signal: context?.signal,
    headers: requestHeaders,
    ...authenticatedRequestOptions,
  });

  const allowOrigin = response.headers?.["access-control-allow-origin"];
  const isReflected = allowOrigin === testOrigin;

  const findings = [];
  const evidence = [
    createSecurityEvidence({
      request: {
        method: "GET",
        url: targetUrl,
        headers: { Origin: testOrigin },
      },
      response: {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
      },
      description: `Testing CORS origin validation with Origin: ${testOrigin}`,
      findingKey: `security.cors:origin:${testOrigin}`,
      type: "http_exchange",
    }),
  ];

  if (isReflected && testOrigin === TEST_ORIGINS.NULL) {
    findings.push(
      normalizeFinding({
        scannerId: "security.cors",
        title: "Trust of 'null' Origin in CORS Policy",
        description:
          "The application trusts the 'null' origin in Access-Control-Allow-Origin, which can be triggered via sandboxed iframes or data: URIs.",
        severity: "medium",
        confidence: calculateConfidence({ confirmed: true }),
        remediation:
          "Never allow 'null' origin in Access-Control-Allow-Origin.",
        category: "cors",
        metadata: { detection: "null-origin-allowed", origin: testOrigin },
      }),
    );
  }

  return {
    testOrigin,
    allowOrigin: allowOrigin ?? null,
    isReflected,
    response,
    findings,
    evidence,
  };
};
