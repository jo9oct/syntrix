// STATUS: UPDATED
// File: src/scanners/pathTraversal/scanner.js

import {
  createSecurityScanner,
  getTargetUrl,
} from "../shared/scannerContract.js";
import { getParameters } from "../shared/parameterTester.js";
import { getPayloads } from "../shared/payloadManager.js";
import { assertSafeUrl } from "../../recon/shared/resolver.js";
import { runConcurrent } from "../../utils/concurrency.js";
import { checkStandardTraversal } from "./traversalChecks.js";
import { checkEncodedTraversal } from "./encodingChecks.js";

const MAX_TESTED_PARAMETERS = 5;
const MAX_PAYLOADS_PER_PARAMETER = 2;

const scanner = createSecurityScanner({
  id: "security.path-traversal",
  name: "Path Traversal",
  description:
    "Checks for controlled path traversal indicators in responses using traversal techniques and encoding variations.",

  async run(context) {
    const targetUrl = getTargetUrl(context);

    await assertSafeUrl(targetUrl);

    const parameters = getParameters(targetUrl).slice(0, MAX_TESTED_PARAMETERS);

    const payloads = getPayloads("pathTraversal").slice(
      0,
      MAX_PAYLOADS_PER_PARAMETER,
    );

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

        // 1. Standard traversal checks
        const traversalRes = await checkStandardTraversal({
          targetUrl,
          parameter,
          payloads,
          context,
          requestHeaders,
        });

        requestsTested += traversalRes.requestsTested;
        findings.push(...traversalRes.findings);
        evidence.push(...traversalRes.evidence);

        // If standard traversal already found disclosure, avoid unnecessary encoded tests on this parameter
        if (traversalRes.findings.length > 0 || context?.signal?.aborted) {
          return;
        }

        // 2. Encoding variations checks
        const encodingRes = await checkEncodedTraversal({
          targetUrl,
          parameter,
          context,
          requestHeaders,
        });

        requestsTested += encodingRes.requestsTested;
        findings.push(...encodingRes.findings);
        evidence.push(...encodingRes.evidence);
      },
      context?.signal,
    );

    return {
      data: {
        testedParameters: parameters,
        disclosureDetected: findings.length > 0,
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
