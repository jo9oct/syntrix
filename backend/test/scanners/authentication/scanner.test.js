// STATUS: CREATED
// File: backend/test/scanners/authentication/scanner.test.js

import test from "node:test";
import assert from "node:assert/strict";
import {
  classifyAuthUrl,
  safeUrl,
} from "../../../src/scanners/authentication/loginChecks.js";
import { evaluateFormCredentialHandling } from "../../../src/scanners/authentication/credentialHandling.js";

test("authentication - classifyAuthUrl classifies login and register URLs", () => {
  assert.equal(classifyAuthUrl("https://example.com/user/login"), "login");
  assert.equal(classifyAuthUrl("https://example.com/auth/sign-in"), "login");
  assert.equal(classifyAuthUrl("https://example.com/register"), "registration");
  assert.equal(
    classifyAuthUrl("https://example.com/create-account"),
    "registration",
  );
  assert.equal(classifyAuthUrl("https://example.com/blog/article-1"), null);
});

test("authentication - evaluateFormCredentialHandling detects insecure HTTP and GET method", () => {
  const findings = [];
  const parsedPageUrl = new URL("http://example.com/login");

  evaluateFormCredentialHandling({
    form: {
      action: "http://example.com/submit",
      method: "get",
      passwordInputs: [{ autocomplete: "" }],
    },
    parsedPageUrl,
    addFinding: (f) => findings.push(f),
  });

  assert.ok(findings.some((f) => f.title.includes("Insecure HTTP")));
  assert.ok(findings.some((f) => f.title.includes("GET Method")));
  assert.ok(findings.some((f) => f.title.includes("Autocomplete Guidance")));
});
