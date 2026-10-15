import { get } from "../../request/request.js";

import { createSecurityEvidence } from "../shared/evidenceBuilder.js";

import { calculateConfidence } from "../shared/confidence.js";

import { normalizeFinding } from "../shared/findingNormalizer.js";

import {
  createSecurityScanner,
  getTargetUrl,
} from "../shared/scannerContract.js";

import { assertSafeUrl } from "../../recon/shared/resolver.js";

const getForms = (body) => {
  if (typeof body !== "string") {
    return [];
  }

  return [...body.matchAll(/<form\b[\s\S]*?<\/form>/gi)]
    .map((match) => match[0])
    .slice(0, 20);
};

const hasCsrfToken = (form) =>
  /csrf|xsrf|authenticity|requesttoken/i.test(form);

const hasStateChangingMethod = (form) =>
  /\bmethod\s*=\s*["']?(post|put|patch|delete)/i.test(form);

const scanner = createSecurityScanner({
  id: "security.csrf",

  name: "CSRF Protection",

  description: "Performs a passive assessment of form-based CSRF protections.",

  async run(context) {
    const targetUrl = getTargetUrl(context);

    await assertSafeUrl(targetUrl);

    const response = await get(targetUrl, {
      signal: context?.signal,

      headers: context?.session?.getHeaders?.() ?? {},
    });

    const forms = getForms(response.data);

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
            stateChangingForms: stateChangingForms.length,

            unprotectedForms: unprotectedForms.length,
          },
        }),
      );
    }

    return {
      data: {
        forms: forms.length,

        stateChangingForms: stateChangingForms.length,

        unprotectedForms: unprotectedForms.length,
      },

      findings,

      evidence: [
        createSecurityEvidence({
          request: {
            method: "GET",

            url: targetUrl,

            headers: context?.session?.getHeaders?.() ?? {},
          },

          response: {
            status: response.status,

            statusText: response.statusText,

            headers: response.headers,

            body: response.data,

            contentType: response.headers?.["content-type"],
          },
        }),
      ],
    };
  },
});

export default scanner;
