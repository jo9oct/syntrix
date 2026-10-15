// STATUS: CREATED
// File: test/core/openApiDiscovery.test.js

import test from "node:test";
import assert from "node:assert/strict";

import { extractOpenApiEndpoints } from "../../src/core/openApiDiscovery.js";

const BASE_URL = "https://example.com/";
const MAX_SOURCE_BYTES = 1024 * 1024;

test("extracts paths and HTTP methods from an OpenAPI 3 document", () => {
  const source = JSON.stringify({
    openapi: "3.0.3",
    info: { title: "Example API", version: "1.0.0" },
    paths: {
      "/users": {
        get: {},
        post: {},
        parameters: [{ name: "limit", in: "query" }],
      },
      "/users/{userId}": {
        get: {},
        patch: {},
        delete: {},
      },
    },
  });

  assert.deepEqual(extractOpenApiEndpoints({ source, baseUrl: BASE_URL }), [
    { path: "/users", method: "GET" },
    { path: "/users", method: "POST" },
    { path: "/users/{userId}", method: "GET" },
    { path: "/users/{userId}", method: "PATCH" },
    { path: "/users/{userId}", method: "DELETE" },
  ]);
});

test("extracts paths and HTTP methods from a Swagger 2 document", () => {
  const source = JSON.stringify({
    swagger: "2.0",
    info: { title: "Legacy API", version: "1.0.0" },
    paths: {
      "/products": {
        get: {},
        put: {},
      },
    },
  });

  assert.deepEqual(extractOpenApiEndpoints({ source, baseUrl: BASE_URL }), [
    { path: "/products", method: "GET" },
    { path: "/products", method: "PUT" },
  ]);
});

test("ignores path-level metadata and non-HTTP operation keys", () => {
  const source = JSON.stringify({
    openapi: "3.0.0",
    paths: {
      "/users": {
        parameters: [{ name: "id", in: "query" }],
        summary: "List users",
        get: {},
      },
    },
  });

  assert.deepEqual(extractOpenApiEndpoints({ source, baseUrl: BASE_URL }), [
    { path: "/users", method: "GET" },
  ]);
});

test("deduplicates endpoint paths and methods", () => {
  const source = JSON.stringify({
    openapi: "3.0.0",
    paths: {
      "/users": { get: {} },
    },
  });

  const result = extractOpenApiEndpoints({
    source,
    baseUrl: BASE_URL,
  });

  assert.deepEqual(result, [{ path: "/users", method: "GET" }]);
});

test("enforces the maximum endpoint count", () => {
  const source = JSON.stringify({
    openapi: "3.0.0",
    paths: {
      "/one": { get: {} },
      "/two": { post: {} },
      "/three": { delete: {} },
    },
  });

  const result = extractOpenApiEndpoints({
    source,
    baseUrl: BASE_URL,
    maxEndpoints: 2,
  });

  assert.equal(result.length, 2);
});

test("rejects invalid base URLs and credential-bearing URLs", () => {
  const source = JSON.stringify({
    openapi: "3.0.0",
    paths: { "/users": { get: {} } },
  });

  assert.deepEqual(
    extractOpenApiEndpoints({
      source,
      baseUrl: "not-a-url",
    }),
    [],
  );

  assert.deepEqual(
    extractOpenApiEndpoints({
      source,
      baseUrl: "https://user:password@example.com/",
    }),
    [],
  );
});

test("returns no endpoints for malformed or unsupported documents", () => {
  for (const source of [
    "",
    "{invalid json",
    JSON.stringify({ paths: { "/users": { get: {} } } }),
    JSON.stringify({ openapi: "3.0.0", paths: [] }),
    JSON.stringify({ swagger: "1.2", paths: { "/users": { get: {} } } }),
  ]) {
    assert.deepEqual(
      extractOpenApiEndpoints({ source, baseUrl: BASE_URL }),
      [],
    );
  }
});

test("rejects oversized specification documents", () => {
  const source = JSON.stringify({
    openapi: "3.0.0",
    description: "x".repeat(MAX_SOURCE_BYTES),
    paths: { "/users": { get: {} } },
  });

  assert.deepEqual(extractOpenApiEndpoints({ source, baseUrl: BASE_URL }), []);
});

test("rejects invalid limits", () => {
  const source = JSON.stringify({
    openapi: "3.0.0",
    paths: { "/users": { get: {} } },
  });

  for (const maxEndpoints of [0, -1, 1.5, NaN, "5"]) {
    assert.deepEqual(
      extractOpenApiEndpoints({
        source,
        baseUrl: BASE_URL,
        maxEndpoints,
      }),
      [],
    );
  }
});
