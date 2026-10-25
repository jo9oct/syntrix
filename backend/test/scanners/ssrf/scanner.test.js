// STATUS: CREATED
// File: backend/test/scanners/ssrf/scanner.test.js

import test from "node:test";
import assert from "node:assert/strict";
import { evaluateSsrfResponse } from "../../../src/scanners/ssrf/responseVerification.js";

test("ssrf - evaluateSsrfResponse detects 502/504 gateway errors", () => {
  const result = evaluateSsrfResponse({
    response: {
      status: 504,
      statusText: "Gateway Timeout",
      headers: {},
      data: "",
    },
    parameter: "webhook",
    payload: "https://example.invalid/",
    testUrl: "https://target.app/api?webhook=https://example.invalid/",
  });

  assert.ok(result);
  assert.equal(
    result.finding.title,
    "Potential Server-Side URL Retrieval Surface",
  );
  assert.equal(result.finding.metadata.signal, "gateway-error");
});

test("ssrf - evaluateSsrfResponse detects reflected test domain", () => {
  const result = evaluateSsrfResponse({
    response: {
      status: 200,
      statusText: "OK",
      headers: {},
      data: "Retrieved content from example.invalid successfully",
    },
    parameter: "url",
    payload: "https://example.invalid/",
    testUrl: "https://target.app/preview?url=https://example.invalid/",
  });

  assert.ok(result);
  assert.equal(result.finding.metadata.signal, "test-domain-marker");
});
