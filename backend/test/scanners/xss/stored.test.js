/*
 * STATUS: CREATED
 * File: test/scanners/xss/stored.test.js
 */

import test from "node:test";
import assert from "node:assert/strict";
import { testStoredXss } from "../../../src/scanners/xss/stored.js";

test("testStoredXss returns empty signal for GET methods without request creator", async () => {
  const result = await testStoredXss({
    targetUrl: "https://example.com/items?q=1",
    parameter: "q",
    method: "GET",
    request: async () => ({}),
  });

  assert.equal(result.signal, null);
  assert.equal(result.tested, 0);
});

test("testStoredXss detects stored XSS when injected payload is persisted in subsequent GET", async () => {
  let submittedToken = null;

  const request = async (target) => {
    // When submitting POST with payload
    if (target.method === "POST") {
      const match =
        typeof target.body === "string"
          ? target.body.match(/sentrix_stored_[^&%]+/i)
          : null;
      if (match) {
        submittedToken = match[0];
      }
      return {
        response: { status: 200, data: "Comment submitted successfully." },
      };
    }

    // Subsequent verification GET
    return {
      response: {
        status: 200,
        headers: { "content-type": "text/html" },
        data: `<html><body><div class="comments"><p><${submittedToken}></p></div></body></html>`,
      },
    };
  };

  const result = await testStoredXss({
    targetUrl: "https://example.com/comments",
    parameter: "comment",
    method: "POST",
    baselineResponse: {
      status: 200,
      data: '<html><body><div class="comments"></div></body></html>',
    },
    request,
  });

  assert.ok(result.signal);
  assert.equal(result.signal.confidence, "high");
  assert.equal(result.signal.severity, "high");
  assert.ok(result.signal.description.includes("Stored Cross-Site Scripting"));
  assert.equal(result.tested, 2);
});

test("testStoredXss does not flag if payload is not persisted in clean GET", async () => {
  const request = async (target) => {
    if (target.method === "POST") {
      return { response: { status: 200, data: "Saved." } };
    }
    return {
      response: {
        status: 200,
        data: "<html><body>No comments yet</body></html>",
      },
    };
  };

  const result = await testStoredXss({
    targetUrl: "https://example.com/comments",
    parameter: "comment",
    method: "POST",
    baselineResponse: {
      status: 200,
      data: "<html><body>No comments yet</body></html>",
    },
    request,
  });

  assert.equal(result.signal, null);
  assert.equal(result.tested, 2);
});
