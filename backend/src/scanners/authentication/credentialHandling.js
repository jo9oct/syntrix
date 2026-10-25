// STATUS: UPDATED
// File: src/scanners/authentication/credentialHandling.js

import { calculateConfidence } from "../shared/confidence.js";
import { normalizeFinding } from "../shared/findingNormalizer.js";
import { safeUrl } from "./loginChecks.js";

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

export function evaluateFormCredentialHandling({
  form,
  parsedPageUrl,
  addFinding,
}) {
  if (form.passwordInputs.length === 0) {
    return;
  }

  const formAction = form.action
    ? safeUrl(form.action, parsedPageUrl.href)
    : null;

  const transportIsInsecure =
    parsedPageUrl.protocol !== "https:" ||
    !formAction ||
    formAction.protocol !== "https:";

  if (transportIsInsecure) {
    addFinding(
      makeFinding({
        title: "Password Form Uses Insecure HTTP",
        description:
          "A rendered password form is served over HTTP, has an invalid action, or submits over HTTP. Verify the form's intended destination; the scanner did not submit it.",
        severity: "high",
        remediation:
          "Serve authentication pages exclusively over HTTPS and ensure password forms submit only to trusted HTTPS endpoints. Configure HSTS where appropriate.",
      }),
    );
  }

  if (form.method === "get") {
    addFinding(
      makeFinding({
        title: "Password Form Uses GET Method",
        description:
          "A rendered password form uses GET, which may expose submitted values in URLs, browser history, or logs. The scanner did not submit the form.",
        severity: "high",
        remediation:
          "Use POST for password forms and protect authentication traffic with HTTPS.",
      }),
    );
  }

  if (!formAction) {
    addFinding(
      makeFinding({
        title: "Password Form Has an Invalid Action",
        description:
          "A rendered password form has an invalid or unresolved action URL. Review the form configuration.",
        severity: "medium",
        remediation:
          "Configure a valid, explicitly trusted HTTPS authentication destination.",
      }),
    );
  }

  for (const input of form.passwordInputs) {
    if (input.autocomplete) {
      continue;
    }

    addFinding(
      makeFinding({
        title: "Password Field Missing Autocomplete Guidance",
        description:
          "A rendered password field does not declare an autocomplete value. This is a configuration observation, not proof of an authentication bypass.",
        severity: "info",
        remediation:
          'Set autocomplete="current-password" for login fields or autocomplete="new-password" for password-creation fields.',
      }),
    );
  }
}

