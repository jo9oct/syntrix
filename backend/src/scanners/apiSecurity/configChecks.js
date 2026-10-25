// STATUS: UPDATED
// File: src/scanners/apiSecurity/configChecks.js

import { calculateConfidence } from "../shared/confidence.js";
import { normalizeFinding } from "../shared/findingNormalizer.js";

const DEBUG_HEADERS = [
  "x-debug-token",
  "x-debug-token-link",
  "x-aspnet-version",
  "x-powered-by",
];

export const checkApiConfiguration = (headers = {}) => {
  const findings = [];
  const lowerHeaders = Object.keys(headers).map((k) => k.toLowerCase());

  for (const debugHeader of DEBUG_HEADERS) {
    if (lowerHeaders.includes(debugHeader)) {
      findings.push(
        normalizeFinding({
          scannerId: "security.api-security",
          title: `API Exposes Debug/Banner Header (${debugHeader})`,
          description: `The API response reveals internal platform or debug information via header "${debugHeader}: ${headers[debugHeader]}".`,
          severity: "low",
          confidence: calculateConfidence({ confirmed: true }),
          remediation: `Remove the "${debugHeader}" header from production API responses.`,
          category: "api-security",
          metadata: {
            header: debugHeader,
            value: headers[debugHeader],
            check: "config-checks",
          },
        }),
      );
    }
  }

  return { findings };
};

