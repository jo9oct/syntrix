// STATUS: UPDATED
// File: src/scanners/securityHeaders/scanner.js

import { get } from "../../request/request.js";
import { getAuthenticatedRequestOptions } from "../../request/authenticatedRequestOptions.js";
import { createSecurityEvidence } from "../shared/evidenceBuilder.js";
import {
  createSecurityScanner,
  getTargetUrl,
} from "../shared/scannerContract.js";
import { assertSafeUrl } from "../../recon/shared/resolver.js";
import {
  REQUIRED_HEADERS,
  normalizeHeaders,
  checkRequiredHeaders,
} from "./headerChecks.js";
import { validateHeaderConfigurations } from "./configValidation.js";

const createCancelledResult = (headers = {}, status = null) => ({
  data: {
    headers,
    present: [],
    missing: [],
    ...(status != null ? { status } : {}),
  },
  findings: [],
  evidence: [],
  fingerprints: [],
  verificationRecords: [],
  metadata: {
    cancelled: true,
  },
});

const scanner = createSecurityScanner({
  id: "security.security-headers",
  name: "Security Headers",
  description:
    "Checks common HTTP security response headers and configuration directives.",

  async run(context) {
    const targetUrl = getTargetUrl(context);

    await assertSafeUrl(targetUrl);

    if (context?.signal?.aborted) {
      return createCancelledResult();
    }

    const requestHeaders = context?.session?.getHeaders?.() ?? {};
    const authenticatedRequestOptions = getAuthenticatedRequestOptions(context);

    const response = await get(targetUrl, {
      signal: context?.signal,
      headers: requestHeaders,
      ...authenticatedRequestOptions,
    });

    const headers = normalizeHeaders(response.headers);
    const status = Number(response.status);

    if (context?.signal?.aborted) {
      return createCancelledResult(headers, status);
    }

    if (status >= 500 && status <= 599) {
      const description = `Security header assessment is inconclusive because the server returned HTTP ${status}.`;

      const evidence = [
        createSecurityEvidence({
          request: {
            method: "GET",
            url: targetUrl,
            headers: requestHeaders,
          },
          response: {
            status: response.status,
            statusText: response.statusText,
            headers: response.headers,
            contentType: response.headers?.["content-type"],
          },
          description,
          metadata: {
            assessment: "inconclusive",
            reason: "server_error_response",
            responseStatus: status,
          },
          findingKey: `security.security-headers:inconclusive:${status}`,
          type: "http_exchange",
        }),
      ];

      return {
        data: {
          headers,
          present: [],
          missing: [],
          status,
        },
        findings: [],
        evidence,
        fingerprints: [],
        verificationRecords: [],
        metadata: {
          requiredHeaderCount: REQUIRED_HEADERS.length,
          presentHeaderCount: 0,
          missingHeaderCount: 0,
          cancelled: false,
          inconclusive: true,
          reason: "server_error_response",
          responseStatus: status,
        },
      };
    }

    // 1. Missing header checks
    const headerCheckResults = checkRequiredHeaders({
      headers,
      targetUrl,
      requestHeaders,
      status,
      response,
    });

    // 2. Configuration validation
    const configCheckResults = validateHeaderConfigurations({
      headers,
      targetUrl,
      requestHeaders,
      status,
      response,
    });

    const findings = [
      ...headerCheckResults.findings,
      ...configCheckResults.findings,
    ];
    const evidence = [
      ...headerCheckResults.evidence,
      ...configCheckResults.evidence,
    ];

    return {
      data: {
        headers,
        present: headerCheckResults.present,
        missing: headerCheckResults.missing,
        status,
      },
      findings,
      evidence,
      fingerprints: [],
      verificationRecords: [],
      metadata: {
        requiredHeaderCount: REQUIRED_HEADERS.length,
        presentHeaderCount: headerCheckResults.present.length,
        missingHeaderCount: headerCheckResults.missing.length,
        cancelled: false,
        inconclusive: false,
      },
    };
  },
});

export default scanner;
