// STATUS: CREATED
// File: backend/test/scanners/securityHeaders/scanner.test.js

import test from "node:test";
import assert from "node:assert/strict";
import scanner from "../../../src/scanners/securityHeaders/scanner.js";
import { checkRequiredHeaders } from "../../../src/scanners/securityHeaders/headerChecks.js";
import { validateHeaderConfigurations } from "../../../src/scanners/securityHeaders/configValidation.js";

test("securityHeaders - checkRequiredHeaders identifies missing headers", () => {
  const result = checkRequiredHeaders({
    headers: {
      "strict-transport-security": "max-age=31536000",
    },
    targetUrl: "https://example.com",
    requestHeaders: {},
    status: 200,
    response: { status: 200, headers: {} },
  });

  assert.equal(result.present.includes("strict-transport-security"), true);
  assert.equal(result.missing.includes("content-security-policy"), true);
  assert.equal(result.missing.includes("x-content-type-options"), true);
  assert.equal(result.missing.includes("referrer-policy"), true);
  assert.equal(result.findings.length, 3);
});

test("securityHeaders - validateHeaderConfigurations detects weak configs", () => {
  const result = validateHeaderConfigurations({
    headers: {
      "strict-transport-security": "max-age=0",
      "content-security-policy": "default-src 'self' 'unsafe-inline'",
      "x-content-type-options": "sniff",
      "referrer-policy": "unsafe-url",
    },
    targetUrl: "https://example.com",
    status: 200,
    response: { status: 200, headers: {} },
  });

  assert.equal(result.findings.length, 4);
  assert.ok(result.findings.some((f) => f.title.includes("max-age=0")));
  assert.ok(
    result.findings.some((f) =>
      f.title.includes("Permissive Content-Security-Policy"),
    ),
  );
  assert.ok(
    result.findings.some((f) =>
      f.title.includes("Misconfigured X-Content-Type-Options"),
    ),
  );
  assert.ok(
    result.findings.some((f) => f.title.includes("Insecure Referrer-Policy")),
  );
});
