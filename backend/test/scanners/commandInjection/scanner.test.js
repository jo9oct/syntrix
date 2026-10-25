// STATUS: CREATED
// File: backend/test/scanners/commandInjection/scanner.test.js

import test from "node:test";
import assert from "node:assert/strict";
import { SHELL_ERROR_PATTERNS } from "../../../src/scanners/commandInjection/errorBased.js";

test("commandInjection - SHELL_ERROR_PATTERNS match typical shell errors", () => {
  const unixError = "sh: 1: foobar: not found";
  assert.ok(SHELL_ERROR_PATTERNS.some((p) => p.test(unixError)));

  const winError =
    "'foobar' is not recognized as an internal or external command";
  assert.ok(SHELL_ERROR_PATTERNS.some((p) => p.test(winError)));

  const cleanBody = "<div>User profile not found</div>";
  assert.ok(!SHELL_ERROR_PATTERNS.some((p) => p.test(cleanBody)));
});
