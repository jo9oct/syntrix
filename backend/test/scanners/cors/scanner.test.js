// STATUS: CREATED
// File: backend/test/scanners/cors/scanner.test.js

import test from "node:test";
import assert from "node:assert/strict";
import { evaluateCredentialHandling } from "../../../src/scanners/cors/credentials.js";
import { evaluateCorsPolicy } from "../../../src/scanners/cors/policyChecks.js";

test("cors - evaluateCredentialHandling detects arbitrary origin reflection with credentials", () => {
  const result = evaluateCredentialHandling({
    testOrigin: "https://assessment.invalid",
    allowOrigin: "https://assessment.invalid",
    allowCredentials: "true",
  });

  assert.equal(result.allowCredentials, true);
  assert.equal(result.findings.length, 1);
  assert.equal(
    result.findings[0].title,
    "Potentially Unsafe CORS Origin and Credential Configuration",
  );
});

test("cors - evaluateCorsPolicy detects wildcard allow origin", () => {
  const result = evaluateCorsPolicy({
    allowOrigin: "*",
    responseHeaders: {},
  });

  assert.equal(result.findings.length, 1);
  assert.equal(result.findings[0].title, "Wildcard CORS Policy");
});
