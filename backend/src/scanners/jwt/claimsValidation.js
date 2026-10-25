// STATUS: UPDATED
// File: src/scanners/jwt/claimsValidation.js

import { calculateConfidence } from "../shared/confidence.js";
import { normalizeFinding } from "../shared/findingNormalizer.js";

const decodeBase64Url = (str) => {
  try {
    const base64 = str.replace(/-/g, "+").replace(/_/g, "/");
    const jsonStr = Buffer.from(base64, "base64").toString("utf-8");
    return JSON.parse(jsonStr);
  } catch {
    return null;
  }
};

export const evaluateJwtClaims = (token) => {
  const findings = [];
  const parts = String(token).split(".");

  if (parts.length < 2) {
    return { findings, payload: null };
  }

  const payload = decodeBase64Url(parts[1]);
  if (!payload) {
    return { findings, payload: null };
  }

  // Check expiration claim
  if (payload.exp == null) {
    findings.push(
      normalizeFinding({
        scannerId: "security.jwt",
        title: "JWT Missing Expiration Claim ('exp')",
        description:
          "A detected JWT token does not specify an expiration timestamp ('exp'), potentially allowing tokens to remain valid indefinitely.",
        severity: "medium",
        confidence: calculateConfidence({ confirmed: true }),
        remediation: "Always set an appropriate 'exp' timestamp on JWTs.",
        category: "jwt",
        metadata: { missingExp: true },
      }),
    );
  }

  // Check for sensitive fields leaked in claims
  const keys = Object.keys(payload).map((k) => k.toLowerCase());
  const hasSensitiveKey = keys.some((k) =>
    ["password", "pass", "pwd", "secret", "private_key", "ssn"].includes(k),
  );

  if (hasSensitiveKey) {
    findings.push(
      normalizeFinding({
        scannerId: "security.jwt",
        title: "Sensitive Credential Leaked in JWT Payload",
        description:
          "A detected JWT token payload contains sensitive credential field names. JWT payloads are unencrypted and readable by anyone possessing the token.",
        severity: "high",
        confidence: calculateConfidence({ confirmed: true }),
        remediation:
          "Never store passwords, secrets, or sensitive personal data in unencrypted JWT claims.",
        category: "jwt",
        metadata: { sensitiveClaimDetected: true },
      }),
    );
  }

  return { findings, payload };
};
