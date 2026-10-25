// STATUS: UPDATED
// File: src/scanners/csrf/requestValidation.js

import { calculateConfidence } from "../shared/confidence.js";
import { normalizeFinding } from "../shared/findingNormalizer.js";

export const evaluateRequestValidation = (forms = []) => {
  const findings = [];

  for (const form of forms) {
    // Check if form uses GET for potentially state-altering actions (e.g. delete, update, logout)
    const isGet =
      /\bmethod\s*=\s*["']?get/i.test(form) || !/\bmethod\s*=/i.test(form);
    const hasSensitiveAction =
      /\baction\s*=\s*["'][^"']*(?:delete|remove|update|transfer|logout|password)[^"']*["']/i.test(
        form,
      );

    if (isGet && hasSensitiveAction) {
      findings.push(
        normalizeFinding({
          scannerId: "security.csrf",
          title: "Sensitive Action Invoked via HTTP GET Form",
          description:
            "A form performing a sensitive action (delete, update, transfer, logout) uses HTTP GET instead of a state-changing method with anti-CSRF tokens.",
          severity: "medium",
          confidence: calculateConfidence({ confirmed: true }),
          remediation:
            "Change state-altering operations to use HTTP POST/PUT/DELETE with CSRF token validation.",
          category: "csrf",
          metadata: {
            detection: "sensitive-action-via-get",
          },
        }),
      );
      break;
    }
  }

  return { findings };
};
