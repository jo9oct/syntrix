
/*
 * STATUS: UPDATED
 * File: src/scanners/sqli/unionBased.js
 */

import { setParameter } from "../shared/parameterTester.js";
import { normalizeBody } from "./helpers.js";

const UNION_MARKER = "jo_sqli_union_probe_7f3a";

const UNION_PAYLOADS = [
  `' UNION SELECT '${UNION_MARKER}'-- `,
  `' UNION SELECT NULL,'${UNION_MARKER}'-- `,
  `' UNION SELECT NULL,NULL,'${UNION_MARKER}'-- `,
  `' UNION SELECT NULL,NULL,NULL,'${UNION_MARKER}'-- `,
  `' UNION SELECT NULL,NULL,NULL,NULL,'${UNION_MARKER}'-- `,
];

const getResponseBody = (response) =>
  normalizeBody(response?.data ?? response?.body);

const getStatus = (response) =>
  response?.status ?? response?.statusCode ?? null;

const testUnionBased = async ({
  targetUrl,
  parameter,
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

  for (const payload of UNION_PAYLOADS) {
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

    const response = outcome.response;
    const body = getResponseBody(response);

    if (!body.includes(UNION_MARKER)) {
      continue;
    }

    // Do not flag a marker that already existed in the baseline.
    if (baselineBody.includes(UNION_MARKER)) {
      continue;
    }

    // A marker is not useful evidence if the response reproduces the
    // original SQL expression as text.
    if (/union\s+select/i.test(body)) {
      continue;
    }

    /*
     * The marker may still be reflected or transformed by application
     * code. This is only a low-confidence signal, not confirmation.
     */
    result.signal = {
      response,
      testUrl,
      confidence: "low",
      description:
        "A unique test marker appeared in the response and was absent from the baseline. Simple reflection and application-side transformations cannot be ruled out; this is an unconfirmed SQL injection signal.",
      evidence: {
        baselineStatus: getStatus(baselineResponse),
        responseStatus: getStatus(response),
        markerPresentInBaseline: false,
        markerPresentInResponse: true,
      },
    };

    break;
  }

  return result;
};

export { testUnionBased };
