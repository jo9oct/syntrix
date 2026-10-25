// STATUS: UPDATED
// File: src/scanners/commandInjection/timeBased.js

import { get } from "../../request/request.js";
import { getAuthenticatedRequestOptions } from "../../request/authenticatedRequestOptions.js";
import { createSecurityEvidence } from "../shared/evidenceBuilder.js";
import { calculateConfidence } from "../shared/confidence.js";
import { normalizeFinding } from "../shared/findingNormalizer.js";
import { setParameter } from "../shared/parameterTester.js";
import { assertSafeUrl } from "../../recon/shared/resolver.js";

const TIME_PROBES = [";sleep 3;", "& timeout /t 3 &"];

const DELAY_THRESHOLD_MS = 2500;

export const checkTimeBasedCommandInjection = async ({
  targetUrl,
  parameter,
  context,
  requestHeaders = {},
  baselineDurationMs = 200,
}) => {
  const findings = [];
  const evidence = [];
  const authenticatedRequestOptions = getAuthenticatedRequestOptions(context);

  for (const probe of TIME_PROBES) {
    if (context?.signal?.aborted) {
      break;
    }

    const testUrl = setParameter(targetUrl, parameter, probe);
    await assertSafeUrl(testUrl);

    const startTime = Date.now();
    try {
      const response = await get(testUrl, {
        signal: context?.signal,
        headers: requestHeaders,
        ...authenticatedRequestOptions,
      });

      const elapsedMs = Date.now() - startTime;

      if (elapsedMs - baselineDurationMs >= DELAY_THRESHOLD_MS) {
        findings.push(
          normalizeFinding({
            scannerId: "security.command-injection",
            title: "Potential Time-Based Blind Command Injection",
            description: `The application took ${elapsedMs}ms to respond to a command delay probe on parameter "${parameter}" (baseline ~${baselineDurationMs}ms).`,
            severity: "critical",
            confidence: calculateConfidence({
              confirmed: false,
            }),
            remediation:
              "Avoid shell execution of untrusted input. Validate and strictly sanitize parameters against safe allowlists.",
            category: "command-injection",
            metadata: {
              parameter,
              technique: "time-based",
              elapsedMs,
              baselineDurationMs,
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
            },
            parameter,
            payload: probe,
            confidence: "medium",
            description: `Observed response delay of ${elapsedMs}ms with time-based probe.`,
            metadata: {
              parameter,
              payload: probe,
              technique: "time-based",
              elapsedMs,
            },
          }),
        );

        break;
      }
    } catch {
      // Timeouts or network errors
    }
  }

  return { findings, evidence };
};
