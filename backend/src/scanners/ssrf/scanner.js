// STATUS: UPDATED
// File: src/scanners/ssrf/scanner.js

import {
  createSecurityScanner,
  getTargetUrl,
} from "../shared/scannerContract.js";
import { getParameters } from "../shared/parameterTester.js";
import { getPayloads } from "../shared/payloadManager.js";
import { assertSafeUrl } from "../../recon/shared/resolver.js";
import { runConcurrent } from "../../utils/concurrency.js";
import { testUrlInput } from "./urlInputTests.js";

const MAX_PARAMETERS = 5;

const scanner = createSecurityScanner({
  id: "security.ssrf",
  name: "SSRF Surface Detection",
  description:
    "Checks URL-like parameters for behavior suggesting server-side URL retrieval using controlled URL input testing and response verification.",

  async run(context) {
    const targetUrl = getTargetUrl(context);

    await assertSafeUrl(targetUrl);

    const parameters = getParameters(targetUrl).slice(0, MAX_PARAMETERS);

    const payload = getPayloads("ssrf")[0];

    const requestHeaders = context?.session?.getHeaders?.() ?? {};

    const findings = [];
    const evidence = [];
    let requestsTested = 0;

    await runConcurrent(
      parameters,
      10,
      async (parameter) => {
        if (context?.signal?.aborted) {
          return;
        }

        const result = await testUrlInput({
          targetUrl,
          parameter,
          payload,
          context,
          requestHeaders,
        });

        requestsTested += 1;

        if (result.finding) {
          findings.push(result.finding);
        }
        if (result.evidence) {
          evidence.push(result.evidence);
        }
      },
      context?.signal,
    );

    return {
      data: {
        testedParameters: parameters,
        possibleUrlRetrieval: findings.length > 0,
      },
      findings,
      evidence,
      fingerprints: [],
      verificationRecords: [],
      metadata: {
        cancelled: context?.signal?.aborted === true,
        requestsTested,
      },
    };
  },
});

export default scanner;
