// STATUS: CREATED
// File: test/core/openApiCrawler.test.js

import test from "node:test";
import assert from "node:assert/strict";

import { crawl } from "../../src/core/crawler.js";
import { createScope } from "../../src/core/scope.js";

const START_URL = "https://example.com/";
const SPEC_URL = "https://example.com/openapi.json";
const OUTSIDE_SPEC_URL = "https://outside.example/openapi.json";

const createLimiter = () => ({
  acquire: async () => {},
});

const createScopeForTest = () => createScope(START_URL);

const createOpenApiDocument = () =>
  JSON.stringify({
    openapi: "3.0.3",
    info: {
      title: "Test API",
      version: "1.0.0",
    },
    paths: {
      "/api/users": {
        get: {
          responses: { 200: { description: "OK" } },
        },
      },
      "/api/users/{id}": {
        get: {
          responses: { 200: { description: "OK" } },
        },
        delete: {
          responses: { 204: { description: "Deleted" } },
        },
      },
    },
  });

const createResponse = ({
  body = "",
  contentType = "text/html; charset=utf-8",
  statusCode = 200,
} = {}) => ({
  statusCode,
  headers: {
    "content-type": contentType,
  },
  body,
});

const runCrawl = async ({
  homepageBody = "<html><body></body></html>",
  specBody = createOpenApiDocument(),
  specContentType = "application/json",
  maxPaths = 10,
  maxDepth = 1,
  signal,
  onPage,
  validateSafeUrl = async () => {},
} = {}) => {
  const requestedUrls = [];
  const validatedUrls = [];
  const pages = [];

  const requestPage = async (url, options = {}) => {
    requestedUrls.push(url);

    if (options.signal?.aborted) {
      throw new Error("Request aborted");
    }

    if (url === START_URL) {
      return createResponse({
        body: homepageBody,
      });
    }

    if (url === SPEC_URL) {
      return createResponse({
        body: specBody,
        contentType: specContentType,
      });
    }

    return createResponse({
      body: "<html><body></body></html>",
    });
  };

  const result = await crawl({
    startUrl: START_URL,
    scope: createScopeForTest(),
    maxPaths,
    maxDepth,
    requestsPerSecond: 1000,
    signal,
    requestPage,
    discoverSitemaps: async () => [],
    launch: async () => null,
    createLimiter,
    validateSafeUrl: async (url, ...args) => {
      validatedUrls.push(url);
      return validateSafeUrl(url, ...args);
    },
    onPage: async (page) => {
      pages.push(page);

      if (onPage) {
        await onPage(page);
      }
    },
  });

  return {
    result,
    requestedUrls,
    validatedUrls,
    pages,
  };
};

test("discovers an OpenAPI JSON specification linked from HTML", async () => {
  const { requestedUrls } = await runCrawl({
    homepageBody: `
      <html>
        <head>
          <link
            rel="service-desc"
            type="application/json"
            href="/openapi.json"
          >
        </head>
        <body></body>
      </html>
    `,
  });

  assert.ok(requestedUrls.includes(START_URL));

  // This assertion defines the expected integration behavior.
  assert.ok(
    requestedUrls.includes(SPEC_URL),
    "the linked OpenAPI specification should be requested",
  );
});

test("does not request documented API operations automatically", async () => {
  const { requestedUrls } = await runCrawl({
    homepageBody: `
      <html>
        <head>
          <link rel="service-desc" href="/openapi.json">
        </head>
      </html>
    `,
  });

  assert.equal(requestedUrls.includes("https://example.com/api/users"), false);

  assert.equal(
    requestedUrls.includes("https://example.com/api/users/{id}"),
    false,
  );
});

test("does not fetch an off-origin OpenAPI specification", async () => {
  const { requestedUrls } = await runCrawl({
    homepageBody: `
      <html>
        <head>
          <link
            rel="service-desc"
            href="${OUTSIDE_SPEC_URL}"
          >
        </head>
      </html>
    `,
  });

  assert.equal(requestedUrls.includes(OUTSIDE_SPEC_URL), false);
});

test("does not discover a specification when maxDepth is zero", async () => {
  const { requestedUrls, result } = await runCrawl({
    maxDepth: 0,
    homepageBody: `
      <html>
        <head>
          <link rel="service-desc" href="/openapi.json">
        </head>
      </html>
    `,
  });

  assert.deepEqual(requestedUrls, [START_URL]);
  assert.equal(result.visited, 1);
});

test("does not fetch a specification after cancellation", async () => {
  const controller = new AbortController();

  const { requestedUrls, result } = await runCrawl({
    signal: controller.signal,
    homepageBody: `
      <html>
        <head>
          <link rel="service-desc" href="/openapi.json">
        </head>
      </html>
    `,
    onPage: async () => controller.abort(),
  });

  assert.deepEqual(requestedUrls, [START_URL]);
  assert.equal(result.cancelled, true);
});

test("uses the safe URL validator for specification requests", async () => {
  const { validatedUrls } = await runCrawl({
    homepageBody: `
      <html>
        <head>
          <link rel="service-desc" href="/openapi.json">
        </head>
      </html>
    `,
  });

  assert.ok(
    validatedUrls.includes(SPEC_URL),
    "the specification URL must pass through the injected safety validator",
  );
});

test("returns discovered OpenAPI endpoints in the final crawl result", async () => {
  const { result } = await runCrawl({
    homepageBody: `
      <html>
        <head>
          <link rel="service-desc" href="/openapi.json">
        </head>
        <body></body>
      </html>
    `,
  });

  const homepage = result.pages.find((page) => page.url === START_URL);

  assert.ok(homepage, "homepage should be in the final crawl result");
  assert.ok(
    homepage.openApiEndpoints.some(
      (endpoint) => endpoint.method === "GET" && endpoint.path === "/api/users",
    ),
    "the final result should expose discovered API endpoint metadata",
  );
});

test("does not exceed the per-page OpenAPI endpoint limit", async () => {
  const paths = {};

  for (let index = 0; index < 510; index += 1) {
    paths[`/api/endpoint-${index}`] = {
      get: { responses: { 200: { description: "OK" } } },
    };
  }

  const { result } = await runCrawl({
    homepageBody: `
      <html>
        <head>
          <link rel="service-desc" href="/openapi.json">
        </head>
      </html>
    `,
    specBody: JSON.stringify({
      openapi: "3.0.3",
      info: { title: "Test API", version: "1.0.0" },
      paths,
    }),
  });

  const homepage = result.pages.find((page) => page.url === START_URL);

  assert.ok(homepage);
  assert.ok(
    homepage.openApiEndpoints.length <= 500,
    "endpoint metadata must remain capped at 500 per page",
  );
});

test("does not fetch the same OpenAPI specification more than once across pages", async () => {
  const requestedUrls = [];
  const secondPageUrl = "https://example.com/second";

  const requestPage = async (url) => {
    requestedUrls.push(url);

    if (url === START_URL) {
      return createResponse({
        body: `
          <html>
            <head>
              <link rel="service-desc" href="/openapi.json">
            </head>
            <body><a href="/second">Second page</a></body>
          </html>
        `,
      });
    }

    if (url === secondPageUrl) {
      return createResponse({
        body: `
          <html>
            <head>
              <link rel="service-desc" href="/openapi.json">
            </head>
          </html>
        `,
      });
    }

    if (url === SPEC_URL) {
      return createResponse({
        body: createOpenApiDocument(),
        contentType: "application/json",
      });
    }

    return createResponse();
  };

  await crawl({
    startUrl: START_URL,
    scope: createScopeForTest(),
    maxPaths: 5,
    maxDepth: 2,
    requestsPerSecond: 1000,
    requestPage,
    discoverSitemaps: async () => [],
    launch: async () => null,
    validateSafeUrl: async () => {},
    createLimiter,
  });

  assert.equal(
    requestedUrls.filter((url) => url === SPEC_URL).length,
    1,
    "the same specification should be fetched only once during a crawl",
  );
});
