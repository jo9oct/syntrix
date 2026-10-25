// STATUS: UPDATED
// File: src/scanners/csrf/cookieProtections.js

import { calculateConfidence } from "../shared/confidence.js";
import { normalizeFinding } from "../shared/findingNormalizer.js";

export const evaluateCookieSameSite = (headers) => {
  const setCookie = headers?.["set-cookie"];
  if (!setCookie) {
    return { findings: [] };
  }

  const cookieStrings = Array.isArray(setCookie) ? setCookie : [setCookie];
  const findings = [];

  for (const cookieStr of cookieStrings) {
    const isSessionCookie = /session|sess|sid|token|auth|jwt|id/i.test(
      cookieStr,
    );

    const hasSameSite = /;\s*samesite\s*=\s*(strict|lax|none)/i.test(cookieStr);
    const hasSameSiteNone = /;\s*samesite\s*=\s*none/i.test(cookieStr);
    const hasSecure = /;\s*secure/i.test(cookieStr);

    if (isSessionCookie && !hasSameSite) {
      findings.push(
        normalizeFinding({
          scannerId: "security.csrf",
          title: "Session Cookie Missing SameSite Protection",
          description:
            "A sensitive session cookie was set without the SameSite attribute, increasing vulnerability to Cross-Site Request Forgery (CSRF).",
          severity: "low",
          confidence: calculateConfidence({ confirmed: true }),
          remediation:
            "Set SameSite=Lax or SameSite=Strict on all sensitive session cookies.",
          category: "csrf",
          metadata: {
            detection: "cookie-missing-samesite",
          },
        }),
      );
      break;
    } else if (isSessionCookie && hasSameSiteNone && !hasSecure) {
      findings.push(
        normalizeFinding({
          scannerId: "security.csrf",
          title: "Insecure SameSite=None Cookie Without Secure Flag",
          description:
            "A cookie specifies SameSite=None without the Secure flag, which modern browsers reject and creates CSRF risks.",
          severity: "medium",
          confidence: calculateConfidence({ confirmed: true }),
          remediation:
            "Cookies with SameSite=None must also include the Secure flag.",
          category: "csrf",
          metadata: {
            detection: "samesite-none-without-secure",
          },
        }),
      );
      break;
    }
  }

  return { findings };
};
