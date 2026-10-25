// STATUS: UPDATED
// File: src/scanners/csrf/scanner.js

import { get } from "../../request/request.js";
import { getAuthenticatedRequestOptions } from "../../request/authenticatedRequestOptions.js";
import { createSecurityEvidence } from "../shared/evidenceBuilder.js";
import {
  createSecurityScanner,
  getTargetUrl,
} from "../shared/scannerContract.js";
import { assertSafeUrl } from "../../recon/shared/resolver.js";
import { getForms, validateFormTokens } from "./tokenValidation.js";
import { evaluateCookieSameSite } from "./cookieProtections.js";
import { evaluateRequestValidation } from "./requestValidation.js";

const scanner = createSecurityScanner({
  id: "security.csrf",
  name: "CSRF Protection",
  description:
    "Performs passive and structural assessment of form tokens, cookie protections, and request validation.",

  async run(context) {
    const targetUrl = getTargetUrl(context);

    await assertSafeUrl(targetUrl);

    const requestHeaders = context?.session?.getHeaders?.() ?? {};
    const authenticatedRequestOptions = getAuthenticatedRequestOptions(context);

    const response = await get(targetUrl, {
      signal: context?.signal,
      headers: requestHeaders,
      ...authenticatedRequestOptions,
    });

    const forms = getForms(response.data);

    // 1. Token validation
    const tokenResult = validateFormTokens(forms);

    // 2. Cookie protections
    const cookieResult = evaluateCookieSameSite(response.headers);

    // 3. Request validation
    const reqResult = evaluateRequestValidation(forms);

    const findings = [
      ...tokenResult.findings,
      ...cookieResult.findings,
      ...reqResult.findings,
    ];

    return {
      data: {
        forms: forms.length,
        stateChangingForms: tokenResult.stateChangingForms.length,
        unprotectedForms: tokenResult.unprotectedForms.length,
      },

      findings,

      evidence: [
        createSecurityEvidence({
          request: {
            method: "GET",
            url: targetUrl,
            headers: requestHeaders,
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
