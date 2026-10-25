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
import { evaluateJwtSignature } from "./signatureChecks.js";
import { evaluateJwtAlgorithm } from "./algorithmChecks.js";
import { evaluateJwtClaims } from "./claimsValidation.js";

const JWT_PATTERN =
  /\beyJ[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]*\b/g;

const scanner = createSecurityScanner({
  id: "security.jwt",
  name: "JWT Security",
  description:
    "Detects and evaluates JWT security including signature, algorithm, claims, and validation checks without storing raw token values.",

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
      // Base token exposure finding
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

      // Inspect signature, algorithm, and claims for each detected token
      for (const token of uniqueMatches) {
        const sigRes = evaluateJwtSignature(token);
        const algRes = evaluateJwtAlgorithm(token);
        const claimsRes = evaluateJwtClaims(token);

        findings.push(
          ...sigRes.findings,
          ...algRes.findings,
          ...claimsRes.findings,
        );
      }
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
