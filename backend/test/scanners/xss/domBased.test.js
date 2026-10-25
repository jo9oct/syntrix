/*
 * STATUS: CREATED
 * File: test/scanners/xss/domBased.test.js
 */

import test from "node:test";
import assert from "node:assert/strict";
import { testDomBasedXss } from "../../../src/scanners/xss/domBased.js";

test("testDomBasedXss returns empty signal when baseline has no scripts", async () => {
  const result = await testDomBasedXss({
    targetUrl: "https://example.com/item?id=1",
    parameter: "id",
    baselineResponse: {
      status: 200,
      data: "<html><body><p>Static page without scripts</p></body></html>",
    },
    request: async () => ({}),
  });

  assert.equal(result.signal, null);
  assert.equal(result.tested, 0);
});

test("testDomBasedXss detects DOM XSS flow and references parameter", async () => {
  const baselineResponse = {
    status: 200,
    data: `
      <html>
        <head>
          <script>
            const params = new URLSearchParams(window.location.search);
            const query = params.get('q');
            document.getElementById('content').innerHTML = query;
          </script>
        </head>
        <body><div id="content"></div></body>
      </html>
    `,
  };

  const result = await testDomBasedXss({
    targetUrl: "https://example.com/search?q=test",
    parameter: "q",
    baselineResponse,
    request: async () => ({}),
  });

  assert.ok(result.signal);
  assert.equal(result.signal.source, "location.search");
  assert.equal(result.signal.sink, "innerHTML");
  assert.equal(result.signal.confidence, "high");
  assert.equal(result.signal.severity, "high");
  assert.equal(result.signal.evidence.parameterReferenced, true);
});

test("testDomBasedXss handles document.write sinks from location.hash", async () => {
  const baselineResponse = {
    status: 200,
    data: `
      <html>
        <script>
          const hashVal = location.hash.substring(1);
          document.write(hashVal);
        </script>
      </html>
    `,
  };

  const result = await testDomBasedXss({
    targetUrl: "https://example.com/index.html",
    parameter: "hash",
    baselineResponse,
    request: async () => ({}),
  });

  assert.ok(result.signal);
  assert.equal(result.signal.source, "location.hash");
  assert.equal(result.signal.sink, "document.write");
});
