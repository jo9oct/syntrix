// STATUS: UPDATED
// File: src/scanners/csrf/tokenValidation.js

import { calculateConfidence } from "../shared/confidence.js";
import { normalizeFinding } from "../shared/findingNormalizer.js";

export const getForms = (body) => {
  if (typeof body !== "string") {
    return [];
  }

  return [...body.matchAll(/<form\b[\s\S]*?<\/form>/gi)]
    .map((match) => match[0])
    .slice(0, 20);
};

export const hasCsrfToken = (form) =>
  /csrf|xsrf|authenticity|requesttoken|_token/i.test(form);

export const hasStateChangingMethod = (form) =>
  /\bmethod\s*=\s*["']?(post|put|patch|delete)/i.test(form);

export const validateFormTokens = (forms) => {
  const stateChangingForms = forms.filter(hasStateChangingMethod);
  const unprotectedForms = stateChangingForms.filter(
    (form) => !hasCsrfToken(form),
  );

  const findings = [];

  if (unprotectedForms.length > 0) {
    findings.push(
      normalizeFinding({
        scannerId: "security.csrf",
        title: "Potential Missing CSRF Protection",
        description:
          "A state-changing form was identified without an apparent CSRF token.",
        severity: "medium",
        confidence: calculateConfidence({
          confirmed: true,
        }),
        remediation:
          "Use framework-provided CSRF protection or an equivalent anti-CSRF mechanism for state-changing requests.",
        category: "csrf",
        metadata: {
          detection: "missing-form-csrf-token",
          stateChangingForms: stateChangingForms.length,
          unprotectedForms: unprotectedForms.length,
        },
      }),
    );
  }

  return {
    stateChangingForms,
    unprotectedForms,
    findings,
  };
};

