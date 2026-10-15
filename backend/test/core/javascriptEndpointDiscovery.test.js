import test from "node:test";
import assert from "node:assert/strict";

import { extractJavaScriptEndpoints } from "../../src/core/javascriptEndpointDiscovery.js";

const SCRIPT_URL = "https://example.com/assets/app.js";
const PAGE_URL = "https://example.com/";

test("extracts API endpoint paths from JavaScript source", () => {
  const endpoints = extractJavaScriptEndpoints({
    source: `fetch('/api/users'); axios.get('/api/products'); const endpoint = '/api/v1/orders'; fetch('/graphql');`,
    scriptUrl: SCRIPT_URL,
    pageUrl: PAGE_URL,
  });

  assert.deepEqual(endpoints, [
    "https://example.com/api/users",
    "https://example.com/api/products",
    "https://example.com/api/v1/orders",
    "https://example.com/graphql",
  ]);
});

test("resolves relative endpoints against the page URL", () => {
  const endpoints = extractJavaScriptEndpoints({
    source: `fetch('api/users');`,
    scriptUrl: SCRIPT_URL,
    pageUrl: "https://example.com/dashboard/",
  });

  assert.deepEqual(endpoints, ["https://example.com/dashboard/api/users"]);
});

test("rejects endpoints pointing to another origin", () => {
  const endpoints = extractJavaScriptEndpoints({
    source: `fetch('https://outside.example/api/users'); fetch('//outside.example/api/products'); fetch('/api/orders');`,
    scriptUrl: SCRIPT_URL,
    pageUrl: PAGE_URL,
  });

  assert.deepEqual(endpoints, ["https://example.com/api/orders"]);
});

test("rejects unsafe schemes and credential-bearing URLs", () => {
  const endpoints = extractJavaScriptEndpoints({
    source: `fetch('javascript:alert(1)'); fetch('data:text/plain,hello'); fetch('https://user:password@example.com/api/private'); fetch('/api/safe');`,
    scriptUrl: SCRIPT_URL,
    pageUrl: PAGE_URL,
  });

  assert.deepEqual(endpoints, ["https://example.com/api/safe"]);
});

test("removes duplicate endpoints", () => {
  const endpoints = extractJavaScriptEndpoints({
    source: `fetch('/api/users'); axios.get('/api/users'); const endpoint = '/api/users';`,
    scriptUrl: SCRIPT_URL,
    pageUrl: PAGE_URL,
  });

  assert.deepEqual(endpoints, ["https://example.com/api/users"]);
});

test("ignores ordinary asset paths", () => {
  const endpoints = extractJavaScriptEndpoints({
    source: `const image = '/images/logo.png'; const stylesheet = '/css/app.css'; const script = '/assets/vendor.js'; fetch('/api/users');`,
    scriptUrl: SCRIPT_URL,
    pageUrl: PAGE_URL,
  });

  assert.deepEqual(endpoints, ["https://example.com/api/users"]);
});

test("enforces the maximum endpoint count", () => {
  const endpoints = extractJavaScriptEndpoints({
    source: `fetch('/api/one'); fetch('/api/two'); fetch('/api/three');`,
    scriptUrl: SCRIPT_URL,
    pageUrl: PAGE_URL,
    maxEndpoints: 2,
  });

  assert.equal(endpoints.length, 2);
});

test("returns no endpoints for empty or invalid source", () => {
  assert.deepEqual(
    extractJavaScriptEndpoints({
      source: "",
      scriptUrl: SCRIPT_URL,
      pageUrl: PAGE_URL,
    }),
    [],
  );

  assert.deepEqual(
    extractJavaScriptEndpoints({
      source: null,
      scriptUrl: SCRIPT_URL,
      pageUrl: PAGE_URL,
    }),
    [],
  );
});
