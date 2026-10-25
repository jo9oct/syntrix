// STATUS: UPDATED
// File: src/scanners/securityHeaders/configValidation.js

import { createSecurityEvidence } from "../shared/evidenceBuilder.js";
import { calculateConfidence } from "../shared/confidence.js";
import { normalizeFinding } from "../shared/findingNormalizer.js";

export const validateHeaderConfigurations = ({
  headers,
  targetUrl,
  requestHeaders = {},
  status,
  response,
}) => {
  const findings = [];
  const evidence = [];

  const addFinding = ({
    title,
    description,
    severity,
    remediation,
    headerName,
  }) => {
    const findingKey = `security.security-headers:config:${headerName}`;

    findings.push(
      normalizeFinding({
        scannerId: "security.security-headers",
        title,
        description,
        severity,
        confidence: calculateConfidence({ confirmed: true }),
        remediation,
        category: "security-headers",
        metadata: {
          header: headerName,
          value: headers[headerName],
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
          status: response?.status ?? status,
          statusText: response?.statusText,
          headers: response?.headers ?? headers,
          contentType: response?.headers?.["content-type"],
        },
        description,
        metadata: {
          header: headerName,
          value: headers[headerName],
          responseStatus: status,
        },
        findingKey,
        type: "http_exchange",
      }),
    );
  };

  // 1. Strict-Transport-Security validation
  const hsts = headers["strict-transport-security"];
  if (hsts && typeof hsts === "string") {
    const maxAgeMatch = hsts.match(/max-age=(\d+)/i);
    if (!maxAgeMatch) {
      addFinding({
        title: "Invalid Strict-Transport-Security Header Configuration",
        description:
          "The Strict-Transport-Security header is present but lacks a valid max-age directive.",
        severity: "medium",
        remediation:
          "Ensure Strict-Transport-Security includes a valid max-age directive (e.g., max-age=31536000; includeSubDomains).",
        headerName: "strict-transport-security",
      });
    } else {
      const maxAge = parseInt(maxAgeMatch[1], 10);
      if (maxAge === 0) {
        addFinding({
          title: "Strict-Transport-Security Disabled (max-age=0)",
          description:
            "The Strict-Transport-Security header specifies max-age=0, which disables HSTS protection.",
          severity: "medium",
          remediation:
            "Set max-age to at least 10368000 (120 days) or 31536000 (1 year).",
          headerName: "strict-transport-security",
        });
      } else if (maxAge < 10368000) {
        addFinding({
          title: "Weak Strict-Transport-Security max-age",
          description: `The Strict-Transport-Security max-age (${maxAge}s) is shorter than recommended industry baseline (10368000s).`,
          severity: "low",
          remediation:
            "Increase max-age to at least 10368000 (120 days) or 31536000 (1 year).",
          headerName: "strict-transport-security",
        });
      }
    }
  }

  // 2. Content-Security-Policy validation
  const csp = headers["content-security-policy"];
  if (csp && typeof csp === "string") {
    const lowerCsp = csp.toLowerCase();
    const hasUnsafeInline = lowerCsp.includes("'unsafe-inline'");
    const hasUnsafeEval = lowerCsp.includes("'unsafe-eval'");
    if (hasUnsafeInline || hasUnsafeEval) {
      addFinding({
        title: "Permissive Content-Security-Policy Directives",
        description: `Content-Security-Policy contains unsafe directive(s): ${[
          hasUnsafeInline ? "'unsafe-inline'" : null,
          hasUnsafeEval ? "'unsafe-eval'" : null,
        ]
          .filter(Boolean)
          .join(", ")}.`,
        severity: "medium",
        remediation:
          "Avoid 'unsafe-inline' and 'unsafe-eval' by using cryptographic nonces or hashes.",
        headerName: "content-security-policy",
      });
    }
  }

  // 3. X-Content-Type-Options validation
  const xcto = headers["x-content-type-options"];
  if (xcto && typeof xcto === "string") {
    if (xcto.toLowerCase().trim() !== "nosniff") {
      addFinding({
        title: "Misconfigured X-Content-Type-Options Header",
        description: `X-Content-Type-Options is set to "${xcto}" instead of "nosniff".`,
        severity: "low",
        remediation: 'Set X-Content-Type-Options to "nosniff".',
        headerName: "x-content-type-options",
      });
    }
  }

  // 4. Referrer-Policy validation
  const referrerPolicy = headers["referrer-policy"];
  if (referrerPolicy && typeof referrerPolicy === "string") {
    const lowerRp = referrerPolicy.toLowerCase();
    if (lowerRp.includes("unsafe-url")) {
      addFinding({
        title: "Insecure Referrer-Policy Configuration",
        description:
          'Referrer-Policy is configured with "unsafe-url", which leaks full URLs including sensitive query parameters.',
        severity: "low",
        remediation:
          'Configure Referrer-Policy to "strict-origin-when-cross-origin" or "no-referrer".',
        headerName: "referrer-policy",
      });
    }
  }

  return { findings, evidence };
};
