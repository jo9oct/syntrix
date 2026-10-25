// STATUS: UPDATED
// File: src/scanners/jwt/algorithmChecks.js

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

export const evaluateJwtAlgorithm = (token) => {
  const findings = [];
  const parts = String(token).split(".");

  if (parts.length < 2) {
    return { findings, header: null };
  }

  const header = decodeBase64Url(parts[0]);
  if (!header) {
    return { findings, header: null };
  }

  const alg = String(header.alg ?? "").toLowerCase();

  if (alg === "none") {
    findings.push(
      normalizeFinding({
        scannerId: "security.jwt",
        title: "Insecure JWT 'none' Algorithm",
        description:
          "A detected JWT token explicitly specifies the 'none' algorithm, disabling signature verification.",
        severity: "critical",
        confidence: calculateConfidence({ confirmed: true }),
        remediation:
          "Reject tokens specifying 'none' algorithm and mandate strong signing algorithms like RS256 or ES256.",
        category: "jwt",
        metadata: { algorithm: "none" },
      }),
    );
  }

  return { findings, header, algorithm: header.alg };
};
