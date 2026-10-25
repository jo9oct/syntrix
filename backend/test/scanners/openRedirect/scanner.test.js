// STATUS: CREATED
// File: backend/test/scanners/openRedirect/scanner.test.js

import test from "node:test";
import assert from "node:assert/strict";
import {
  isValidRedirectResponse,
  isTargetRedirect,
  evaluateRedirectResponse,
} from "../../../src/scanners/openRedirect/redirectValidation.js";

test("openRedirect - redirectValidation detects redirect response codes and locations", () => {
  assert.equal(isValidRedirectResponse(302), true);
  assert.equal(isValidRedirectResponse(200), false);

  assert.equal(
    isTargetRedirect(
      "https://example.invalid/path",
      "https://example.invalid/",
    ),
    true,
  );
  assert.equal(
    isTargetRedirect("/relative/path", "https://example.invalid/"),
    false,
  );

  const evalResult = evaluateRedirectResponse({
    response: {
      status: 302,
      statusText: "Found",
      headers: { location: "https://example.invalid/target" },
    },
    parameter: "next",
    payload: "https://example.invalid/",
    testUrl: "https://target.app/login?next=https://example.invalid/",
  });

  assert.ok(evalResult);
  assert.equal(evalResult.finding.title, "Potential Open Redirect");
});
