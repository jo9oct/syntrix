import { get } from "../../request/request.js";

import { createSecurityEvidence } from "../shared/evidenceBuilder.js";

import { calculateConfidence } from "../shared/confidence.js";

import { normalizeFinding } from "../shared/findingNormalizer.js";

import {
  createSecurityScanner,
  getTargetUrl,
} from "../shared/scannerContract.js";

import { assertSafeUrl } from "../../recon/shared/resolver.js";

const API_PATHS = [
  "/api",
  "/api/v1",
  "/api/v1/health",
  "/openapi.json",
  "/swagger.json",
];

const scanner = createSecurityScanner({
  id: "security.api-security",

  name: "API Security",

  description:
    "Performs bounded discovery of common API documentation and endpoint surfaces.",

  async run(context) {
    const targetUrl = getTargetUrl(context);

    const baseUrl = new URL(targetUrl);

    const findings = [];
    const evidence = [];
    const results = [];

    for (const pathname of API_PATHS) {
      if (context?.signal?.aborted) {
        break;
      }

      const candidate = new URL(pathname, baseUrl.origin).toString();

      await assertSafeUrl(candidate);

      const response = await get(candidate, {
        signal: context?.signal,

        headers: context?.session?.getHeaders?.() ?? {},

        maxRedirects: 0,

        validateStatus: () => true,
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

            description: `An API documentation or schema resource was publicly accessible at "${pathname}".`,

            severity: "low",

            confidence: calculateConfidence({
              confirmed: true,
            }),

            remediation:
              "Restrict API documentation to intended audiences and avoid exposing sensitive implementation details.",

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

            headers: context?.session?.getHeaders?.() ?? {},
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
        endpoints: results,
      },

      findings,

      evidence,
    };
  },
});

export default scanner;
