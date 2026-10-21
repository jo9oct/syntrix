
/*
 * STATUS: UPDATED
 * File: src/scanners/sqli/booleanBased.js
 */

import { setParameter } from "../shared/parameterTester.js";
import {
  isMeaningfulBooleanDifference,
  summarizeResponse,
} from "./helpers.js";

const BOOLEAN_CASES = [
  {
    name: "quoted-condition",
    truePayload: "' AND '1'='1",
    falsePayload: "' AND '1'='2",
  },
  {
    name: "numeric-condition",
    truePayload: " AND 1=1",
    falsePayload: " AND 1=2",
  },
];

const testBooleanBased = async ({
  targetUrl,
  parameter,
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

  for (const testCase of BOOLEAN_CASES) {
    const trueUrl = setParameter(
      targetUrl,
      parameter,
      testCase.truePayload,
    );

    const trueOutcome = await request(trueUrl);

    if (trueOutcome?.skipped) {
      result.skipped = true;
      break;
    }

    result.tested += 1;

    if (!trueOutcome?.response) {
      result.failures += 1;
      continue;
    }

    const falseUrl = setParameter(
      targetUrl,
      parameter,
      testCase.falsePayload,
    );

    const falseOutcome = await request(falseUrl);

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

    result.signal = {
      response: trueOutcome.response,
      testUrl: trueUrl,
      confidence: "low",
      description:
        `The paired Boolean test "${testCase.name}" produced materially different responses relative to the baseline. This is a potential SQL injection signal and requires verification.`,
      evidence: {
        baselineStatus:
          baselineResponse.status ?? baselineResponse.statusCode ?? null,
        trueConditionStatus: trueSummary.status,
        falseConditionStatus: falseSummary.status,
        trueConditionBodyLength: trueSummary.body.length,
        falseConditionBodyLength: falseSummary.body.length,
      },
    };

    break;
  }

  return result;
};

export { testBooleanBased };
