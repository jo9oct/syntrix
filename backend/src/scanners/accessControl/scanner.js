// STATUS: UPDATED
// File: src/scanners/accessControl/scanner.js

import { get } from "../../request/request.js";
import { getAuthenticatedRequestOptions } from "../../request/authenticatedRequestOptions.js";
import { createSecurityEvidence } from "../shared/evidenceBuilder.js";
import { calculateConfidence } from "../shared/confidence.js";
import { normalizeFinding } from "../shared/findingNormalizer.js";
import {
  createSecurityScanner,
  getTargetUrl,
} from "../shared/scannerContract.js";
import { assertSafeUrl } from "../../recon/shared/resolver.js";

const SENSITIVE_PATHS = [
  "/admin",
  "/administrator",
  "/manage",
  "/dashboard",
  "/internal",
];

const scanner = createSecurityScanner({
  id: "security.access-control",
  name: "Access Control",
  description: "Performs a bounded access-control surface assessment.",

  async run(context) {
    const targetUrl = getTargetUrl(context);

    await assertSafeUrl(targetUrl);

    const base = new URL(targetUrl);

    const findings = [];
    const evidence = [];
    const results = [];

    const requestHeaders = context?.session?.getHeaders?.() ?? {};

    const authenticatedRequestOptions = getAuthenticatedRequestOptions(context);

    for (const pathname of SENSITIVE_PATHS) {
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
            description: `A potentially administrative endpoint "${pathname}" returned a successful response to the assessment request.`,
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
        }),
      );
    }

    return {
      data: {
        testedPaths: results,
      },
      findings,
      evidence,
      fingerprints: [],
      verificationRecords: [],
      metadata: {
        cancelled: context?.signal?.aborted === true,
        pathsTested: results.length,
      },
    };
  },
});

export default scanner;
