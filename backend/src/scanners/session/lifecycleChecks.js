// STATUS: UPDATED
// File: src/scanners/session/lifecycleChecks.js

import { calculateConfidence } from "../shared/confidence.js";
import { normalizeFinding } from "../shared/findingNormalizer.js";

const ONE_YEAR_SECONDS = 31536000;

export const checkSessionLifecycle = (cookies = []) => {
  const findings = [];

  for (const cookie of cookies) {
    const cookieName = cookie.name || "(unnamed cookie)";
    const isSessionCookie = /session|sess|sid|token|auth|jwt/i.test(cookieName);

    if (isSessionCookie && cookie.maxAge && cookie.maxAge > ONE_YEAR_SECONDS) {
      findings.push(
        normalizeFinding({
          scannerId: "security.session",
          title: "Excessive Session Cookie Lifetime",
          description: `Session cookie "${cookieName}" specifies a Max-Age of ${cookie.maxAge} seconds (> 1 year), increasing the window for session hijacking.`,
          severity: "low",
          confidence: calculateConfidence({ confirmed: true }),
          remediation:
            "Limit session cookie lifetimes to a reasonable operational window (e.g., hours or days).",
          category: "session",
          metadata: {
            cookieName,
            maxAge: cookie.maxAge,
            check: "session-lifecycle",
          },
        }),
      );
    }
  }

  return { findings };
};
