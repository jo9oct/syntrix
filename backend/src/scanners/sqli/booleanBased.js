/*
 * STATUS: UPDATED
 * File: src/scanners/sqli/booleanBased.js
 */

import { setParameter } from "../shared/parameterTester.js";
import { isMeaningfulBooleanDifference, summarizeResponse } from "./helpers.js";

const BOOLEAN_CASES = [
  {
    name: "quoted-or-condition",
    truePayload: "' OR 1=1--",
    falsePayload: "' OR 1=2--",
  },
  {
    name: "numeric-or-condition",
    truePayload: " OR 1=1--",
    falsePayload: " OR 1=2--",
  },
];

const testBooleanBased = async ({
  targetUrl,
  parameter,
  createTestRequest,
  originalValue = "",
  baselineResponse,
  request,
}) => {
  const result = {
    technique: "boolean-based",
    tested: 0,
    failures: 0,
    signal: null,
    skipped: false,
  };

  if (!baselineResponse || typeof request !== "function") {
    return result;
  }

  const casesToTest = [...BOOLEAN_CASES];

  if (
    typeof originalValue === "string" &&
    originalValue.trim().length > 0 &&
    !/^\d+$/.test(originalValue.trim())
  ) {
    casesToTest.push({
      name: "quoted-and-original",
      truePayload: `${originalValue}' AND 1=1--`,
      falsePayload: `${originalValue}' AND 1=2--`,
    });
  }

  for (const testCase of casesToTest) {
    const trueTarget =
      typeof createTestRequest === "function"
        ? createTestRequest(testCase.truePayload)
        : setParameter(targetUrl, parameter, testCase.truePayload);

    const trueOutcome = await request(trueTarget);

    if (trueOutcome?.skipped) {
      result.skipped = true;
      break;
    }

    result.tested += 1;

    if (!trueOutcome?.response) {
      result.failures += 1;
      continue;
    }

    const falseTarget =
      typeof createTestRequest === "function"
        ? createTestRequest(testCase.falsePayload)
        : setParameter(targetUrl, parameter, testCase.falsePayload);

    const falseOutcome = await request(falseTarget);

    if (falseOutcome?.skipped) {
      result.skipped = true;
      break;
    }

    result.tested += 1;

    if (!falseOutcome?.response) {
      result.failures += 1;
      continue;
    }

    const hasMeaningfulDifference = isMeaningfulBooleanDifference(
      baselineResponse,
      trueOutcome.response,
      falseOutcome.response,
    );

    if (!hasMeaningfulDifference) {
      continue;
    }

    const trueSummary = summarizeResponse(trueOutcome.response);
    const falseSummary = summarizeResponse(falseOutcome.response);
    const trueUrl =
      typeof trueTarget === "string" ? trueTarget : trueTarget.url;
    const requestDefinition =
      typeof trueTarget === "string"
        ? { method: "GET", url: trueTarget }
        : trueTarget;

    result.signal = {
      response: trueOutcome.response,
      testUrl: trueUrl,
      request: requestDefinition,
      confidence: "low",
      payload: testCase.truePayload,
      description: `The paired Boolean test "${testCase.name}" produced materially different responses relative to the baseline. This is a potential SQL injection signal and requires verification.`,
      evidence: {
        baselineStatus:
          baselineResponse.status ?? baselineResponse.statusCode ?? null,
        trueConditionStatus: trueSummary.status,
        falseConditionStatus: falseSummary.status,
        trueConditionBodyLength: trueSummary.body.length,
        falseConditionBodyLength: falseSummary.body.length,
        truePayload: testCase.truePayload,
        falsePayload: testCase.falsePayload,
      },
    };

    break;
  }

  return result;
};

export { testBooleanBased };
