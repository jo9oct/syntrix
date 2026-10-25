// STATUS: CREATED
// File: backend/test/scanners/pathTraversal/scanner.test.js

import test from "node:test";
import assert from "node:assert/strict";
import { FILE_DISCLOSURE_PATTERNS } from "../../../src/scanners/pathTraversal/traversalChecks.js";

test("pathTraversal - FILE_DISCLOSURE_PATTERNS match typical file contents", () => {
  const passwdSample =
    "root:x:0:0:root:/root:/bin/bash\ndaemon:x:1:1:daemon:/usr/sbin:/usr/sbin/nologin";
  assert.ok(FILE_DISCLOSURE_PATTERNS.some((p) => p.test(passwdSample)));

  const winIniSample =
    "[boot loader]\ntimeout=30\ndefault=multi(0)disk(0)rdisk(0)partition(1)\\WINDOWS";
  assert.ok(FILE_DISCLOSURE_PATTERNS.some((p) => p.test(winIniSample)));

  const normalHtml = "<html><body>Hello world</body></html>";
  assert.ok(!FILE_DISCLOSURE_PATTERNS.some((p) => p.test(normalHtml)));
});
