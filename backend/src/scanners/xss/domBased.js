/*
 * STATUS: CREATED
 * File: src/scanners/xss/domBased.js
 */

import { analyzeDomSourcesAndSinks } from "./helpers.js";

export const testDomBasedXss = async ({
  targetUrl,
  parameter,
  baselineResponse,
  request,
}) => {
  const result = {
    technique: "dom-based",
    tested: 0,
    failures: 0,
    signal: null,
    skipped: false,
  };

  const body =
    typeof baselineResponse?.data === "string" ? baselineResponse.data : "";
  if (!body || !body.includes("<script")) {
    return result;
  }

  // Analyze page scripts for source -> sink data flows
  const domFindings = analyzeDomSourcesAndSinks(body, parameter);

  if (domFindings.length === 0) {
    return result;
  }

  result.tested += 1;

  // Prioritize findings that explicitly reference the current parameter
  const matchedFinding =
    domFindings.find((f) => f.parameterReferenced) || domFindings[0];

  const confidence = matchedFinding.parameterReferenced ? "high" : "medium";
  const severity = matchedFinding.severity || "medium";

  result.signal = {
    response: baselineResponse,
    testUrl: targetUrl,
    request: { method: "GET", url: targetUrl },
    confidence,
    severity,
    source: matchedFinding.source,
    sink: matchedFinding.sink,
    snippet: matchedFinding.snippet,
    description: `Potential DOM-based Cross-Site Scripting flow detected. Client-side JavaScript reads from source "${matchedFinding.source}" and writes into execution sink "${matchedFinding.sink}"${
      matchedFinding.parameterReferenced
        ? ` with direct reference to parameter "${parameter}"`
        : ""
    }.`,
    evidence: {
      parameter,
      source: matchedFinding.source,
      sink: matchedFinding.sink,
      snippet: matchedFinding.snippet,
      parameterReferenced: matchedFinding.parameterReferenced,
    },
  };

  return result;
};
