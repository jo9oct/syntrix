// STATUS: UPDATED
// File: src/scanners/jwt/scanner.js

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

const JWT_PATTERN =
  /\beyJ[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{5,}\b/g;

const scanner = createSecurityScanner({
  id: "security.jwt",
  name: "JWT Security",
  description:
    "Detects JWT-like strings exposed in response content or headers without storing token values.",

  async run(context) {
    const targetUrl = getTargetUrl(context);

    await assertSafeUrl(targetUrl);

    const requestHeaders = context?.session?.getHeaders?.() ?? {};

    const authenticatedRequestOptions = getAuthenticatedRequestOptions(context);

    const response = await get(targetUrl, {
      signal: context?.signal,
      headers: requestHeaders,
      ...authenticatedRequestOptions,
    });

    const body = typeof response.data === "string" ? response.data : "";

    const headerText = Object.entries(response.headers ?? {})
      .map(([key, value]) => `${key}: ${value}`)
      .join("\n");

    const matches = [
      ...(body.match(JWT_PATTERN) ?? []),
      ...(headerText.match(JWT_PATTERN) ?? []),
    ];

    const uniqueMatches = [...new Set(matches)];

    const findings = [];

    if (uniqueMatches.length > 0) {
      findings.push(
        normalizeFinding({
          scannerId: "security.jwt",
          title: "JWT-Like Token Exposure Detected",
          description:
            "One or more JWT-like strings were found in the target response. Review the exposure context to determine whether they are sensitive, valid authentication tokens.",
          severity: "medium",
          confidence: calculateConfidence({
            confirmed: false,
          }),
          remediation:
            "Avoid exposing sensitive authentication tokens in publicly accessible response content. Minimize token lifetime and scope, and ensure tokens are delivered only to authorized clients.",
          category: "jwt",
          metadata: {
            tokenCount: uniqueMatches.length,
            tokenValuesRedacted: true,
          },
        }),
      );
    }

    return {
      data: {
        jwtLikeTokenCount: uniqueMatches.length,
      },
      findings,
      evidence:
        uniqueMatches.length > 0
          ? [
              createSecurityEvidence({
                request: {
                  method: "GET",
                  url: targetUrl,
                  headers: {
                    ...requestHeaders,
                  },
                },
                response: {
                  status: response.status,
                  statusText: response.statusText,
                  headers: response.headers,
                },
                metadata: {
                  tokensRedacted: true,
                  tokenCount: uniqueMatches.length,
                },
              }),
            ]
          : [],
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
