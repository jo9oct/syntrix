// STATUS: CREATED
// File: backend/test/scanners/apiSecurity/scanner.test.js

import test from "node:test";
import assert from "node:assert/strict";
import { API_PATHS } from "../../../src/scanners/apiSecurity/endpointChecks.js";
import { checkApiConfiguration } from "../../../src/scanners/apiSecurity/configChecks.js";

test("apiSecurity - API_PATHS contains documentation endpoints", () => {
  assert.ok(API_PATHS.includes("/openapi.json"));
  assert.ok(API_PATHS.includes("/swagger.json"));
});

test("apiSecurity - checkApiConfiguration flags debug/banner headers", () => {
  const headers = {
    "x-powered-by": "Express",
    "x-debug-token": "abcde123",
  };
  const res = checkApiConfiguration(headers);
  assert.equal(res.findings.length, 2);
  assert.ok(res.findings.some((f) => f.title.includes("x-powered-by")));
  assert.ok(res.findings.some((f) => f.title.includes("x-debug-token")));
});

