// STATUS: UPDATED
// File: src/scanners/openRedirect/scanner.js

import { get } from "../../request/request.js";
import { getAuthenticatedRequestOptions } from "../../request/authenticatedRequestOptions.js";
import { createSecurityEvidence } from "../shared/evidenceBuilder.js";
import { calculateConfidence } from "../shared/confidence.js";
import { normalizeFinding } from "../shared/findingNormalizer.js";
import {
  createSecurityScanner,
  getTargetUrl,
} from "../shared/scannerContract.js";
import { getParameters, setParameter } from "../shared/parameterTester.js";
import { getPayloads } from "../shared/payloadManager.js";
import { assertSafeUrl } from "../../recon/shared/resolver.js";
import { runConcurrent } from "../../utils/concurrency.js";

const MAX_TESTED_PARAMETERS = 5;

const scanner = createSecurityScanner({
  id: "security.open-redirect",
  name: "Open Redirect",
  description:
    "Checks whether URL parameters control redirects to an external test domain.",

  async run(context) {
    const targetUrl = getTargetUrl(context);

    await assertSafeUrl(targetUrl);

    const parameters = getParameters(targetUrl).slice(0, MAX_TESTED_PARAMETERS);

    const payload = getPayloads("openRedirect")[0];

    const requestHeaders = context?.session?.getHeaders?.() ?? {};

    const authenticatedRequestOptions = getAuthenticatedRequestOptions(context);

    const findings = [];
    const evidence = [];

    await runConcurrent(
      parameters,
      10,
      async (parameter) => {
        if (context?.signal?.aborted) {
          return;
        }

        const testUrl = setParameter(targetUrl, parameter, payload);

        await assertSafeUrl(testUrl);

        const response = await get(testUrl, {
          signal: context?.signal,
          headers: requestHeaders,
          maxRedirects: 0,
          validateStatus: () => true,
          ...authenticatedRequestOptions,
        });

        const location = response.headers?.location;

        if (typeof location === "string" && location.startsWith(payload)) {
          findings.push(
            normalizeFinding({
              scannerId: "security.open-redirect",
              title: "Potential Open Redirect",
              description: `The parameter "${parameter}" influenced a redirect toward the controlled external test domain.`,
              severity: "medium",
              confidence: calculateConfidence({
                confirmed: false,
              }),
              remediation:
                "Use allowlisted redirect destinations or server-side route identifiers. Validate redirect destinations after resolving relative URLs.",
              category: "open-redirect",
              metadata: {
                parameter,
                redirectLocationRedacted: true,
              },
            }),
          );

          evidence.push(
            createSecurityEvidence({
              request: {
                method: "GET",
                url: testUrl,
                headers: {
                  ...requestHeaders,
                },
              },
              response: {
                status: response.status,
                statusText: response.statusText,
                headers: response.headers,
              },
              parameter,
              payload,
              confidence: "medium",
              description: `The parameter "${parameter}" influenced a redirect toward the controlled external test domain.`,
              metadata: {
                parameter,
                payload,
                redirectLocationRedacted: true,
              },
            }),
          );
        }
      },
      context?.signal,
    );

    return {
      data: {
        testedParameters: parameters,
        redirectDetected: findings.length > 0,
      },
      findings,
      evidence,
      fingerprints: [],
      verificationRecords: [],
      metadata: {
        cancelled: context?.signal?.aborted === true,
        requestsTested: evidence.length,
      },
    };
  },
});

export default scanner;
