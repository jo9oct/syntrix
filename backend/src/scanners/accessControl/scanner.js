// STATUS: UPDATED
// File: src/scanners/accessControl/scanner.js

import {
  createSecurityScanner,
  getTargetUrl,
} from "../shared/scannerContract.js";
import { assertSafeUrl } from "../../recon/shared/resolver.js";
import { SENSITIVE_PATHS, checkSensitiveEndpoints } from "./authBypass.js";
import { checkPrivilegeOverrideHeaders } from "./privilegeChecks.js";

const scanner = createSecurityScanner({
  id: "security.access-control",
  name: "Access Control",
  description:
    "Performs a bounded access-control surface assessment including authorization bypass and privilege checks.",

  async run(context) {
    const targetUrl = getTargetUrl(context);

    await assertSafeUrl(targetUrl);

    const requestHeaders = context?.session?.getHeaders?.() ?? {};

    // 1. Check sensitive administrative endpoints
    const authBypassResult = await checkSensitiveEndpoints({
      targetUrl,
      paths: SENSITIVE_PATHS,
      context,
      requestHeaders,
    });

    // 2. Check privilege override headers
    let privilegeResult = { findings: [], evidence: [] };
    if (!context?.signal?.aborted) {
      privilegeResult = await checkPrivilegeOverrideHeaders({
        targetUrl,
        context,
        requestHeaders,
      });
    }

    const findings = [
      ...authBypassResult.findings,
      ...privilegeResult.findings,
    ];

    const evidence = [
      ...authBypassResult.evidence,
      ...privilegeResult.evidence,
    ];

    return {
      data: {
        testedPaths: authBypassResult.results,
      },
      findings,
      evidence,
      fingerprints: [],
      verificationRecords: [],
      metadata: {
        cancelled: context?.signal?.aborted === true,
        pathsTested: authBypassResult.results.length,
      },
    };
  },
});

export default scanner;
