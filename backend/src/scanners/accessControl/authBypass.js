// STATUS: UPDATED
// File: src/scanners/accessControl/authBypass.js

import { get } from "../../request/request.js";
import { getAuthenticatedRequestOptions } from "../../request/authenticatedRequestOptions.js";
import { createSecurityEvidence } from "../shared/evidenceBuilder.js";
import { calculateConfidence } from "../shared/confidence.js";
import { normalizeFinding } from "../shared/findingNormalizer.js";
import { assertSafeUrl } from "../../recon/shared/resolver.js";

export const SENSITIVE_PATHS = [
  "/admin",
  "/administrator",
  "/manage",
  "/dashboard",
  "/internal",
];

export const checkSensitiveEndpoints = async ({
  targetUrl,
  paths = SENSITIVE_PATHS,
  context,
  requestHeaders = {},
}) => {
  const base = new URL(targetUrl);
  const authenticatedRequestOptions = getAuthenticatedRequestOptions(context);
  const findings = [];
  const evidence = [];
  const results = [];

  for (const pathname of paths) {
    if (context?.signal?.aborted) {
      break;
    }

    const candidate = new URL(pathname, base.origin).toString();
    await assertSafeUrl(candidate);

    const response = await get(candidate, {
      signal: context?.signal,
      headers: requestHeaders,
      maxRedirects: 0,
      validateStatus: () => true,
      ...authenticatedRequestOptions,
    });

    results.push({
      path: pathname,
      status: response.status,
    });

    if (response.status >= 200 && response.status < 300) {
      findings.push(
        normalizeFinding({
          scannerId: "security.access-control",
          title: "Potentially Exposed Sensitive Endpoint",
          description: `A potentially administrative endpoint "${pathname}" returned a successful response (${response.status}) to the assessment request.`,
          severity: "high",
          confidence: calculateConfidence({
            confirmed: false,
          }),
          remediation:
            "Enforce authorization checks on administrative and sensitive endpoints, and verify access using an appropriate authorized test account.",
          category: "access-control",
          metadata: {
            path: pathname,
            status: response.status,
            technique: "sensitive-endpoint-probe",
          },
        }),
      );
    }

    evidence.push(
      createSecurityEvidence({
        request: {
          method: "GET",
          url: candidate,
          headers: requestHeaders,
        },
        response: {
          status: response.status,
          statusText: response.statusText,
          headers: response.headers,
        },
        description: `Access control probe for sensitive path ${pathname}`,
        findingKey: `security.access-control:path:${pathname}`,
        type: "http_exchange",
      }),
    );
  }

  return { results, findings, evidence };
};

