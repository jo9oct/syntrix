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
    {
      response: { status: 200, data: "<html>jo_sqli_union_probe_7f3a</html>" },
    },
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

test("detects UNION SQL injection via NULL column count determination (PortSwigger Academy pattern)", async () => {
  const request = async (url) => {
    const urlStr = typeof url === "string" ? url : url.url;
    const decoded = decodeURIComponent(urlStr);
    const nullMatches = decoded.match(/\bNULL\b/gi);
    const nullCount = nullMatches ? nullMatches.length : 0;

    // In PortSwigger's lab, exactly 3 columns succeeds; 1, 2, 4, 5 throw 500 error
    if (nullCount === 3) {
      return {
        response: {
          status: 200,
          data: "<html><body>Category Results: 12 Products</body></html>",
        },
      };
    }

    return {
      response: {
        status: 500,
        data: "Internal Server Error: ERROR: each UNION query must have the same number of columns",
      },
    };
  };

  const result = await runScanner(request);

  assert.ok(result.signal, "Expected a signal for matched column count");
  assert.equal(result.signal.confidence, "medium");
  assert.equal(result.signal.evidence.matchedColumnCount, 3);
  assert.ok(result.signal.description.includes("3 UNION column"));
});

test("detects UNION SQL injection with column determination and data reflection", async () => {
  const request = async (url) => {
    const urlStr = typeof url === "string" ? url : url.url;
    const decoded = decodeURIComponent(urlStr);

    if (decoded.includes("NULL,'jo_sqli_union_probe_7f3a',NULL")) {
      return {
        response: {
          status: 200,
          data: "<html><body>Product name: jo_sqli_union_probe_7f3a</body></html>",
        },
      };
    }

    const nullMatches = decoded.match(/\bNULL\b/gi);
    const nullCount = nullMatches ? nullMatches.length : 0;

    if (nullCount === 3) {
      return {
        response: {
          status: 200,
          data: "<html><body>Category Results</body></html>",
        },
      };
    }

    return {
      response: {
        status: 500,
        data: "Internal Server Error",
      },
    };
  };

  const result = await runScanner(request);

  assert.ok(result.signal);
  assert.equal(result.signal.confidence, "high");
  assert.equal(result.signal.evidence.matchedColumnCount, 3);
  assert.equal(result.signal.evidence.reflectedColumn, 2);
  assert.equal(result.signal.evidence.markerPresentInResponse, true);
});
