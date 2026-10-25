// STATUS: UPDATED
// File: src/scanners/apiSecurity/scanner.js

import {
  createSecurityScanner,
  getTargetUrl,
} from "../shared/scannerContract.js";
import { assertSafeUrl } from "../../recon/shared/resolver.js";
import { checkApiEndpoints } from "./endpointChecks.js";
import { checkApiAuthorization } from "./authChecks.js";
import { checkApiInputValidation } from "./inputValidation.js";
import { checkApiConfiguration } from "./configChecks.js";

const scanner = createSecurityScanner({
  id: "security.api-security",
  name: "API Security",
  description:
    "Performs bounded API assessment across endpoints, authorization, input validation, and configuration checks.",

  async run(context) {
    const targetUrl = getTargetUrl(context);

    await assertSafeUrl(targetUrl);

    const requestHeaders = context?.session?.getHeaders?.() ?? {};

    // 1. Endpoint checks (documentation and endpoint discovery)
    const endpointResult = await checkApiEndpoints({
      targetUrl,
      context,
      requestHeaders,
    });

    // 2. Authorization checks
    let authResult = { findings: [], evidence: [] };
    if (!context?.signal?.aborted) {
      authResult = await checkApiAuthorization({
        targetUrl,
        context,
      });
    }

    // 3. Input validation checks
    let inputResult = { findings: [], evidence: [] };
    if (!context?.signal?.aborted) {
      inputResult = await checkApiInputValidation({
        targetUrl,
        context,
        requestHeaders,
      });
    }

    // 4. Configuration checks
    const configResult = checkApiConfiguration(requestHeaders);

    const findings = [
      ...endpointResult.findings,
      ...authResult.findings,
      ...inputResult.findings,
      ...configResult.findings,
    ];

    const evidence = [
      ...endpointResult.evidence,
      ...authResult.evidence,
      ...inputResult.evidence,
    ];

    return {
      data: {
        endpoints: endpointResult.results,
      },
      findings,
      evidence,
      fingerprints: [],
      verificationRecords: [],
      metadata: {
        cancelled: context?.signal?.aborted === true,
        endpointsTested: endpointResult.results.length,
      },
    };
  },
});

export default scanner;
