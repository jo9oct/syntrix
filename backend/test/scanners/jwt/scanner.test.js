// STATUS: CREATED
// File: backend/test/scanners/jwt/scanner.test.js

import test from "node:test";
import assert from "node:assert/strict";
import { evaluateJwtSignature } from "../../../src/scanners/jwt/signatureChecks.js";
import { evaluateJwtAlgorithm } from "../../../src/scanners/jwt/algorithmChecks.js";
import { evaluateJwtClaims } from "../../../src/scanners/jwt/claimsValidation.js";

test("jwt - signatureChecks flags empty signature", () => {
  const token = "eyJhbGciOiJub25lIn0.eyJzdWIiOiIxMjM0NTY3ODkwIn0.";
  const res = evaluateJwtSignature(token);
  assert.equal(res.hasSignature, false);
  assert.ok(res.findings.some((f) => f.title.includes("Unsigned JWT Token")));
});

test("jwt - algorithmChecks flags alg=none", () => {
  const token = "eyJhbGciOiJub25lIn0.eyJzdWIiOiIxMjM0NTY3ODkwIn0.";
  const res = evaluateJwtAlgorithm(token);
  assert.ok(
    res.findings.some((f) => f.title.includes("Insecure JWT 'none' Algorithm")),
  );
});

test("jwt - claimsValidation flags missing exp", () => {
  const token =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.abc";
  const res = evaluateJwtClaims(token);
  assert.ok(
    res.findings.some((f) => f.title.includes("Missing Expiration Claim")),
  );
});
