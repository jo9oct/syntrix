/* STATUS: UPDATED */
/* FILE: test/core/httpClient.test.js */

import test from "node:test";
import assert from "node:assert/strict";

import {
  createHttpClient,
  executeRequest,
  validateOutboundUrl,
  validateTimeout,
  redactHeaders,
} from "../../src/core/httpClient.js";

test("rejects an empty outbound URL", async () => {
  await assert.rejects(executeRequest({ url: "" }), /Outbound URL is required/);
});

test("rejects malformed outbound URLs", () => {
  assert.throws(
    () => validateOutboundUrl("not-a-valid-url"),
    /Outbound URL is invalid/,
  );
});

test("rejects non-HTTP protocols", () => {
  assert.throws(
    () => validateOutboundUrl("file:///etc/passwd"),
    /HTTP or HTTPS/,
  );

  assert.throws(
    () => validateOutboundUrl("ftp://example.com/file"),
    /HTTP or HTTPS/,
  );
});

test("rejects embedded URL credentials", () => {
  assert.throws(
    () => validateOutboundUrl("http://user:password@example.com"),
    /embedded credentials/,
  );
});

test("accepts syntactically valid HTTP and HTTPS URLs", () => {
  assert.equal(
    validateOutboundUrl("http://example.com/"),
    "http://example.com/",
  );

  assert.equal(
    validateOutboundUrl("https://example.com/path"),
    "https://example.com/path",
  );
});

test("redacts sensitive request headers", () => {
  const result = redactHeaders({
    Authorization: "Bearer secret-token",
    Cookie: "session=secret",
    "Content-Type": "application/json",
  });

  assert.equal(result.Authorization, "[REDACTED]");
  assert.equal(result.Cookie, "[REDACTED]");
  assert.equal(result["Content-Type"], "application/json");
});

test("rejects a loopback destination before making a request", async () => {
  await assert.rejects(
    executeRequest({ url: "http://127.0.0.1/" }),
    /not permitted|loopback|private/i,
  );
});

test("rejects a private IPv4-mapped IPv6 destination", async () => {
  await assert.rejects(
    executeRequest({
      url: "http://[::ffff:127.0.0.1]/",
    }),
    /not permitted|loopback|private/i,
  );
});

// Timeout validation

test("accepts the minimum request timeout", () => {
  assert.equal(validateTimeout(100), 100);
});

test("accepts the maximum request timeout", () => {
  assert.equal(validateTimeout(120000), 120000);
});

test("rejects a zero timeout", () => {
  assert.throws(
    () => validateTimeout(0),
    /between 100 and 120000 milliseconds/,
  );
});

test("rejects negative timeouts", () => {
  assert.throws(
    () => validateTimeout(-100),
    /between 100 and 120000 milliseconds/,
  );
});

test("rejects timeouts above the maximum", () => {
  assert.throws(
    () => validateTimeout(120001),
    /between 100 and 120000 milliseconds/,
  );
});

test("rejects fractional timeouts", () => {
  assert.throws(
    () => validateTimeout(100.5),
    /between 100 and 120000 milliseconds/,
  );
});

test("rejects string timeouts", () => {
  assert.throws(
    () => validateTimeout("1000"),
    /between 100 and 120000 milliseconds/,
  );
});

test("rejects NaN and non-finite timeouts", () => {
  for (const timeout of [
    Number.NaN,
    Number.POSITIVE_INFINITY,
    Number.NEGATIVE_INFINITY,
  ]) {
    assert.throws(
      () => validateTimeout(timeout),
      /between 100 and 120000 milliseconds/,
    );
  }
});

test("createHttpClient rejects invalid timeout values", () => {
  for (const timeout of [0, -1, 99, 120001, 100.5, "1000"]) {
    assert.throws(
      () => createHttpClient({ timeout }),
      /between 100 and 120000 milliseconds/,
    );
  }
});

test("createHttpClient accepts valid timeout boundaries", (t) => {
  for (const timeout of [100, 120000]) {
    const resources = createHttpClient({ timeout });

    t.after(() => {
      resources.httpAgent.destroy();
      resources.httpsAgent.destroy();
    });

    assert.equal(resources.client.defaults.timeout, timeout);
  }
});

test("executeRequest rejects an invalid timeout before connecting", async () => {
  for (const timeout of [0, -1, 120001, 100.5, "1000"]) {
    await assert.rejects(
      executeRequest({
        url: "http://127.0.0.1/",
        timeout,
      }),
      /between 100 and 120000 milliseconds/,
    );
  }
});

test("executeRequest validates the timeoutMs alias", async () => {
  await assert.rejects(
    executeRequest({
      url: "http://127.0.0.1/",
      timeoutMs: 0,
    }),
    /between 100 and 120000 milliseconds/,
  );
});
