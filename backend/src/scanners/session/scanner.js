// STATUS: UPDATED
// File: src/scanners/session/scanner.js

import { get } from "../../request/request.js";
import { getAuthenticatedRequestOptions } from "../../request/authenticatedRequestOptions.js";
import { createSecurityEvidence } from "../shared/evidenceBuilder.js";
import {
  createSecurityScanner,
  getTargetUrl,
} from "../shared/scannerContract.js";
import { assertSafeUrl } from "../../recon/shared/resolver.js";
import { parseSetCookie, checkCookieAttributes } from "./cookieAttributes.js";
import { checkSessionLifecycle } from "./lifecycleChecks.js";
import { checkSessionFixation } from "./fixationChecks.js";

const scanner = createSecurityScanner({
  id: "security.session",
  name: "Session Security",
  description:
    "Checks Set-Cookie security attributes, session lifecycle, and session fixation indicators.",

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

    const cookies = parseSetCookie(response.headers);

    // 1. Cookie attributes check
    const attrResult = checkCookieAttributes(cookies);

    // 2. Session lifecycle check
    const lifecycleResult = checkSessionLifecycle(cookies);

    // 3. Session fixation check
    const fixationResult = checkSessionFixation({
      targetUrl,
      responseBody: response.data,
    });

    const findings = [
      ...attrResult.findings,
      ...lifecycleResult.findings,
      ...fixationResult.findings,
    ];

    return {
      data: {
        cookies,
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
          },
          metadata: {
            cookieValuesRedacted: true,
          },
        }),
      ],
      fingerprints: [],
      verificationRecords: [],
      metadata: {
        cancelled: context?.signal?.aborted === true,
        cookiesInspected: cookies.length,
        requestsTested: 1,
      },
    };
  },
});

export default scanner;
