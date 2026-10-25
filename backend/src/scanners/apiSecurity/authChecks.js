// STATUS: UPDATED
// File: src/scanners/apiSecurity/authChecks.js

import { get } from "../../request/request.js";
import { createSecurityEvidence } from "../shared/evidenceBuilder.js";
import { calculateConfidence } from "../shared/confidence.js";
import { normalizeFinding } from "../shared/findingNormalizer.js";
import { assertSafeUrl } from "../../recon/shared/resolver.js";

const SENSITIVE_API_PATHS = [
  "/api/users",
  "/api/v1/users",
  "/api/settings",
  "/api/v1/settings",
];

export const checkApiAuthorization = async ({ targetUrl, context }) => {
  const baseUrl = new URL(targetUrl);
  const findings = [];
  const evidence = [];

  for (const pathname of SENSITIVE_API_PATHS) {
    if (context?.signal?.aborted) {
      break;
    }

    const candidate = new URL(pathname, baseUrl.origin).toString();
    await assertSafeUrl(candidate);

    // Explicitly make request without auth credentials to verify enforcement
    const response = await get(candidate, {
      signal: context?.signal,
      maxRedirects: 0,
      validateStatus: () => true,
    });

    if (response.status === 200) {
      findings.push(
        normalizeFinding({
          scannerId: "security.api-security",
          title: "Unauthenticated Sensitive API Endpoint",
          description: `Sensitive API endpoint "${pathname}" returned HTTP 200 without requiring authentication.`,
          severity: "high",
          confidence: calculateConfidence({ confirmed: false }),
          remediation:
            "Require authentication and authorization tokens on sensitive API endpoints.",
          category: "api-security",
          metadata: {
            path: pathname,
            check: "auth-check",
          },
        }),
      );

      evidence.push(
        createSecurityEvidence({
          request: {
            method: "GET",
            url: candidate,
          },
          response: {
            status: response.status,
            statusText: response.statusText,
            headers: response.headers,
          },
          description: `Unauthenticated probe against ${pathname}`,
          type: "http_exchange",
        }),
      );
      break;
    }
  }

  return { findings, evidence };
};
