
/*
 * STATUS: CREATED
 * File: test/scanners/sqli/unionBased.test.js
 */

import test from "node:test";
import assert from "node:assert/strict";
import { testUnionBased } from "../../../src/scanners/sqli/unionBased.js";

const baselineResponse = {
  status: 200,
  data: "<html><body>Product details</body></html>",
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
  testUnionBased({
    targetUrl: "https://example.com/product?id=1",
    parameter: "id",
    baselineResponse,
    request,
    ...overrides,
  });

test("does not flag responses without the marker", async () => {
  const { request } = makeRequest([
    { response: { status: 200, data: "<html>Product details</html>" } },
    { response: { status: 200, data: "<html>Product details</html>" } },
  ]);

  const result = await runScanner(request);

  assert.equal(result.signal, null);
  assert.equal(result.tested, 5);
});

test("does not flag a marker that already exists in baseline", async () => {
  const baseline = {
    status: 200,
    data: "<html>jo_sqli_union_probe_7f3a</html>",
  };

  const { request } = makeRequest([
    { response: { status: 200, data: "<html>jo_sqli_union_probe_7f3a</html>" } },
  ]);

  const result = await runScanner(request, {
    baselineResponse: baseline,
  });

  assert.equal(result.signal, null);
});

test("does not flag a response containing the original SQL expression", async () => {
  const { request } = makeRequest([
    {
      response: {
        status: 200,
        data: "Input: UNION SELECT jo_sqli_union_probe_7f3a",
      },
    },
  ]);

  const result = await runScanner(request);

  assert.equal(result.signal, null);
});

test("records a low-confidence signal when a new marker appears", async () => {
  const { request } = makeRequest([
    {
      response: {
        status: 200,
        data: "<html><body>jo_sqli_union_probe_7f3a</body></html>",
      },
    },
  ]);

  const result = await runScanner(request);

  assert.ok(result.signal);
  assert.equal(result.signal.confidence, "low");
  assert.equal(result.signal.evidence.markerPresentInBaseline, false);
  assert.equal(result.signal.evidence.markerPresentInResponse, true);
});

test("stops when a request is skipped", async () => {
  const { request } = makeRequest([{ skipped: true }]);

  const result = await runScanner(request);

  assert.equal(result.skipped, true);
  assert.equal(result.tested, 0);
});

test("counts failed requests without creating a finding", async () => {
  const { request } = makeRequest([
    { response: null },
    { response: null },
    { response: null },
    { response: null },
    { response: null },
  ]);

  const result = await runScanner(request);

  assert.equal(result.signal, null);
  assert.equal(result.tested, 5);
  assert.equal(result.failures, 5);
});
