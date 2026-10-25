// STATUS: CREATED
// File: backend/test/scanners/accessControl/scanner.test.js

import test from "node:test";
import assert from "node:assert/strict";
import { SENSITIVE_PATHS } from "../../../src/scanners/accessControl/authBypass.js";

test("accessControl - includes standard administrative endpoints", () => {
  assert.ok(SENSITIVE_PATHS.includes("/admin"));
  assert.ok(SENSITIVE_PATHS.includes("/dashboard"));
  assert.ok(SENSITIVE_PATHS.includes("/manage"));
});

