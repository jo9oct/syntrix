
/*
 * STATUS: CREATED
 * File: test/scanners/sqli/errorBased.test.js
 */

import test from "node:test";
import assert from "node:assert/strict";
import { testErrorBased } from "../../../src/scanners/sqli/errorBased.js";

const baselineResponse = {
  status: 200,
  data: "<html><body>Product details</body></html>",
};

const makeRequest = (responses) => {
  const requestedUrls = [];

  const request = async (url) => {
    requestedUrls.push(url);
    const response = responses.shift();

    return response ?? {
      response: {
        status: 200,
        data: "<html><body>Product details</body></html>",
      },
    };
  };

  return { request, requestedUrls };
};

test("does not flag ordinary responses", async () => {
  const { request, requestedUrls } = makeRequest([
    { response: { status: 200, data: "<html><body>Product details</body></html>" } },
    { response: { status: 200, data: "<html><body>Product details</body></html>" } },
  ]);

  const result = await testErrorBased({
    targetUrl: "https://example.com/product?id=1",
    parameter: "id",
    baselineResponse,
    request,
  });

  assert.equal(result.signal, null);
  assert.equal(result.tested, 2);
  assert.equal(requestedUrls.length, 2);
});

test("flags a newly observed SQL error as low confidence", async () => {
  const { request } = makeRequest([
    {
      response: {
        status: 500,
        data: "ERROR: syntax error at or near input",
      },
    },
  ]);

  const result = await testErrorBased({
    targetUrl: "https://example.com/product?id=1",
    parameter: "id",
    baselineResponse,
    request,
  });

  assert.ok(result.signal);
  assert.equal(result.signal.confidence, "low");
  assert.match(result.signal.description, /further verification is required/i);
});

test("does not flag a matching SQL error already present in baseline", async () => {
  const baselineWithError = {
    status: 500,
    data: "ERROR: syntax error at or near input",
  };

  const { request } = makeRequest([
    {
      response: {
        status: 500,
        data: "ERROR: syntax error at or near input",
      },
    },
    {
      response: {
        status: 500,
        data: "ERROR: syntax error at or near input",
      },
    },
  ]);

  const result = await testErrorBased({
    targetUrl: "https://example.com/product?id=1",
    parameter: "id",
    baselineResponse: baselineWithError,
    request,
  });

  assert.equal(result.signal, null);
});

test("stops when the request layer reports a skipped request", async () => {
  const { request, requestedUrls } = makeRequest([
    { skipped: true },
  ]);

  const result = await testErrorBased({
    targetUrl: "https://example.com/product?id=1",
    parameter: "id",
    baselineResponse,
    request,
  });

  assert.equal(result.skipped, true);
  assert.equal(result.tested, 0);
  assert.equal(requestedUrls.length, 1);
});

test("counts failed requests without creating a finding", async () => {
  const { request } = makeRequest([
    { error: new Error("network failure") },
    { response: null },
  ]);

  const result = await testErrorBased({
    targetUrl: "https://example.com/product?id=1",
    parameter: "id",
    baselineResponse,
    request,
  });

  assert.equal(result.signal, null);
  assert.equal(result.tested, 2);
  assert.equal(result.failures, 2);
});
