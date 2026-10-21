/*
 * STATUS: UPDATED
 * File: test/scanners/sqli/timeBased.test.js
 */

import test from "node:test";
import assert from "node:assert/strict";
import { testTimeBased } from "../../../src/scanners/sqli/timeBased.js";

const baselineResponse = {
  status: 200,
  data: "<html><body>Product details</body></html>",
  durationMs: 150,
};

const response = (durationMs, status = 200) => ({
  response: {
    status,
    data: "<html><body>Product details</body></html>",
    durationMs,
  },
});

const makeRequest = (responses) => {
  const requestedUrls = [];

  const request = async (url) => {
    requestedUrls.push(url);
    return responses.shift() ?? { response: null };
  };

  return { request, requestedUrls };
};

const runScanner = (request, overrides = {}) =>
  testTimeBased({
    targetUrl: "https://example.com/product?id=1",
    parameter: "id",
    baselineResponse,
    request,
    ...overrides,
  });

test("does not flag small timing differences", async () => {
  const { request } = makeRequest([
    response(150),
    response(160),
    response(500),
    response(600),
    response(700),
  ]);

  const result = await runScanner(request);

  assert.equal(result.signal, null);
  assert.equal(result.tested, 3);
});

test("reports a low-confidence signal only after a repeatable delay", async () => {
  const { request } = makeRequest([
    response(150),
    response(160),
    response(3000),
    response(3100),
  ]);

  const result = await runScanner(request);

  assert.ok(result.signal);
  assert.equal(result.signal.confidence, "low");
  assert.equal(
    result.signal.evidence.confirmationRepeated,
    true,
  );
  assert.deepEqual(
    result.signal.evidence.baselineDurationsMs,
    [150, 150, 160],
  );
  assert.ok(
    result.signal.evidence.timeDifferenceMs >=
      result.signal.evidence.requiredDifferenceMs,
  );
});

test("does not report a one-off timing spike", async () => {
  const { request } = makeRequest([
    response(150),
    response(160),
    response(3000),
    response(300),
    response(350),
    response(400),
  ]);

  const result = await runScanner(request);

  assert.equal(result.signal, null);
  assert.equal(result.tested, 4);
});

test("skips when baseline timing is missing", async () => {
  const { request, requestedUrls } = makeRequest([]);

  const result = await runScanner(request, {
    baselineResponse: {
      status: 200,
      data: "<html>Product details</html>",
    },
  });

  assert.equal(result.skipped, true);
  assert.equal(result.tested, 0);
  assert.equal(requestedUrls.length, 0);
});

test("skips when repeated baseline requests fail", async () => {
  const { request, requestedUrls } = makeRequest([
    { response: null },
    { response: null },
  ]);

  const result = await runScanner(request);

  assert.equal(result.skipped, true);
  assert.equal(result.signal, null);
  assert.equal(result.tested, 0);
  assert.equal(requestedUrls.length, 2);
});

test("skips when baseline timing is unstable", async () => {
  const { request } = makeRequest([
    response(100),
    response(3000),
  ]);

  const result = await runScanner(request);

  assert.equal(result.skipped, true);
  assert.equal(result.signal, null);
  assert.equal(result.tested, 0);
});

test("counts failed probe requests without reporting a finding", async () => {
  const { request } = makeRequest([
    response(150),
    response(160),
    { response: null },
    { response: null },
    { response: null },
  ]);

  const result = await runScanner(request);

  assert.equal(result.signal, null);
  assert.equal(result.tested, 3);
  assert.equal(result.failures, 3);
});

test("stops when a baseline request is skipped", async () => {
  const { request, requestedUrls } = makeRequest([
    { skipped: true },
  ]);

  const result = await runScanner(request);

  assert.equal(result.skipped, true);
  assert.equal(result.tested, 0);
  assert.equal(requestedUrls.length, 1);
});

test("stops when a timing probe is skipped", async () => {
  const { request, requestedUrls } = makeRequest([
    response(150),
    response(160),
    { skipped: true },
  ]);

  const result = await runScanner(request);

  assert.equal(result.skipped, true);
  assert.equal(result.tested, 0);
  assert.equal(requestedUrls.length, 3);
});

test("ignores unsuccessful HTTP responses", async () => {
  const { request } = makeRequest([
    response(150),
    response(160),
    response(5000, 500),
    response(5000, 500),
    response(5000, 500),
  ]);

  const result = await runScanner(request);

  assert.equal(result.signal, null);
  assert.equal(result.tested, 3);
});

test("does not probe when the initial baseline is unsuccessful", async () => {
  const { request, requestedUrls } = makeRequest([]);

  const result = await runScanner(request, {
    baselineResponse: {
      status: 500,
      data: "Internal Server Error",
      durationMs: 150,
    },
  });

  assert.equal(result.skipped, true);
  assert.equal(result.tested, 0);
  assert.equal(requestedUrls.length, 0);
});