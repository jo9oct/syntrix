// STATUS: UPDATED
// File: src/scanners/cors/scanner.js

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

const TEST_ORIGIN = "https://assessment.invalid";

const scanner = createSecurityScanner({
  id: "security.cors",
  name: "CORS Security",
  description: "Checks for unsafe cross-origin response configuration.",

  async run(context) {
    const targetUrl = getTargetUrl(context);

    await assertSafeUrl(targetUrl);

    const requestHeaders = {
      ...(context?.session?.getHeaders?.() ?? {}),
      Origin: TEST_ORIGIN,
    };

    const authenticatedRequestOptions = getAuthenticatedRequestOptions(context);

    const response = await get(targetUrl, {
      signal: context?.signal,
      headers: requestHeaders,
      ...authenticatedRequestOptions,
    });

    const allowOrigin = response.headers?.["access-control-allow-origin"];

    const allowCredentials =
      String(
        response.headers?.["access-control-allow-credentials"] ?? "",
      ).toLowerCase() === "true";

    const findings = [];

    if (allowOrigin === TEST_ORIGIN && allowCredentials) {
      findings.push(
        normalizeFinding({
          scannerId: "security.cors",
          title: "Potentially Unsafe CORS Origin and Credential Configuration",
          description:
            "The application reflected a controlled external origin while allowing credentials. Verify whether an untrusted website can actually read sensitive responses in a browser.",
          severity: "high",
          confidence: calculateConfidence({
            confirmed: false,
          }),
          remediation:
            "Allow only explicitly trusted origins and enable credentials only when required.",
          category: "cors",
          metadata: {
            detection: "reflected-origin-with-credentials",
          },
        }),
      );
    } else if (allowOrigin === "*") {
      findings.push(
        normalizeFinding({
          scannerId: "security.cors",
          title: "Wildcard CORS Policy",
          description:
            "The application exposes a wildcard Access-Control-Allow-Origin policy. Assess whether the accessible resources are intended to be public.",
          severity: "low",
          confidence: calculateConfidence({
            confirmed: false,
          }),
          remediation:
            "Restrict cross-origin access to trusted origins where appropriate.",
          category: "cors",
          metadata: {
            detection: "wildcard-allow-origin",
          },
        }),
      );
    }

    return {
      data: {
        testedOrigin: TEST_ORIGIN,
        allowOrigin: allowOrigin ?? null,
        allowCredentials,
      },
      findings,
      evidence: [
        createSecurityEvidence({
          request: {
            method: "GET",
            url: targetUrl,
            headers: {
              Origin: TEST_ORIGIN,
            },
          },
          response: {
            status: response.status,
            statusText: response.statusText,
            headers: response.headers,
          },
        }),
      ],
      fingerprints: [],
      verificationRecords: [],
      metadata: {
        cancelled: context?.signal?.aborted === true,
        requestsTested: 1,
      },
    };
  },
});

export default scanner;
