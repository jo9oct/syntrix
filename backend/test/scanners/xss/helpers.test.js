/*
 * STATUS: CREATED
 * File: test/scanners/xss/helpers.test.js
 */

import test from "node:test";
import assert from "node:assert/strict";
import {
  analyzeReflectionContext,
  analyzeDomSourcesAndSinks,
} from "../../../src/scanners/xss/helpers.js";

test("analyzeReflectionContext returns null for missing or non-matching input", () => {
  assert.equal(analyzeReflectionContext(null, "marker"), null);
  assert.equal(analyzeReflectionContext("<html></html>", ""), null);
  assert.equal(analyzeReflectionContext("<html></html>", "marker"), null);
});

test("analyzeReflectionContext detects reflection inside a <script> tag", () => {
  const html = `
    <html>
      <head>
        <script>
          var query = 'sentrix_xss_probe';
          console.log(query);
        </script>
      </head>
      <body><div>Hello</div></body>
    </html>
  `;
  const result = analyzeReflectionContext(html, "sentrix_xss_probe");
  assert.ok(result);
  assert.equal(result.context, "script");
  assert.equal(result.executable, true);
  assert.equal(result.rawUnescaped, true);
});

test("analyzeReflectionContext detects reflection inside event handler attributes", () => {
  const html =
    "<button onclick=\"handleClick('sentrix_xss_probe')\">Click</button>";
  const result = analyzeReflectionContext(html, "sentrix_xss_probe");
  assert.ok(result);
  assert.equal(result.context, "event_handler");
  assert.equal(result.executable, true);
  assert.equal(result.attributeName, "onclick");
});

test("analyzeReflectionContext detects reflection inside href attributes", () => {
  const html = "<a href=\"javascript:alert('sentrix_xss_probe')\">Link</a>";
  const result = analyzeReflectionContext(html, "sentrix_xss_probe");
  assert.ok(result);
  assert.equal(result.context, "href");
  assert.equal(result.executable, true);
  assert.equal(result.attributeName, "href");
});

test("analyzeReflectionContext detects unescaped HTML body injection", () => {
  const html = "<div><h1><sentrix_xss_probe></h1></div>";
  const result = analyzeReflectionContext(html, "sentrix_xss_probe");
  assert.ok(result);
  assert.equal(result.context, "html_body");
  assert.equal(result.rawUnescaped, true);
  assert.equal(result.executable, true);
});

test("analyzeReflectionContext distinguishes HTML-escaped reflections", () => {
  const html = "<div><h1>&lt;sentrix_xss_probe&gt;</h1></div>";
  const result = analyzeReflectionContext(html, "sentrix_xss_probe");
  assert.ok(result);
  assert.equal(result.context, "html_body");
  assert.equal(result.rawUnescaped, false);
  assert.equal(result.executable, false);
});

test("analyzeDomSourcesAndSinks finds dangerous DOM flows", () => {
  const html = `
    <html>
      <body>
        <div id="target"></div>
        <script>
          const searchParams = new URLSearchParams(window.location.search);
          const term = searchParams.get('search');
          document.getElementById('target').innerHTML = term;
        </script>
      </body>
    </html>
  `;

  const findings = analyzeDomSourcesAndSinks(html, "search");
  assert.ok(findings.length > 0);
  const match = findings.find((f) => f.sink === "innerHTML");
  assert.ok(match);
  assert.equal(match.parameterReferenced, true);
  assert.equal(match.severity, "high");
});

test("analyzeDomSourcesAndSinks returns empty array when no dangerous sinks exist", () => {
  const html = `
    <html>
      <script>
        const query = window.location.search;
        console.log("Safe logging", query);
      </script>
    </html>
  `;
  const findings = analyzeDomSourcesAndSinks(html, "q");
  assert.deepEqual(findings, []);
});
