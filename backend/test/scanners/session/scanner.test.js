// STATUS: CREATED
// File: backend/test/scanners/session/scanner.test.js

import test from "node:test";
import assert from "node:assert/strict";
import {
  parseSetCookie,
  checkCookieAttributes,
} from "../../../src/scanners/session/cookieAttributes.js";
import { checkSessionLifecycle } from "../../../src/scanners/session/lifecycleChecks.js";
import { checkSessionFixation } from "../../../src/scanners/session/fixationChecks.js";

test("session - cookieAttributes parses Set-Cookie and finds missing flags", () => {
  const headers = {
    "set-cookie": "sess=123; Path=/",
  };
  const cookies = parseSetCookie(headers);
  assert.equal(cookies.length, 1);
  assert.equal(cookies[0].secure, false);
  assert.equal(cookies[0].httpOnly, false);
  assert.equal(cookies[0].sameSite, null);

  const res = checkCookieAttributes(cookies);
  assert.equal(res.findings.length, 3);
});

test("session - fixationChecks detects session IDs in URL", () => {
  const res = checkSessionFixation({
    targetUrl: "https://example.com/app?jsessionid=ABCD1234EFGH",
  });
  assert.equal(res.findings.length, 1);
  assert.equal(res.findings[0].title, "Session Identifier Exposed in URL");
});
