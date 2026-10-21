/*
 * STATUS: UPDATED
 * File: src/scanners/sqli/timeBased.js
 */

import { setParameter } from "../shared/parameterTester.js";
import {
  isSuccessfulResponse,
  summarizeResponse,
} from "./helpers.js";

const TIME_DELAY_SECONDS = 3;
const MIN_TIME_DIFFERENCE_MS = 2500;
const BASELINE_SAMPLE_COUNT = 3;
const MAX_BASELINE_SPREAD_MS = 1500;

const TIME_PAYLOADS = [
  {
    name: "mysql",
    payload: `' AND SLEEP(${TIME_DELAY_SECONDS}) AND '1'='1`,
  },
  {
    name: "postgresql",
    payload:
      `' AND (SELECT 1 FROM pg_sleep(${TIME_DELAY_SECONDS})) IS NULL AND '1'='1`,
  },
  {
    name: "mssql",
    payload: `'; WAITFOR DELAY '0:0:${TIME_DELAY_SECONDS}'--`,
  },
];

const getDuration = (response) => {
  if (!response || !isSuccessfulResponse(response)) {
    return null;
  }

  const { durationMs } = summarizeResponse(response);

  return Number.isFinite(durationMs) && durationMs >= 0
    ? durationMs
    : null;
};

const getMedian = (values) => {
  if (values.length === 0) {
    return null;
  }

  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 1) {
    return sorted[middle];
  }

  return (sorted[middle - 1] + sorted[middle]) / 2;
};

const testTimeBased = async ({
  targetUrl,
  parameter,
  baselineResponse,
  request,
}) => {
  const result = {
    technique: "time-based",
    tested: 0,
    failures: 0,
    signal: null,
    skipped: false,
  };

  const initialDuration = getDuration(baselineResponse);

  if (
    initialDuration === null ||
    typeof request !== "function"
  ) {
    result.skipped = true;
    return result;
  }

  const originalValue =
    new URL(targetUrl).searchParams.get(parameter) ?? "";

  const baselineUrl = setParameter(
    targetUrl,
    parameter,
    originalValue,
  );

  const baselineDurations = [initialDuration];

  /*
   * Bound baseline attempts. Failed or invalid responses must
   * never cause an infinite loop.
   */
  for (
    let attempts = 0;
    baselineDurations.length < BASELINE_SAMPLE_COUNT &&
    attempts < BASELINE_SAMPLE_COUNT - 1;
    attempts += 1
  ) {
    const outcome = await request(baselineUrl);

    if (outcome?.skipped) {
      result.skipped = true;
      return result;
    }

    if (!outcome?.response) {
      result.failures += 1;
      continue;
    }

    const duration = getDuration(outcome.response);

    if (duration === null) {
      result.failures += 1;
      continue;
    }

    baselineDurations.push(duration);
  }

  /*
   * Require all three baseline samples so timing comparisons
   * use the same sample count as the evidence description.
   */
  if (baselineDurations.length < BASELINE_SAMPLE_COUNT) {
    result.skipped = true;
    return result;
  }

  const baselineSpreadMs =
    Math.max(...baselineDurations) -
    Math.min(...baselineDurations);

  if (baselineSpreadMs > MAX_BASELINE_SPREAD_MS) {
    result.skipped = true;
    return result;
  }

  const baselineMedianMs = getMedian(baselineDurations);

  const absoluteDeviations = baselineDurations.map(
    (duration) => Math.abs(duration - baselineMedianMs),
  );

  const medianAbsoluteDeviationMs = getMedian(
    absoluteDeviations,
  );

  const requiredDifferenceMs = Math.max(
    MIN_TIME_DIFFERENCE_MS,
    medianAbsoluteDeviationMs * 3,
  );

  for (const testCase of TIME_PAYLOADS) {
    const testUrl = setParameter(
      targetUrl,
      parameter,
      testCase.payload,
    );

    const firstOutcome = await request(testUrl);

    if (firstOutcome?.skipped) {
      result.skipped = true;
      break;
    }

    result.tested += 1;

    if (!firstOutcome?.response) {
      result.failures += 1;
      continue;
    }

    const firstDuration = getDuration(firstOutcome.response);

    if (firstDuration === null) {
      continue;
    }

    const firstDifferenceMs =
      firstDuration - baselineMedianMs;

    if (firstDifferenceMs < requiredDifferenceMs) {
      continue;
    }

    /*
     * Confirm a potential timing signal with a second request.
     */
    const confirmationOutcome = await request(testUrl);

    if (confirmationOutcome?.skipped) {
      result.skipped = true;
      break;
    }

    result.tested += 1;

    if (!confirmationOutcome?.response) {
      result.failures += 1;
      continue;
    }

    const confirmationDuration = getDuration(
      confirmationOutcome.response,
    );

    if (confirmationDuration === null) {
      continue;
    }

    const confirmationDifferenceMs =
      confirmationDuration - baselineMedianMs;

    if (confirmationDifferenceMs < requiredDifferenceMs) {
      continue;
    }

    result.signal = {
      response: confirmationOutcome.response,
      testUrl,
      confidence: "low",
      description:
        `The ${testCase.name} timing probe was substantially slower than the median of three baseline samples, and the delay was reproduced by a second probe. Timing behavior alone does not confirm SQL injection; network latency and application behavior remain possible explanations.`,
      evidence: {
        baselineDurationsMs: [...baselineDurations],
        baselineMedianMs,
        baselineSpreadMs,
        medianAbsoluteDeviationMs,
        responseDurationMs: confirmationDuration,
        firstProbeDurationMs: firstDuration,
        timeDifferenceMs: confirmationDifferenceMs,
        firstProbeDifferenceMs: firstDifferenceMs,
        minimumDifferenceMs: MIN_TIME_DIFFERENCE_MS,
        requiredDifferenceMs,
        confirmationRepeated: true,
      },
    };

    break;
  }

  return result;
};

export { testTimeBased };