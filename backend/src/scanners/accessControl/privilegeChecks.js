// STATUS: UPDATED
// File: src/scanners/accessControl/privilegeChecks.js

import { get } from "../../request/request.js";
import { getAuthenticatedRequestOptions } from "../../request/authenticatedRequestOptions.js";
import { createSecurityEvidence } from "../shared/evidenceBuilder.js";
import { calculateConfidence } from "../shared/confidence.js";
import { normalizeFinding } from "../shared/findingNormalizer.js";
import { assertSafeUrl } from "../../recon/shared/resolver.js";

const PRIVILEGE_OVERRIDE_HEADERS = [
  { header: "X-Original-URL", value: "/admin" },
  { header: "X-Rewrite-URL", value: "/admin" },
  { header: "X-Custom-IP-Authorization", value: "127.0.0.1" },
];

export const checkPrivilegeOverrideHeaders = async ({
  targetUrl,
  context,
  requestHeaders = {},
}) => {
  const base = new URL(targetUrl);
  const rootUrl = base.origin;
  await assertSafeUrl(rootUrl);

  const authenticatedRequestOptions = getAuthenticatedRequestOptions(context);
  const findings = [];
  const evidence = [];

  for (const { header, value } of PRIVILEGE_OVERRIDE_HEADERS) {
    if (context?.signal?.aborted) {
      break;
    }

    const headersWithOverride = {
      ...requestHeaders,
      [header]: value,
    };

    const response = await get(rootUrl, {
      signal: context?.signal,
      headers: headersWithOverride,
      maxRedirects: 0,
      validateStatus: () => true,
      ...authenticatedRequestOptions,
    });

    if (
      response.status >= 200 &&
      response.status < 300 &&
      typeof response.data === "string" &&
      /admin|dashboard|management|superuser/i.test(response.data)
    ) {
      findings.push(
        normalizeFinding({
          scannerId: "security.access-control",
          title: `Potential Authorization Bypass via ${header}`,
          description: `The application responded with administrative content when using the ${header}: ${value} header.`,
          severity: "high",
          confidence: calculateConfidence({ confirmed: false }),
          remediation:
            "Do not rely on reverse-proxy override headers for authorization decisions.",
          category: "access-control",
          metadata: {
            header,
            value,
            technique: "header-privilege-override",
          },
        }),
      );

      evidence.push(
        createSecurityEvidence({
          request: {
            method: "GET",
            url: rootUrl,
            headers: headersWithOverride,
          },
          response: {
            status: response.status,
            statusText: response.statusText,
            headers: response.headers,
          },
          description: `Authorization bypass test via header ${header}: ${value}`,
          findingKey: `security.access-control:override:${header}`,
          type: "http_exchange",
        }),
      );

      break;
    }
  }

  return { findings, evidence };
};

