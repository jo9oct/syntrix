// STATUS: UPDATED

import { get } from "../../request/request.js";

import { createSecurityEvidence } from "../shared/evidenceBuilder.js";

import { calculateConfidence } from "../shared/confidence.js";

import { normalizeFinding } from "../shared/findingNormalizer.js";

import {
  createSecurityScanner,
  getTargetUrl,
} from "../shared/scannerContract.js";

import { assertSafeUrl } from "../../recon/shared/resolver.js";

const REQUIRED_HEADERS = [
  {
    name: "strict-transport-security",
    title: "Missing Strict-Transport-Security Header",
    severity: "medium",
    remediation: "Configure Strict-Transport-Security for HTTPS deployments.",
  },
  {
    name: "content-security-policy",
    title: "Missing Content-Security-Policy Header",
    severity: "medium",
    remediation: "Define an appropriate Content-Security-Policy.",
  },
  {
    name: "x-content-type-options",
    title: "Missing X-Content-Type-Options Header",
    severity: "low",
    remediation: "Set X-Content-Type-Options to nosniff.",
  },
  {
    name: "referrer-policy",
    title: "Missing Referrer-Policy Header",
    severity: "low",
    remediation: "Configure an appropriate Referrer-Policy.",
  },
];

const normalizeHeaders = (headers) =>
  Object.fromEntries(
    Object.entries(headers ?? {}).map(([key, value]) => [
      key.toLowerCase(),
      value,
    ]),
  );

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

  description: "Checks common HTTP security response headers.",

  async run(context) {
    const targetUrl = getTargetUrl(context);

    await assertSafeUrl(targetUrl);

    if (context?.signal?.aborted) {
      return createCancelledResult();
    }

    const requestHeaders = context?.session?.getHeaders?.() ?? {};

    const response = await get(targetUrl, {
      signal: context?.signal,
      headers: requestHeaders,
    });

    const headers = normalizeHeaders(response.headers);

    if (context?.signal?.aborted) {
      return createCancelledResult(headers, response.status);
    }

    const status = Number(response.status);

    /*
     * A server-side error does not reliably establish
     * that the target application is missing security headers.
     *
     * Preserve the response as evidence, but do not generate
     * missing-header findings from a 5xx response.
     */
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

    const hasHeader = (name) => {
      const value = headers[name];

      if (value == null) {
        return false;
      }

      if (typeof value === "string") {
        return value.trim().length > 0;
      }

      if (Array.isArray(value)) {
        return value.some(
          (entry) => entry != null && String(entry).trim().length > 0,
        );
      }

      return Boolean(value);
    };

    const present = REQUIRED_HEADERS.filter((item) => hasHeader(item.name)).map(
      (item) => item.name,
    );

    const missing = REQUIRED_HEADERS.filter(
      (item) => !hasHeader(item.name),
    ).map((item) => item.name);

    const findings = [];
    const evidence = [];

    for (const required of REQUIRED_HEADERS) {
      if (hasHeader(required.name)) {
        continue;
      }

      const title = required.title;

      const description = `The response does not expose the ${required.name} security header.`;

      const findingKey = `security.security-headers:${title}`;

      findings.push(
        normalizeFinding({
          scannerId: "security.security-headers",

          title,

          description,

          severity: required.severity,

          confidence: calculateConfidence({
            confirmed: true,
          }),

          remediation: required.remediation,

          category: "security-headers",

          metadata: {
            header: required.name,
            responseStatus: status,
          },
        }),
      );

      evidence.push(
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
            header: required.name,
            responseStatus: status,
          },

          findingKey,

          type: "http_exchange",
        }),
      );
    }

    return {
      data: {
        headers,
        present,
        missing,
        status,
      },

      findings,

      evidence,

      fingerprints: [],

      verificationRecords: [],

      metadata: {
        requiredHeaderCount: REQUIRED_HEADERS.length,

        presentHeaderCount: present.length,

        missingHeaderCount: missing.length,

        cancelled: false,

        inconclusive: false,
      },
    };
  },
});

export default scanner;
