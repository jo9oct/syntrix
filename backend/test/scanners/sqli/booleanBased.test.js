
/*
 * STATUS: CREATED
 * File: test/scanners/sqli/booleanBased.test.js
 */

import test from "node:test";
import assert from "node:assert/strict";
import { testBooleanBased } from "../../../src/scanners/sqli/booleanBased.js";

const baselineResponse = {
  status: 200,
  data: `<html><body>${"Product details ".repeat(10)}</body></html>`,
};

const makeRequest = (responses) => {
  const requestedUrls = [];

  const request = async (url) => {
    requestedUrls.push(url);
    return responses.shift() ?? { response: null };
  };

  return { request, requestedUrls };
};

const runScanner = (request, overrides = {}) =>
  testBooleanBased({
    targetUrl: "https://example.com/product?id=1",
    parameter: "id",
    baselineResponse,
    request,
    ...overrides,
  });

test("does not flag identical true and false responses", async () => {
  const body = baselineResponse.data;
  const { request } = makeRequest([
    { response: { status: 200, data: body } },
    { response: { status: 200, data: body } },
    { response: { status: 200, data: body } },
    { response: { status: 200, data: body } },
  ]);

  const result = await runScanner(request);

  assert.equal(result.signal, null);
  assert.equal(result.tested, 4);
});

test("flags a clear baseline-relative Boolean difference", async () => {
  const trueBody = baselineResponse.data;
  const falseBody = "<html><body>Product unavailable</body></html>";

  const { request } = makeRequest([
    { response: { status: 200, data: trueBody } },
    { response: { status: 200, data: falseBody } },
  ]);

  const result = await runScanner(request);

  assert.ok(result.signal);
  assert.equal(result.signal.confidence, "low");
  assert.ok(result.signal.evidence);
});

test("stops when a request is skipped", async () => {
  const { request, requestedUrls } = makeRequest([
    { skipped: true },
  ]);

  const result = await runScanner(request);

  assert.equal(result.skipped, true);
  assert.equal(result.tested, 0);
  assert.equal(requestedUrls.length, 1);
});


test("counts failed requests without reporting a finding", async () => {
  const { request, requestedUrls } = makeRequest([
    { response: null },
    { response: null },
    { response: null },
    { response: null },
  ]);

  const result = await runScanner(request);

  assert.equal(result.signal, null);
  assert.equal(result.tested, requestedUrls.length);
  assert.equal(result.failures, requestedUrls.length);
  assert.ok(result.failures > 0);
});


test("records status and body-length evidence", async () => {
  const trueBody = baselineResponse.data;
  const falseBody = "<html><body>Product unavailable</body></html>";

  const { request } = makeRequest([
    { response: { status: 200, data: trueBody } },
    { response: { status: 200, data: falseBody } },
  ]);

  const result = await runScanner(request);

  assert.ok(result.signal);
  assert.equal(result.signal.evidence.baselineStatus, 200);
  assert.equal(result.signal.evidence.trueConditionStatus, 200);
  assert.equal(result.signal.evidence.falseConditionStatus, 200);
  assert.ok(result.signal.evidence.trueConditionBodyLength > 0);
  assert.ok(result.signal.evidence.falseConditionBodyLength > 0);
});
