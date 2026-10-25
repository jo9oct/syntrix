// STATUS: UPDATED
// File: src/scanners/commandInjection/scanner.js

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
import { getSafeMarker } from "../shared/payloadManager.js";
import { assertSafeUrl } from "../../recon/shared/resolver.js";
import { runConcurrent } from "../../utils/concurrency.js";

const MAX_PARAMETERS = 5;

const scanner = createSecurityScanner({
  id: "security.command-injection",
  name: "Command Injection Surface",
  description:
    "Performs a conservative command-injection surface assessment without executing commands.",

  async run(context) {
    const targetUrl = getTargetUrl(context);

    await assertSafeUrl(targetUrl);

    const parameters = getParameters(targetUrl);
    const testedParameters = parameters.slice(0, MAX_PARAMETERS);
    const marker = `${getSafeMarker()}-command`;

    const findings = [];
    const evidence = [];

    const requestHeaders = context?.session?.getHeaders?.() ?? {};

    const authenticatedRequestOptions = getAuthenticatedRequestOptions(context);

    await runConcurrent(
      testedParameters,
      10,
      async (parameter) => {
        if (context?.signal?.aborted) {
          return;
        }

        const testUrl = setParameter(targetUrl, parameter, marker);

        await assertSafeUrl(testUrl);

        const response = await get(testUrl, {
          signal: context?.signal,
          headers: requestHeaders,
          ...authenticatedRequestOptions,
        });

        const body = typeof response.data === "string" ? response.data : "";

        if (!body.includes(marker)) {
          return;
        }

        findings.push(
          normalizeFinding({
            scannerId: "security.command-injection",
            title: "Potential Command Processing Input Surface",
            description: `A controlled marker was reflected in the response for parameter "${parameter}". Reflection alone does not confirm operating-system command execution or command injection.`,
            severity: "medium",
            confidence: calculateConfidence({
              confirmed: false,
            }),
            remediation:
              "Avoid shell interpretation of user input. Use safe process APIs, strict input validation, and allowlisted values where appropriate.",
            category: "command-injection",
            metadata: {
              parameter,
              detection: "reflected-marker",
            },
          }),
        );

        evidence.push(
          createSecurityEvidence({
            request: {
              method: "GET",
              url: testUrl,
              headers: requestHeaders,
            },
            response: {
              status: response.status,
              statusText: response.statusText,
              headers: response.headers,
              body,
            },
            parameter,
            payload: marker,
            metadata: {
              marker: "[REDACTED]",
            },
          }),
        );
      },
      context?.signal,
    );

    return {
      data: {
        testedParameters,
        markerObserved: findings.length > 0,
      },
      findings,
      evidence,
      fingerprints: [],
      verificationRecords: [],
      metadata: {
        cancelled: context?.signal?.aborted === true,
        parametersTested: testedParameters.length,
      },
    };
  },
});

export default scanner;
