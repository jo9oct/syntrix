// STATUS: UPDATED
// File: src/scanners/openRedirect/scanner.js

import {
  createSecurityScanner,
  getTargetUrl,
} from "../shared/scannerContract.js";
import { getParameters } from "../shared/parameterTester.js";
import { getPayloads } from "../shared/payloadManager.js";
import { assertSafeUrl } from "../../recon/shared/resolver.js";
import { runConcurrent } from "../../utils/concurrency.js";
import { testRedirectParameter } from "./parameterTests.js";

const MAX_TESTED_PARAMETERS = 5;

const scanner = createSecurityScanner({
  id: "security.open-redirect",
  name: "Open Redirect",
  description:
    "Checks whether URL parameters control redirects to an external test domain using parameter testing and redirect validation.",

  async run(context) {
    const targetUrl = getTargetUrl(context);

    await assertSafeUrl(targetUrl);

    const parameters = getParameters(targetUrl).slice(0, MAX_TESTED_PARAMETERS);

    const payload = getPayloads("openRedirect")[0];

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

        const result = await testRedirectParameter({
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
        redirectDetected: findings.length > 0,
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
