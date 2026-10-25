// STATUS: UPDATED
// File: src/scanners/cors/scanner.js

import {
  createSecurityScanner,
  getTargetUrl,
} from "../shared/scannerContract.js";
import { assertSafeUrl } from "../../recon/shared/resolver.js";
import { checkOriginReflection, TEST_ORIGINS } from "./originValidation.js";
import { evaluateCredentialHandling } from "./credentials.js";
import { evaluateCorsPolicy } from "./policyChecks.js";

const scanner = createSecurityScanner({
  id: "security.cors",
  name: "CORS Security",
  description: "Checks for unsafe cross-origin response configuration.",

  async run(context) {
    const targetUrl = getTargetUrl(context);

    await assertSafeUrl(targetUrl);

    if (context?.signal?.aborted) {
      return {
        data: {
          testedOrigin: TEST_ORIGINS.ARBITRARY,
          allowOrigin: null,
          allowCredentials: false,
        },
        findings: [],
        evidence: [],
        fingerprints: [],
        verificationRecords: [],
        metadata: {
          cancelled: true,
          requestsTested: 0,
        },
      };
    }

    // 1. Origin validation: test arbitrary origin reflection
    const arbitraryResult = await checkOriginReflection({
      targetUrl,
      context,
      testOrigin: TEST_ORIGINS.ARBITRARY,
    });

    const allowOrigin = arbitraryResult.allowOrigin;
    const allowCredentials =
      arbitraryResult.response.headers?.["access-control-allow-credentials"];

    // 2. Credential handling check
    const credResult = evaluateCredentialHandling({
      testOrigin: TEST_ORIGINS.ARBITRARY,
      allowOrigin,
      allowCredentials,
      response: arbitraryResult.response,
    });

    // 3. Policy misconfiguration checks
    const policyResult = evaluateCorsPolicy({
      allowOrigin,
      responseHeaders: arbitraryResult.response.headers ?? {},
    });

    const findings = [
      ...arbitraryResult.findings,
      ...credResult.findings,
      ...policyResult.findings,
    ];

    const evidence = [...arbitraryResult.evidence];

    return {
      data: {
        testedOrigin: TEST_ORIGINS.ARBITRARY,
        allowOrigin: allowOrigin ?? null,
        allowCredentials: credResult.allowCredentials,
      },
      findings,
      evidence,
      fingerprints: [],
      verificationRecords: [],
      metadata: {
        cancelled: context?.signal?.aborted === true,
        requestsTested: 1,
      },
    };
  },
});

export default scanner;
