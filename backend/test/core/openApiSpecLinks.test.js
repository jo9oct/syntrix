import test from "node:test";
import assert from "node:assert/strict";

import { extractOpenApiSpecUrls } from "../../src/core/openApiSpecLinks.js";

const BASE_URL = "https://example.com/";

test("finds a specification advertised through rel=service-desc", () => {
  const html = '<link rel="service-desc" href="/docs.json">';

  assert.deepEqual(extractOpenApiSpecUrls(html, BASE_URL), [
    "https://example.com/docs.json",
  ]);
});

test("finds a conventional OpenAPI JSON path", () => {
  const html = '<a href="/api/openapi.json">API specification</a>';

  assert.deepEqual(extractOpenApiSpecUrls(html, BASE_URL), [
    "https://example.com/api/openapi.json",
  ]);
});

test("finds a conventional Swagger JSON path", () => {
  const html = '<a href="/swagger.json">Swagger specification</a>';

  assert.deepEqual(extractOpenApiSpecUrls(html, BASE_URL), [
    "https://example.com/swagger.json",
  ]);
});

test("rejects off-origin and credential-bearing URLs", () => {
  const html = `
    <a href="https://outside.example/openapi.json">external</a>
    <a href="https://user:pass@example.com/openapi.json">credentials</a>
  `;

  assert.deepEqual(extractOpenApiSpecUrls(html, BASE_URL), []);
});

test("deduplicates URLs and removes fragments", () => {
  const html = `
    <a href="/openapi.json#first">first</a>
    <a href="/openapi.json#second">second</a>
  `;

  assert.deepEqual(extractOpenApiSpecUrls(html, BASE_URL), [
    "https://example.com/openapi.json",
  ]);
});

test("returns no candidates for invalid inputs", () => {
  assert.deepEqual(extractOpenApiSpecUrls("", BASE_URL), []);

  assert.deepEqual(
    extractOpenApiSpecUrls('<a href="/openapi.json">x</a>', ""),
    [],
  );

  assert.deepEqual(extractOpenApiSpecUrls(null, BASE_URL), []);
});
