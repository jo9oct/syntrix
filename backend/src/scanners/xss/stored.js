/*
 * STATUS: CREATED
 * File: src/scanners/xss/stored.js
 */

import { analyzeReflectionContext } from "./helpers.js";

export const testStoredXss = async ({
  targetUrl,
  parameter,
  createTestRequest,
  method = "GET",
  baselineResponse,
  request,
}) => {
  const result = {
    technique: "stored",
    tested: 0,
    failures: 0,
    signal: null,
    skipped: false,
  };

  if (typeof request !== "function") {
    return result;
  }

  // Only run stored XSS checks on state-changing methods (POST/PUT/PATCH) or when custom request creator is available
  if (method === "GET" && !createTestRequest) {
    return result;
  }

  const baselineText =
    typeof baselineResponse?.data === "string" ? baselineResponse.data : "";
  const uniqueToken = `sentrix_stored_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
  const storedPayload = `<${uniqueToken}>`;

  // Step 1: Submit mutated request containing stored probe payload
  const submitTarget =
    typeof createTestRequest === "function"
      ? createTestRequest(storedPayload)
      : {
          url: targetUrl,
          method: "POST",
          headers: { "content-type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({ [parameter]: storedPayload }).toString(),
        };

  const submitOutcome = await request(submitTarget);

  if (submitOutcome?.skipped) {
    result.skipped = true;
    return result;
  }

  result.tested += 1;

  if (!submitOutcome?.response) {
    result.failures += 1;
    return result;
  }

  // Step 2: Verification phase — send a clean GET request without payload to see if marker persisted
  const verifyOutcome = await request(targetUrl);

  if (verifyOutcome?.skipped) {
    result.skipped = true;
    return result;
  }

  result.tested += 1;

  if (!verifyOutcome?.response) {
    result.failures += 1;
    return result;
  }

  const verifyBody =
    typeof verifyOutcome.response.data === "string"
      ? verifyOutcome.response.data
      : "";

  // If the clean GET response contains the unique stored token and it was absent in baseline
  if (verifyBody.includes(uniqueToken) && !baselineText.includes(uniqueToken)) {
    const analysis = analyzeReflectionContext(verifyBody, uniqueToken);
    const testUrl =
      typeof submitTarget === "string" ? submitTarget : submitTarget.url;
    const requestDefinition =
      typeof submitTarget === "string"
        ? { method: "POST", url: submitTarget }
        : submitTarget;

    result.signal = {
      response: verifyOutcome.response,
      testUrl,
      request: requestDefinition,
      confidence: "high",
      severity: "high",
      payload: storedPayload,
      storedMarker: uniqueToken,
      context: analysis?.context || "html_body",
      rawUnescaped: analysis?.rawUnescaped ?? true,
      description: `Stored Cross-Site Scripting detected for parameter "${parameter}". The injected payload was persisted by the server and rendered back in subsequent requests without the payload present in parameters.`,
      evidence: {
        parameter,
        submissionUrl: testUrl,
        verificationUrl: targetUrl,
        storedMarker: uniqueToken,
        reflectionContext:
          analysis?.surroundingHtml || verifyBody.slice(0, 300),
      },
    };
  }

  return result;
};
