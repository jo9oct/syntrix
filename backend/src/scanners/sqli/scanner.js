// STATUS: UPDATED

import { get } from "../../request/request.js";
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

const MAX_PARAMETERS = 5;
const MAX_PAYLOADS_PER_PARAMETER = 2;
const MAX_TARGETS = 11;

const SQL_ERROR_PATTERNS = [
  /sql syntax/i,
  /mysql/i,
  /postgresql/i,
  /sqlite/i,
  /ora-\d+/i,
  /microsoft sql server/i,
  /odbc sql/i,
  /database error/i,
];

const containsSqlError = (body) =>
  typeof body === "string" &&
  SQL_ERROR_PATTERNS.some((pattern) => pattern.test(body));

const getTargets = (context, rootUrl) =>
  [
    ...new Set([
      rootUrl,
      ...(Array.isArray(context?.discoveredUrls) ? context.discoveredUrls : []),
    ]),
  ].slice(0, MAX_TARGETS);

const scanner = createSecurityScanner({
  id: "security.sqli",
  name: "SQL Injection Detection",
  description:
    "Performs a conservative SQL error-surface assessment using controlled parameter input.",

  async run(context) {
    const rootUrl = getTargetUrl(context);

    await assertSafeUrl(rootUrl);

    const emptyResult = (cancelled = false) => ({
      data: {
        testedParameters: [],
        errorSignatureDetected: false,
      },
      findings: [],
      evidence: [],
      fingerprints: [],
      verificationRecords: [],
      metadata: {
        cancelled,
        parametersTested: 0,
        requestsTested: 0,
        targetsTested: 0,
      },
    });

    if (context?.signal?.aborted) {
      return emptyResult(true);
    }

    const payloads = getPayloads("sqli").slice(0, MAX_PAYLOADS_PER_PARAMETER);

    const findings = [];
    const evidence = [];
    const testedParameters = new Set();
    const testedTargets = getTargets(context, rootUrl);

    let requestsTested = 0;

    const requestHeaders = context?.session?.getHeaders?.() ?? {};

    for (const targetUrl of testedTargets) {
      if (context?.signal?.aborted) break;

      await assertSafeUrl(targetUrl);

      const parameters = getParameters(targetUrl).slice(0, MAX_PARAMETERS);

      for (const parameter of parameters) {
        if (context?.signal?.aborted) break;

        testedParameters.add(parameter);

        for (const payload of payloads) {
          if (context?.signal?.aborted) break;

          const testUrl = setParameter(targetUrl, parameter, payload);

          await assertSafeUrl(testUrl);

          const response = await get(testUrl, {
            signal: context?.signal,
            headers: requestHeaders,
          });

          requestsTested += 1;

          if (!containsSqlError(response.data)) continue;

          findings.push(
            normalizeFinding({
              scannerId: "security.sqli",
              title: "Potential SQL Error Disclosure",
              description: `A database-related error signature was observed after controlled input was supplied to "${parameter}". This indicates a potential SQL error disclosure condition, but does not by itself confirm exploitable SQL injection.`,
              severity: "high",
              confidence: calculateConfidence({ confirmed: false }),
              remediation:
                "Use parameterized database queries, validate input, and avoid exposing database errors or database implementation details to clients.",
              category: "sqli",
              metadata: {
                parameter,
                payloadType: "controlled-sqli",
                detection: "database-error-signature",
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
                headers: response.headers,
                body: response.data,
              },
              parameter,
              payload,
            }),
          );

          break;
        }
      }
    }

    return {
      data: {
        testedParameters: [...testedParameters],
        errorSignatureDetected: findings.length > 0,
      },
      findings,
      evidence,
      fingerprints: [],
      verificationRecords: [],
      metadata: {
        cancelled: context?.signal?.aborted === true,
        parametersTested: testedParameters.size,
        requestsTested,
        targetsTested: testedTargets.length,
        payloadsPerParameter: payloads.length,
      },
    };
  },
});

export default scanner;
