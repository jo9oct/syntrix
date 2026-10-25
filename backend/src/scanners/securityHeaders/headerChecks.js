// STATUS: UPDATED
// File: src/scanners/securityHeaders/headerChecks.js

import { createSecurityEvidence } from "../shared/evidenceBuilder.js";
import { calculateConfidence } from "../shared/confidence.js";
import { normalizeFinding } from "../shared/findingNormalizer.js";

export const REQUIRED_HEADERS = [
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

export const normalizeHeaders = (headers) =>
  Object.fromEntries(
    Object.entries(headers ?? {}).map(([key, value]) => [
      key.toLowerCase(),
      value,
    ]),
  );

export const hasHeader = (headers, name) => {
  const value = headers?.[name];

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

export const checkRequiredHeaders = ({
  headers,
  targetUrl,
  requestHeaders = {},
  status,
  response,
}) => {
  const present = REQUIRED_HEADERS.filter((item) =>
    hasHeader(headers, item.name),
  ).map((item) => item.name);

  const missing = REQUIRED_HEADERS.filter(
    (item) => !hasHeader(headers, item.name),
  ).map((item) => item.name);

  const findings = [];
  const evidence = [];

  for (const required of REQUIRED_HEADERS) {
    if (hasHeader(headers, required.name)) {
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

  return { present, missing, findings, evidence };
};

