// STATUS: UPDATED
// File: src/scanners/apiSecurity/inputValidation.js

import { get } from "../../request/request.js";
import { getAuthenticatedRequestOptions } from "../../request/authenticatedRequestOptions.js";
import { createSecurityEvidence } from "../shared/evidenceBuilder.js";
import { calculateConfidence } from "../shared/confidence.js";
import { normalizeFinding } from "../shared/findingNormalizer.js";
import { assertSafeUrl } from "../../recon/shared/resolver.js";

const STACK_TRACE_PATTERNS = [
  /at\s+[\w$./\\-]+\s+\([^)]+:\d+:\d+\)/i,
  /Traceback \(most recent call last\):/i,
  /NullPointerException/i,
  /org\.springframework\./i,
];

export const checkApiInputValidation = async ({
  targetUrl,
  context,
  requestHeaders = {},
}) => {
  const findings = [];
  const evidence = [];

  const testUrl = new URL(targetUrl);
  testUrl.searchParams.set("__test_malformed", "{{7*7}}");
  await assertSafeUrl(testUrl.toString());

  const authenticatedRequestOptions = getAuthenticatedRequestOptions(context);

  const response = await get(testUrl.toString(), {
    signal: context?.signal,
    headers: requestHeaders,
    maxRedirects: 0,
    validateStatus: () => true,
    ...authenticatedRequestOptions,
  });

  const body = typeof response.data === "string" ? response.data : "";
  const hasStackTrace = STACK_TRACE_PATTERNS.some((p) => p.test(body));

  if (response.status >= 500 && hasStackTrace) {
    findings.push(
      normalizeFinding({
        scannerId: "security.api-security",
        title: "API Endpoint Unhandled Exception with Stack Trace Disclosure",
        description: `Submitting malformed input caused an unhandled internal error (HTTP ${response.status}) exposing stack traces.`,
        severity: "medium",
        confidence: calculateConfidence({ confirmed: true }),
        remediation:
          "Handle input errors gracefully with HTTP 400 and suppress verbose stack traces in production.",
        category: "api-security",
        metadata: {
          status: response.status,
          check: "input-validation",
        },
      }),
    );

    evidence.push(
      createSecurityEvidence({
        request: {
          method: "GET",
          url: testUrl.toString(),
          headers: requestHeaders,
        },
        response: {
          status: response.status,
          statusText: response.statusText,
          headers: response.headers,
        },
        description: "Malformed input resulted in stack trace disclosure",
        type: "http_exchange",
      }),
    );
  }

  return { findings, evidence };
};
