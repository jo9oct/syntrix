// STATUS: UPDATED
// File: src/scanners/cors/policyChecks.js

import { calculateConfidence } from "../shared/confidence.js";
import { normalizeFinding } from "../shared/findingNormalizer.js";

export const evaluateCorsPolicy = ({ allowOrigin, responseHeaders = {} }) => {
  const findings = [];

  if (allowOrigin === "*") {
    findings.push(
      normalizeFinding({
        scannerId: "security.cors",
        title: "Wildcard CORS Policy",
        description:
          "The application exposes a wildcard Access-Control-Allow-Origin policy. Assess whether the accessible resources are intended to be public.",
        severity: "low",
        confidence: calculateConfidence({
          confirmed: false,
        }),
        remediation:
          "Restrict cross-origin access to trusted origins where appropriate.",
        category: "cors",
        metadata: {
          detection: "wildcard-allow-origin",
        },
      }),
    );
  }

  // Check for overly broad exposed headers (e.g., Authorization or sensitive session tokens)
  const exposedHeaders = responseHeaders["access-control-expose-headers"];
  if (exposedHeaders && typeof exposedHeaders === "string") {
    const lowerExposed = exposedHeaders.toLowerCase();
    if (
      lowerExposed.includes("authorization") ||
      lowerExposed.includes("set-cookie")
    ) {
      findings.push(
        normalizeFinding({
          scannerId: "security.cors",
          title: "Sensitive Header Exposed via CORS",
          description: `The application exposes sensitive headers (${exposedHeaders}) to cross-origin scripts via Access-Control-Expose-Headers.`,
          severity: "medium",
          confidence: calculateConfidence({ confirmed: true }),
          remediation:
            "Remove sensitive headers such as Authorization or Set-Cookie from Access-Control-Expose-Headers.",
          category: "cors",
          metadata: {
            detection: "exposed-sensitive-headers",
            exposedHeaders,
          },
        }),
      );
    }
  }

  return { findings };
};
