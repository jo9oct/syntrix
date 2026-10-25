/*
 * STATUS: CREATED
 * File: test/scanners/xss/reflected.test.js
 */

import test from "node:test";
import assert from "node:assert/strict";
import { testReflectedXss } from "../../../src/scanners/xss/reflected.js";

const makeRequest = (responses) => {
  const requested = [];
  const request = async (target) => {
    requested.push(target);
    return responses.shift() ?? { response: null };
  };
  return { request, requested };
};

test("testReflectedXss returns empty signal if no reflection occurs", async () => {
  const { request } = makeRequest([
    {
      response: { status: 200, data: "<html><body>Welcome user</body></html>" },
    },
    {
      response: { status: 200, data: "<html><body>Welcome user</body></html>" },
    },
    {
      response: { status: 200, data: "<html><body>Welcome user</body></html>" },
    },
  ]);

  const result = await testReflectedXss({
    targetUrl: "https://example.com/search?q=test",
    parameter: "q",
    baselineResponse: {
      status: 200,
      data: "<html><body>Welcome user</body></html>",
    },
    request,
    marker: "sentrix_marker",
  });

  assert.equal(result.signal, null);
  assert.equal(result.tested, 3);
});

test("testReflectedXss flags unescaped reflected payload in HTML body", async () => {
  const marker = "test_marker_xyz";
  const { request } = makeRequest([
    {
      response: {
        status: 200,
        headers: { "content-type": "text/html" },
        data: `<html><body><h1>Search results for: <${marker}></h1></body></html>`,
      },
    },
  ]);

  const result = await testReflectedXss({
    targetUrl: "https://example.com/search?q=test",
    parameter: "q",
    baselineResponse: {
      status: 200,
      data: "<html><body>Search results for: test</body></html>",
    },
    request,
    marker,
  });

  assert.ok(result.signal);
  assert.equal(result.signal.confidence, "high");
  assert.equal(result.signal.severity, "high");
  assert.equal(result.signal.rawUnescaped, true);
  assert.equal(result.signal.context, "html_body");
});

test("testReflectedXss ignores markers already present in the baseline response", async () => {
  const marker = "existing_static_token";
  const { request } = makeRequest([
    {
      response: {
        status: 200,
        data: `<html><body>Static token: ${marker}</body></html>`,
      },
    },
  ]);

  const result = await testReflectedXss({
    targetUrl: "https://example.com/search?q=test",
    parameter: "q",
    baselineResponse: {
      status: 200,
      data: `<html><body>Static token: ${marker}</body></html>`,
    },
    request,
    marker,
  });

  assert.equal(result.signal, null);
});

test("testReflectedXss detects reflection inside script context", async () => {
  const marker = "script_probe_123";
  const { request } = makeRequest([
    {
      response: {
        status: 200,
        headers: { "content-type": "text/html" },
        data: `<html><head><script>var query = '<${marker}>';</script></head></html>`,
      },
    },
  ]);

  const result = await testReflectedXss({
    targetUrl: "https://example.com/profile?name=user",
    parameter: "name",
    baselineResponse: {
      status: 200,
      data: "<html><head><script>var query = 'user';</script></head></html>",
    },
    request,
    marker,
  });

  assert.ok(result.signal);
  assert.equal(result.signal.context, "script");
  assert.equal(result.signal.severity, "high");
});
