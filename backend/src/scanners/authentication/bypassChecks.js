// STATUS: UPDATED
// File: src/scanners/authentication/bypassChecks.js

import { calculateConfidence } from "../shared/confidence.js";
import { normalizeFinding } from "../shared/findingNormalizer.js";

const SCANNER_ID = "security.authentication";

function makeFinding({ title, description, severity, remediation }) {
  return normalizeFinding({
    scannerId: SCANNER_ID,
    title,
    description,
    severity,
    confidence: calculateConfidence({
      confirmed: false,
    }),
    remediation,
    category: "authentication",
  });
}

export function evaluateUncontainedPasswordInputs({
  uncontainedInputs = [],
  addFinding,
}) {
  for (const input of uncontainedInputs) {
    if (input.autocomplete) {
      continue;
    }

    addFinding(
      makeFinding({
        title: "Password Field Missing Autocomplete Guidance",
        description:
          "A rendered password field outside a native form does not declare an autocomplete value. This is a configuration observation, not proof of an authentication bypass.",
        severity: "info",
        remediation:
          'Set autocomplete="current-password" for login fields or autocomplete="new-password" for password-creation fields.',
      }),
    );
  }
}

