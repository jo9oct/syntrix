// STATUS: CREATED
// File: backend/test/scanners/csrf/scanner.test.js

import test from "node:test";
import assert from "node:assert/strict";
import {
  getForms,
  validateFormTokens,
} from "../../../src/scanners/csrf/tokenValidation.js";
import { evaluateCookieSameSite } from "../../../src/scanners/csrf/cookieProtections.js";

test("csrf - tokenValidation detects unprotected POST forms", () => {
  const html = `
    <html>
      <form action="/login" method="post">
        <input type="text" name="user"/>
      </form>
      <form action="/profile" method="post">
        <input type="hidden" name="csrf_token" value="abc123xyz"/>
      </form>
    </html>
  `;
  const forms = getForms(html);
  assert.equal(forms.length, 2);

  const res = validateFormTokens(forms);
  assert.equal(res.stateChangingForms.length, 2);
  assert.equal(res.unprotectedForms.length, 1);
  assert.equal(res.findings.length, 1);
});

test("csrf - cookieProtections flags missing SameSite on session cookies", () => {
  const headers = {
    "set-cookie": "sessionId=xyz987; Path=/; HttpOnly",
  };
  const res = evaluateCookieSameSite(headers);
  assert.equal(res.findings.length, 1);
  assert.equal(
    res.findings[0].title,
    "Session Cookie Missing SameSite Protection",
  );
});
