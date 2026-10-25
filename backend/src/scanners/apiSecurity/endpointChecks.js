// STATUS: UPDATED
// File: src/scanners/apiSecurity/endpointChecks.js

import { get } from "../../request/request.js";
import { getAuthenticatedRequestOptions } from "../../request/authenticatedRequestOptions.js";
import { createSecurityEvidence } from "../shared/evidenceBuilder.js";
import { calculateConfidence } from "../shared/confidence.js";
import { normalizeFinding } from "../shared/findingNormalizer.js";
import { assertSafeUrl } from "../../recon/shared/resolver.js";

export const API_PATHS = [
  "/api",
  "/api/v1",
  "/api/v1/health",
  "/openapi.json",
  "/swagger.json",
];

export const checkApiEndpoints = async ({
  targetUrl,
  context,
  requestHeaders = {},
}) => {
  const baseUrl = new URL(targetUrl);
  const findings = [];
  const evidence = [];
  const results = [];

  const authenticatedRequestOptions = getAuthenticatedRequestOptions(context);

  for (const pathname of API_PATHS) {
    if (context?.signal?.aborted) {
      break;
    }

    const candidate = new URL(pathname, baseUrl.origin).toString();
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

    const contentType = String(
      response.headers?.["content-type"] ?? "",
    ).toLowerCase();

    const successful = response.status >= 200 && response.status < 300;

    const isDocumentationPath =
      pathname === "/openapi.json" || pathname === "/swagger.json";

    const isDocumentationContent = /json|openapi|swagger/i.test(contentType);

    const isDocumentation =
      successful && isDocumentationPath && isDocumentationContent;

    if (isDocumentation) {
      findings.push(
        normalizeFinding({
          scannerId: "security.api-security",
          title: "Public API Documentation Exposure",
          description: `An API documentation or schema resource was accessible at "${pathname}". This does not establish whether the resource was intended to be public.`,
          severity: "low",
          confidence: calculateConfidence({
            confirmed: false,
          }),
          remediation:
            "Review whether API documentation is intended to be publicly accessible. Restrict it if it exposes information that should only be available to authorized users.",
          category: "api-security",
          metadata: {
            path: pathname,
            contentType,
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

  return { results, findings, evidence };
};

