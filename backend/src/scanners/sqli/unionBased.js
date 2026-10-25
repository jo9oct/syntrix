/*
 * STATUS: UPDATED
 * File: src/scanners/sqli/unionBased.js
 */

import { setParameter } from "../shared/parameterTester.js";
import {
  getSqlErrorSignature,
  isSuccessfulResponse,
  normalizeBody,
} from "./helpers.js";

const UNION_MARKER = "jo_sqli_union_probe_7f3a";
const MAX_COLUMNS_TO_PROBE = 5;

const getResponseBody = (response) =>
  normalizeBody(response?.data ?? response?.body);

const getStatus = (response) =>
  response?.status ?? response?.statusCode ?? null;

const testUnionBased = async ({
  targetUrl,
  parameter,
  createTestRequest,
  baselineResponse,
  request,
}) => {
  const result = {
    technique: "union-based",
    tested: 0,
    failures: 0,
    signal: null,
    skipped: false,
  };

  if (!baselineResponse || typeof request !== "function") {
    return result;
  }

  const baselineBody = getResponseBody(baselineResponse);
  const baselineStatus = getStatus(baselineResponse);

  // If baseline response already contains our marker, cannot use it
  if (baselineBody.includes(UNION_MARKER)) {
    return result;
  }

  const executeProbe = async (payload) => {
    const testTarget =
      typeof createTestRequest === "function"
        ? createTestRequest(payload)
        : setParameter(targetUrl, parameter, payload);

    const outcome = await request(testTarget);

    if (outcome?.skipped) {
      result.skipped = true;
      return null;
    }

    result.tested += 1;

    if (!outcome?.response) {
      result.failures += 1;
      return null;
    }

    const res = outcome.response;
    const body = getResponseBody(res);
    const status = getStatus(res);
    const sqlError = getSqlErrorSignature(body);
    const isSuccess = isSuccessfulResponse(res) && sqlError === null;

    const testUrl =
      typeof testTarget === "string" ? testTarget : testTarget.url;
    const requestDefinition =
      typeof testTarget === "string"
        ? { method: "GET", url: testTarget }
        : testTarget;

    return {
      testTarget,
      testUrl,
      requestDefinition,
      response: res,
      body,
      status,
      sqlError,
      isSuccess,
      payload,
    };
  };

  /*
   * 1. Direct Marker Reflection Payloads (Fast Reflection Check)
   */
  const directMarkerPayloads = [
    `' UNION SELECT '${UNION_MARKER}'-- `,
    `' UNION SELECT NULL,'${UNION_MARKER}'-- `,
  ];

  for (const payload of directMarkerPayloads) {
    const probe = await executeProbe(payload);
    if (result.skipped) return result;
    if (!probe) continue;

    if (
      probe.body.includes(UNION_MARKER) &&
      !/union\s+select/i.test(probe.body)
    ) {
      result.signal = {
        response: probe.response,
        testUrl: probe.testUrl,
        request: probe.requestDefinition,
        confidence: "low",
        reflectionConfirmed: true,
        payload,
        description:
          "A unique test marker appeared in the response and was absent from the baseline. Simple reflection and application-side transformations cannot be ruled out; this is an unconfirmed SQL injection signal.",
        evidence: {
          baselineStatus,
          responseStatus: probe.status,
          markerPresentInBaseline: false,
          markerPresentInResponse: true,
          payload,
        },
      };
      return result;
    }
  }

  /*
   * 2. Column Count Determination via NULL Probing
   * Probes 1 to 5 columns with ' UNION SELECT NULL...--
   * Mismatched column counts trigger database/server errors (e.g. HTTP 500 or SQL syntax error),
   * while the matching column count executes cleanly (HTTP 200).
   */
  let hasMismatchedError = false;
  let mismatchedStatus = null;
  let mismatchedCol = null;
  let matchedProbe = null;
  let matchedCols = null;

  for (let cols = 1; cols <= MAX_COLUMNS_TO_PROBE; cols++) {
    // If we have executed 5 probes on an ordinary non-vulnerable target with no errors,
    // do not waste requests.
    if (result.tested >= 5 && !hasMismatchedError) {
      break;
    }

    const nulls = Array(cols).fill("NULL").join(",");
    const payload = `' UNION SELECT ${nulls}--`;

    const probe = await executeProbe(payload);
    if (result.skipped) return result;
    if (!probe) continue;

    // Check if the marker appeared directly in the response (e.g. unit tests or reflected error)
    if (
      probe.body.includes(UNION_MARKER) &&
      !/union\s+select/i.test(probe.body)
    ) {
      result.signal = {
        response: probe.response,
        testUrl: probe.testUrl,
        request: probe.requestDefinition,
        confidence: "low",
        reflectionConfirmed: true,
        payload,
        description:
          "A unique test marker appeared in the response and was absent from the baseline. Simple reflection and application-side transformations cannot be ruled out; this is an unconfirmed SQL injection signal.",
        evidence: {
          baselineStatus,
          responseStatus: probe.status,
          markerPresentInBaseline: false,
          markerPresentInResponse: true,
          payload,
        },
      };
      return result;
    }

    const isError =
      probe.status >= 500 ||
      probe.sqlError !== null ||
      (probe.status >= 400 && probe.status !== baselineStatus);

    if (isError) {
      hasMismatchedError = true;
      mismatchedStatus = probe.status;
      mismatchedCol = cols;
    } else if (probe.isSuccess && probe.status === baselineStatus) {
      matchedProbe = probe;
      matchedCols = cols;
      if (hasMismatchedError) {
        break;
      }
    }
  }

  /*
   * 2. If a column count matched cleanly while other column counts produced errors:
   */
  if (hasMismatchedError && matchedProbe && matchedCols !== null) {
    // Attempt data reflection across each column of the matched count
    let reflectedColumn = null;
    let reflectionProbe = null;

    for (let c = 0; c < matchedCols; c++) {
      const testCols = Array(matchedCols).fill("NULL");
      testCols[c] = `'${UNION_MARKER}'`;
      const markerPayload = `' UNION SELECT ${testCols.join(",")}--`;

      const mProbe = await executeProbe(markerPayload);
      if (result.skipped) return result;
      if (!mProbe) continue;

      if (
        mProbe.body.includes(UNION_MARKER) &&
        !/union\s+select/i.test(mProbe.body)
      ) {
        reflectedColumn = c + 1;
        reflectionProbe = mProbe;
        break;
      }
    }

    if (reflectionProbe && reflectedColumn !== null) {
      result.signal = {
        response: reflectionProbe.response,
        testUrl: reflectionProbe.testUrl,
        request: reflectionProbe.requestDefinition,
        confidence: "high",
        reflectionConfirmed: true,
        payload: reflectionProbe.payload,
        description: `UNION-based SQL injection confirmed with data reflection. The query structure accepted ${matchedCols} columns and reflected injected data in column ${reflectedColumn}.`,
        evidence: {
          baselineStatus,
          responseStatus: reflectionProbe.status,
          matchedColumnCount: matchedCols,
          reflectedColumn,
          markerPresentInBaseline: false,
          markerPresentInResponse: true,
          payload: reflectionProbe.payload,
        },
      };
      return result;
    }

    // Column count alignment confirmed
    result.signal = {
      response: matchedProbe.response,
      testUrl: matchedProbe.testUrl,
      request: matchedProbe.requestDefinition,
      confidence: "medium",
      payload: matchedProbe.payload,
      description: `UNION-based SQL injection detected. Query execution succeeded with ${matchedCols} UNION column(s) (HTTP ${matchedProbe.status}), while mismatched column counts triggered server or database errors (HTTP ${mismatchedStatus}).`,
      evidence: {
        baselineStatus,
        responseStatus: matchedProbe.status,
        matchedColumnCount: matchedCols,
        mismatchedColumnCount: mismatchedCol,
        mismatchedStatus,
        payload: matchedProbe.payload,
      },
    };
    return result;
  }

  return result;
};

export { testUnionBased };
