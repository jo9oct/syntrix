
/*
 * STATUS: UPDATED
 * File: src/scanners/sqli/errorBased.js
 */

import { getPayloads } from "../shared/payloadManager.js";
import { setParameter } from "../shared/parameterTester.js";
import {
  getSqlErrorSignature,
  identifyDatabaseFamily,
} from "./helpers.js";

const MAX_ERROR_PROBES = 2;

const getResponseBody = (response) =>
  response?.data ?? response?.body ?? "";

const testErrorBased = async ({
  targetUrl,
  parameter,
  baselineResponse,
  request,
}) => {
  const result = {
    technique: "error-based",
    tested: 0,
    failures: 0,
    signal: null,
    skipped: false,
  };

  if (!baselineResponse || typeof request !== "function") {
    return result;
  }

  const baselineBody = getResponseBody(baselineResponse);
  const baselineSignature = getSqlErrorSignature(baselineBody);

  const payloads = getPayloads("sqli").slice(0, MAX_ERROR_PROBES);

  for (const payload of payloads) {
    const testUrl = setParameter(targetUrl, parameter, payload);
    const outcome = await request(testUrl);

    if (outcome?.skipped) {
      result.skipped = true;
      break;
    }

    result.tested += 1;

    if (!outcome?.response) {
      result.failures += 1;
      continue;
    }

    const responseBody = getResponseBody(outcome.response);
    const signature = getSqlErrorSignature(responseBody);

    // Ignore responses without a recognized SQL error signature.
    if (signature === null) {
      continue;
    }

    // An existing baseline SQL error is not new evidence.
    if (baselineSignature !== null && signature === baselineSignature) {
      continue;
    }

    const databaseFamily = identifyDatabaseFamily(responseBody);

    result.signal = {
      response: outcome.response,
      testUrl,
      confidence: "low",
      description:
        "A recognized SQL-related error signature appeared after controlled parameter input and differed from the baseline. This may indicate SQL error disclosure or SQL injection; further verification is required.",
      ...(databaseFamily ? { databaseFamily } : {}),
    };

    break;
  }

  return result;
};

export { testErrorBased };
