/*
 * STATUS: CREATED
 * File: src/scanners/xss/reflected.js
 */

import { setParameter } from "../shared/parameterTester.js";
import { getSafeMarker } from "../shared/payloadManager.js";
import { findReflection } from "../shared/reflectionDetector.js";
import { analyzeReflectionContext } from "./helpers.js";

const DEFAULT_MARKER = getSafeMarker();

export const REFLECTED_PAYLOADS = [
  {
    name: "html-tag-probe",
    getPayload: (marker) => `<${marker}>`,
  },
  {
    name: "attribute-quote-probe",
    getPayload: (marker) => `"${marker}"`,
  },
  {
    name: "single-quote-script-probe",
    getPayload: (marker) => `'${marker}'`,
  },
];

export const testReflectedXss = async ({
  targetUrl,
  parameter,
  createTestRequest,
  baselineResponse,
  request,
  marker = DEFAULT_MARKER,
}) => {
  const result = {
    technique: "reflected",
    tested: 0,
    failures: 0,
    signal: null,
    skipped: false,
  };

  if (typeof request !== "function") {
    return result;
  }

  const baselineText =
    typeof baselineResponse?.data === "string" ? baselineResponse.data : "";

  for (const testCase of REFLECTED_PAYLOADS) {
    const payload = testCase.getPayload(marker);

    const testTarget =
      typeof createTestRequest === "function"
        ? createTestRequest(payload)
        : setParameter(targetUrl, parameter, payload);

    const outcome = await request(testTarget);

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
    const body = typeof response.data === "string" ? response.data : "";

    // If marker didn't appear in response, continue
    if (!body.includes(marker)) {
      continue;
    }

    // Do not flag if marker was already present in the baseline
    if (baselineText && baselineText.includes(marker)) {
      continue;
    }

    const reflectionAnalysis = analyzeReflectionContext(body, marker);
    const basicReflection = findReflection(body, marker);

    const isRawUnescaped = reflectionAnalysis?.rawUnescaped === true;
    const contextType = reflectionAnalysis?.context || "html_body";

    const testUrl =
      typeof testTarget === "string" ? testTarget : testTarget.url;
    const requestDefinition =
      typeof testTarget === "string"
        ? { method: "GET", url: testTarget }
        : testTarget;

    // Determine confidence and severity based on reflection context
    const isHighRiskContext =
      contextType === "script" || contextType === "event_handler";
    const confidence = isRawUnescaped ? "high" : "low";
    const severity = isHighRiskContext || isRawUnescaped ? "high" : "medium";

    result.signal = {
      response,
      testUrl,
      request: requestDefinition,
      confidence,
      severity,
      payload,
      context: contextType,
      rawUnescaped: isRawUnescaped,
      description: isRawUnescaped
        ? `Reflected input detected with unescaped markup in ${contextType} context for parameter "${parameter}". User input was returned without appropriate HTML encoding.`
        : `The controlled marker was reflected in the response for parameter "${parameter}". Reflection alone does not confirm executable cross-site scripting.`,
      evidence: {
        parameter,
        reflectionContext:
          reflectionAnalysis?.surroundingHtml || basicReflection?.context,
        contextType,
        rawUnescaped: isRawUnescaped,
        payload,
      },
    };

    break;
  }

  return result;
};
