// STATUS: UPDATED
// File: src/scanners/jwt/signatureChecks.js

import { calculateConfidence } from "../shared/confidence.js";
import { normalizeFinding } from "../shared/findingNormalizer.js";

export const evaluateJwtSignature = (token) => {
  const findings = [];
  const parts = String(token).split(".");

  if (parts.length !== 3) {
    findings.push(
      normalizeFinding({
        scannerId: "security.jwt",
        title: "Malformed JWT Token Structure",
        description:
          "A detected JWT token does not adhere to the standard three-part (header.payload.signature) structure.",
        severity: "low",
        confidence: calculateConfidence({ confirmed: true }),
        remediation:
          "Ensure JWT tokens are formatted correctly according to RFC 7519.",
        category: "jwt",
        metadata: { partsCount: parts.length },
      }),
    );
    return { findings, hasSignature: false };
  }

  const [, , signature] = parts;
  const hasSignature = signature.trim().length > 0;

  if (!hasSignature) {
    findings.push(
      normalizeFinding({
        scannerId: "security.jwt",
        title: "Unsigned JWT Token (Empty Signature)",
        description:
          "A detected JWT token has an empty signature part, allowing potential token forgery.",
        severity: "high",
        confidence: calculateConfidence({ confirmed: true }),
        remediation: "Enforce cryptographic signatures on all JSON Web Tokens.",
        category: "jwt",
        metadata: { emptySignature: true },
      }),
    );
  }

  return { findings, hasSignature };
};
