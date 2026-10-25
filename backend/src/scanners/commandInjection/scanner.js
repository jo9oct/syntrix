// STATUS: UPDATED
// File: src/scanners/commandInjection/scanner.js

import {
  createSecurityScanner,
  getTargetUrl,
} from "../shared/scannerContract.js";
import { getParameters } from "../shared/parameterTester.js";
import { assertSafeUrl } from "../../recon/shared/resolver.js";
import { runConcurrent } from "../../utils/concurrency.js";
import { checkErrorBasedCommandInjection } from "./errorBased.js";
import { checkTimeBasedCommandInjection } from "./timeBased.js";

const MAX_PARAMETERS = 5;

const scanner = createSecurityScanner({
  id: "security.command-injection",
  name: "Command Injection Surface",
  description:
    "Performs command-injection assessment using error-based and time-based detection techniques.",

  async run(context) {
    const targetUrl = getTargetUrl(context);

    await assertSafeUrl(targetUrl);

    const parameters = getParameters(targetUrl);
    const testedParameters = parameters.slice(0, MAX_PARAMETERS);

    const findings = [];
    const evidence = [];

    const requestHeaders = context?.session?.getHeaders?.() ?? {};

    await runConcurrent(
      testedParameters,
      10,
      async (parameter) => {
        if (context?.signal?.aborted) {
          return;
        }

        // 1. Error-based & reflected marker detection
        const errorRes = await checkErrorBasedCommandInjection({
          targetUrl,
          parameter,
          context,
          requestHeaders,
        });

        findings.push(...errorRes.findings);
        evidence.push(...errorRes.evidence);

        // 2. Time-based blind command injection check (if not already flagged as high/critical)
        if (
          !context?.signal?.aborted &&
          !errorRes.findings.some((f) => f.severity === "critical")
        ) {
          const timeRes = await checkTimeBasedCommandInjection({
            targetUrl,
            parameter,
            context,
            requestHeaders,
          });

          findings.push(...timeRes.findings);
          evidence.push(...timeRes.evidence);
        }
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
