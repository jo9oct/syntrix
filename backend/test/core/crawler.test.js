// STATUS: UPDATED
// File: test/core/crawler.test.js

import test from "node:test";
import assert from "node:assert/strict";

import { crawl } from "../../src/core/crawler.js";
import { createScope } from "../../src/core/scope.js";

const START_URL = "https://example.com/";
const SITEMAP_PAGE = "https://example.com/from-sitemap";
const HTML_PAGE = "https://example.com/from-html";
const NEXT_PAGE = "https://example.com/page/2";
const OUT_OF_SCOPE_URL = "https://outside.example/secret";
const SCRIPT_URL = "https://example.com/assets/app.js";
const API_USERS_URL = "https://example.com/api/users";
const GRAPHQL_URL = "https://example.com/graphql";

const createTestScope = () => createScope(START_URL);

const createLimiter = () => ({
  acquire: async () => {},
});

const createHtmlResponse = (links = []) => ({
  statusCode: 200,
  headers: {
    "content-type": "text/html; charset=utf-8",
  },
  body: [
    "<!doctype html>",
    "<html><body>",
    ...links.map((url) => `<a href="${url}">page</a>`),
    "</body></html>",
  ].join(""),
});

const createHarness = ({
  sitemapUrls = [],
  sitemapError = null,
  requestErrorUrls = [],
  htmlLinks = [],
  homepageHtml = null,
  dynamicLinks = null,
  dynamicForms = [],
  browserRequests = [],
  maxPaths = 10,
  maxDepth = 2,
  onPage = null,
  signal,
} = {}) => {
  const requestedUrls = [];
  let sitemapCalls = 0;

  const requestPage = async (url) => {
    requestedUrls.push(url);

    if (requestErrorUrls.includes(url)) {
      throw new Error("Simulated request failure");
    }

    if (url === START_URL && homepageHtml !== null) {
      return {
        statusCode: 200,
        headers: {
          "content-type": "text/html; charset=utf-8",
        },
        body: homepageHtml,
      };
    }

    if (url === START_URL) {
      return createHtmlResponse(htmlLinks);
    }

    return createHtmlResponse();
  };

  const discoverSitemaps = async () => {
    sitemapCalls += 1;

    if (sitemapError) {
      throw sitemapError;
    }

    return sitemapUrls;
  };

  const launch = async () => {
    if (
      dynamicLinks === null &&
      dynamicForms.length === 0 &&
      browserRequests.length === 0
    ) {
      return null;
    }

    const listeners = new Map();

    const page = {
      setDefaultNavigationTimeout() {},
      setDefaultTimeout() {},

      setExtraHTTPHeaders: async () => {},
      setRequestInterception: async () => {},

      on(eventName, callback) {
        if (!listeners.has(eventName)) {
          listeners.set(eventName, []);
        }

        listeners.get(eventName).push(callback);
      },

      async goto() {
        for (const configured of browserRequests) {
          let resolveOutcome;

          const continued = new Promise((resolve) => {
            resolveOutcome = resolve;
          });

          let outcomeResolved = false;

          const finishRequest = (outcome) => {
            if (outcomeResolved) {
              return;
            }

            outcomeResolved = true;
            resolveOutcome(outcome);
          };

          const request = {
            url: () => configured.url,
            method: () => configured.method ?? "GET",
            resourceType: () => configured.resourceType ?? "fetch",
            headers: () => configured.headers ?? {},
            postData: () => configured.postData ?? undefined,

            continue: async () => {
              finishRequest("continued");
            },

            abort: async () => {
              finishRequest("aborted");
            },
          };

          for (const callback of listeners.get("request") ?? []) {
            callback(request);
          }

          const outcome = await continued;

          if (outcome !== "continued") {
            continue;
          }

          const response = {
            request: () => request,
            status: () => configured.statusCode ?? 200,
          };

          for (const callback of listeners.get("response") ?? []) {
            callback(response);
          }
        }
      },

      content: async () => homepageHtml ?? createHtmlResponse(htmlLinks).body,

      evaluate: async () => ({
        inputs: [],
        forms: dynamicForms,
        discoveredLinks: dynamicLinks ?? [],
      }),

      close: async () => {},
    };

    return {
      newPage: async () => page,
      close: async () => {},
    };
  };

  const run = () =>
    crawl({
      startUrl: START_URL,
      scope: createTestScope(),
      maxPaths,
      maxDepth,
      requestsPerSecond: 1000,
      signal,
      onPage,
      requestPage,
      discoverSitemaps,
      launch,
      validateSafeUrl: async () => {},
      createLimiter,
    });

  return {
    run,
    requestedUrls,

    get sitemapCalls() {
      return sitemapCalls;
    },
  };
};

// Sitemap discovery

test("crawls URLs discovered through a sitemap", async () => {
  const harness = createHarness({
    sitemapUrls: [SITEMAP_PAGE],
  });

  const result = await harness.run();

  assert.deepEqual(harness.requestedUrls, [START_URL, SITEMAP_PAGE]);
  assert.equal(harness.sitemapCalls, 1);
  assert.equal(result.visited, 2);
  assert.equal(result.pages.length, 2);
});

test("attempts sitemap discovery when the homepage request fails", async () => {
  const harness = createHarness({
    requestErrorUrls: [START_URL],
    sitemapUrls: [SITEMAP_PAGE],
  });

  const result = await harness.run();

  assert.deepEqual(harness.requestedUrls, [START_URL, SITEMAP_PAGE]);
  assert.equal(harness.sitemapCalls, 1);
  assert.equal(result.pages[0].status, "failed");
  assert.equal(result.pages[1].status, "success");
});

test("continues ordinary HTML crawling if sitemap discovery fails", async () => {
  const harness = createHarness({
    sitemapError: new Error("Simulated sitemap failure"),
    htmlLinks: [HTML_PAGE],
  });

  const result = await harness.run();

  assert.deepEqual(harness.requestedUrls, [START_URL, HTML_PAGE]);
  assert.equal(harness.sitemapCalls, 1);
  assert.equal(result.pages.length, 2);
});

test("crawls a URL discovered in both HTML and a sitemap only once", async () => {
  const harness = createHarness({
    sitemapUrls: [HTML_PAGE],
    htmlLinks: [HTML_PAGE],
  });

  await harness.run();

  assert.equal(
    harness.requestedUrls.filter((url) => url === HTML_PAGE).length,
    1,
  );
});

test("rejects out-of-scope sitemap URLs", async () => {
  const harness = createHarness({
    sitemapUrls: [OUT_OF_SCOPE_URL],
  });

  await harness.run();

  assert.equal(harness.requestedUrls.includes(OUT_OF_SCOPE_URL), false);
});

test("respects maxPaths when queuing sitemap URLs", async () => {
  const harness = createHarness({
    sitemapUrls: [
      SITEMAP_PAGE,
      "https://example.com/another-page",
      "https://example.com/third-page",
    ],
    maxPaths: 2,
  });

  const result = await harness.run();

  assert.equal(result.visited, 2);
  assert.equal(result.pages.length, 2);
  assert.equal(harness.requestedUrls.length, 2);
});

test("does not discover sitemaps when maxDepth is zero", async () => {
  const harness = createHarness({
    sitemapUrls: [SITEMAP_PAGE],
    maxDepth: 0,
  });

  const result = await harness.run();

  assert.deepEqual(harness.requestedUrls, [START_URL]);
  assert.equal(harness.sitemapCalls, 0);
  assert.equal(result.visited, 1);
});

test("stops before sitemap discovery if onPage cancels the crawl", async () => {
  const controller = new AbortController();

  const harness = createHarness({
    sitemapUrls: [SITEMAP_PAGE],
    signal: controller.signal,
    onPage: async () => controller.abort(),
  });

  const result = await harness.run();

  assert.deepEqual(harness.requestedUrls, [START_URL]);
  assert.equal(harness.sitemapCalls, 0);
  assert.equal(result.cancelled, true);
});

// Pagination and canonical URLs

test("discovers and crawls an explicit rel-next link", async () => {
  const harness = createHarness({
    homepageHtml: `
      <!doctype html>
      <html>
        <head><link rel="next" href="/page/2"></head>
        <body>First page</body>
      </html>
    `,
  });

  const result = await harness.run();

  assert.deepEqual(harness.requestedUrls, [START_URL, NEXT_PAGE]);
  assert.equal(result.visited, 2);
});

test("crawls a rel-next URL only once when an anchor also links to it", async () => {
  const harness = createHarness({
    homepageHtml: `
      <!doctype html>
      <html>
        <head><link rel="next" href="/page/2"></head>
        <body><a href="/page/2">Next</a></body>
      </html>
    `,
  });

  await harness.run();

  assert.equal(
    harness.requestedUrls.filter((url) => url === NEXT_PAGE).length,
    1,
  );
});

test("rejects an out-of-scope rel-next URL", async () => {
  const harness = createHarness({
    homepageHtml: `
      <!doctype html>
      <html>
        <head>
          <link rel="next" href="https://outside.example/secret">
        </head>
        <body>First page</body>
      </html>
    `,
  });

  await harness.run();

  assert.equal(harness.requestedUrls.includes(OUT_OF_SCOPE_URL), false);
});

test("respects maxPaths for rel-next discoveries", async () => {
  const harness = createHarness({
    homepageHtml: `
      <!doctype html>
      <html>
        <head><link rel="next" href="/page/2"></head>
        <body><a href="/another-page">Another</a></body>
      </html>
    `,
    maxPaths: 2,
  });

  const result = await harness.run();

  assert.equal(result.visited, 2);
  assert.equal(harness.requestedUrls.length, 2);
});

test("does not follow rel-next when maxDepth is zero", async () => {
  const harness = createHarness({
    homepageHtml: `
      <!doctype html>
      <html>
        <head><link rel="next" href="/page/2"></head>
        <body>First page</body>
      </html>
    `,
    maxDepth: 0,
  });

  const result = await harness.run();

  assert.deepEqual(harness.requestedUrls, [START_URL]);
  assert.equal(result.visited, 1);
});

test("discovers and crawls a same-origin canonical URL", async () => {
  const canonicalPage = "https://example.com/articles/original";

  const harness = createHarness({
    homepageHtml: `
      <!doctype html>
      <html>
        <head><link rel="canonical" href="/articles/original"></head>
        <body>Article</body>
      </html>
    `,
  });

  const result = await harness.run();

  assert.deepEqual(harness.requestedUrls, [START_URL, canonicalPage]);
  assert.equal(result.visited, 2);
});

test("crawls a canonical URL only once when an anchor also links to it", async () => {
  const canonicalPage = "https://example.com/articles/original";

  const harness = createHarness({
    homepageHtml: `
      <!doctype html>
      <html>
        <head><link rel="canonical" href="/articles/original"></head>
        <body><a href="/articles/original">Original article</a></body>
      </html>
    `,
  });

  await harness.run();

  assert.equal(
    harness.requestedUrls.filter((url) => url === canonicalPage).length,
    1,
  );
});

test("rejects an off-origin canonical URL", async () => {
  const harness = createHarness({
    homepageHtml: `
      <!doctype html>
      <html>
        <head>
          <link rel="canonical" href="https://outside.example/secret">
        </head>
        <body>Article</body>
      </html>
    `,
  });

  await harness.run();

  assert.equal(harness.requestedUrls.includes(OUT_OF_SCOPE_URL), false);
});

test("respects maxPaths for canonical discoveries", async () => {
  const harness = createHarness({
    homepageHtml: `
      <!doctype html>
      <html>
        <head><link rel="canonical" href="/articles/original"></head>
        <body><a href="/another-page">Another page</a></body>
      </html>
    `,
    maxPaths: 2,
  });

  const result = await harness.run();

  assert.equal(result.visited, 2);
  assert.equal(harness.requestedUrls.length, 2);
});

test("discovers query-parameter pagination links", async () => {
  const pageTwo = "https://example.com/articles?page=2";

  const harness = createHarness({
    homepageHtml: `
      <!doctype html>
      <html><body><a href="/articles?page=2">Next</a></body></html>
    `,
  });

  const result = await harness.run();

  assert.ok(harness.requestedUrls.includes(pageTwo));
  assert.equal(result.visited, 2);
});

test("discovers path-based pagination links", async () => {
  const pageTwo = "https://example.com/articles/page/2";

  const harness = createHarness({
    homepageHtml: `
      <!doctype html>
      <html><body><a href="/articles/page/2">Next</a></body></html>
    `,
  });

  const result = await harness.run();

  assert.ok(harness.requestedUrls.includes(pageTwo));
  assert.equal(result.visited, 2);
});

test("discovers numbered pagination links", async () => {
  const pageTwo = "https://example.com/articles?page=2";
  const pageThree = "https://example.com/articles?page=3";

  const harness = createHarness({
    homepageHtml: `
      <!doctype html>
      <html>
        <body>
          <nav aria-label="Pagination">
            <a href="/articles?page=1">1</a>
            <a href="/articles?page=2">2</a>
            <a href="/articles?page=3">3</a>
          </nav>
        </body>
      </html>
    `,
  });

  const result = await harness.run();

  assert.ok(harness.requestedUrls.includes(pageTwo));
  assert.ok(harness.requestedUrls.includes(pageThree));
  assert.equal(result.visited, 4);
});

test("discovers both next and previous pagination links", async () => {
  const previousPage = "https://example.com/articles?page=1";
  const nextPage = "https://example.com/articles?page=3";

  const harness = createHarness({
    homepageHtml: `
      <!doctype html>
      <html>
        <body>
          <a rel="prev" href="/articles?page=1">Previous</a>
          <a rel="next" href="/articles?page=3">Next</a>
        </body>
      </html>
    `,
  });

  const result = await harness.run();

  assert.ok(harness.requestedUrls.includes(previousPage));
  assert.ok(harness.requestedUrls.includes(nextPage));
  assert.equal(result.visited, 3);
});

// Browser-discovered links and forms

test("crawls a JavaScript-discovered internal link only once", async () => {
  const dynamicPage = "https://example.com/javascript-page";

  const harness = createHarness({
    dynamicLinks: [dynamicPage, dynamicPage],
  });

  const result = await harness.run();

  assert.equal(
    harness.requestedUrls.filter((url) => url === dynamicPage).length,
    1,
  );
  assert.equal(result.visited, 2);
});

test("rejects an external JavaScript-discovered link", async () => {
  const harness = createHarness({
    dynamicLinks: [OUT_OF_SCOPE_URL],
  });

  const result = await harness.run();

  assert.equal(harness.requestedUrls.includes(OUT_OF_SCOPE_URL), false);
  assert.equal(result.visited, 1);
});

test("respects maxPaths for JavaScript-discovered links", async () => {
  const firstDynamicPage = "https://example.com/javascript-one";
  const secondDynamicPage = "https://example.com/javascript-two";

  const harness = createHarness({
    dynamicLinks: [firstDynamicPage, secondDynamicPage],
    maxPaths: 2,
  });

  const result = await harness.run();

  assert.equal(result.visited, 2);
  assert.equal(harness.requestedUrls.length, 2);
});

test("does not crawl links discovered by JavaScript when maxDepth is zero", async () => {
  const dynamicPage = "https://example.com/javascript-page";

  const harness = createHarness({
    dynamicLinks: [dynamicPage],
    maxDepth: 0,
  });

  const result = await harness.run();

  assert.deepEqual(harness.requestedUrls, [START_URL]);
  assert.equal(result.visited, 1);
});

test("does not queue JavaScript-discovered links after cancellation", async () => {
  const controller = new AbortController();

  const harness = createHarness({
    dynamicLinks: ["https://example.com/javascript-page"],
    signal: controller.signal,
    onPage: async () => controller.abort(),
  });

  const result = await harness.run();

  assert.deepEqual(harness.requestedUrls, [START_URL]);
  assert.equal(result.cancelled, true);
});

test("records dynamically discovered same-origin form metadata", async () => {
  const observedForms = [];

  const harness = createHarness({
    dynamicLinks: [],
    dynamicForms: [
      {
        id: "search-form",
        action: "https://example.com/search",
        method: "GET",
        inputs: [{ name: "q", type: "text" }],
      },
    ],
    onPage: async (page) => observedForms.push(...(page.dynamicForms ?? [])),
  });

  await harness.run();

  assert.equal(observedForms.length, 1);
  assert.equal(observedForms[0].action, "https://example.com/search");
  assert.equal(observedForms[0].method, "GET");
});

test("does not include off-origin dynamic forms in observed metadata", async () => {
  const observedForms = [];

  const harness = createHarness({
    dynamicLinks: [],
    dynamicForms: [
      {
        id: "external-form",
        action: OUT_OF_SCOPE_URL,
        method: "POST",
        inputs: [],
      },
    ],
    onPage: async (page) => observedForms.push(...(page.dynamicForms ?? [])),
  });

  await harness.run();

  assert.equal(
    observedForms.some((form) => form.action === OUT_OF_SCOPE_URL),
    false,
  );
});

// Browser-observed API request metadata

test("records same-origin fetch API request metadata and response status", async () => {
  const observedPages = [];

  const harness = createHarness({
    dynamicLinks: [],
    browserRequests: [
      {
        url: "https://example.com/api/search?q=security",
        method: "GET",
        resourceType: "fetch",
        statusCode: 200,
      },
    ],
    onPage: async (page) => observedPages.push(page),
  });

  await harness.run();

  const requests = observedPages.flatMap((page) => page.apiRequests ?? []);
  const apiRequest = requests.find(
    (request) =>
      request.url.includes("/api/search") && request.resourceType === "fetch",
  );

  assert.ok(apiRequest, "Expected fetch request metadata");
  assert.equal(apiRequest.method, "GET");
  assert.equal(apiRequest.statusCode, 200);
  assert.deepEqual(apiRequest.queryParameterNames, ["q"]);
});

test("records same-origin XMLHttpRequest metadata", async () => {
  const observedPages = [];

  const harness = createHarness({
    dynamicLinks: [],
    browserRequests: [
      {
        url: "https://example.com/api/profile",
        method: "POST",
        resourceType: "xhr",
        headers: {
          "content-type": "application/json",
        },
        postData: JSON.stringify({
          displayName: "Example",
        }),
        statusCode: 201,
      },
    ],
    onPage: async (page) => observedPages.push(page),
  });

  await harness.run();

  const requests = observedPages.flatMap((page) => page.apiRequests ?? []);
  const apiRequest = requests.find(
    (request) =>
      request.url.includes("/api/profile") && request.resourceType === "xhr",
  );

  assert.ok(apiRequest, "Expected XHR request metadata");
  assert.equal(apiRequest.method, "POST");
  assert.equal(apiRequest.statusCode, 201);
  assert.deepEqual(apiRequest.bodyParameterNames, ["displayName"]);
});

test("does not record off-origin API request metadata", async () => {
  const observedPages = [];

  const harness = createHarness({
    dynamicLinks: [],
    browserRequests: [
      {
        url: OUT_OF_SCOPE_URL,
        method: "GET",
        resourceType: "fetch",
        statusCode: 200,
      },
    ],
    onPage: async (page) => observedPages.push(page),
  });

  await harness.run();

  const requests = observedPages.flatMap((page) => page.apiRequests ?? []);

  assert.equal(
    requests.some((request) => request.url.includes("outside.example")),
    false,
  );
});

test("does not record ordinary script requests as API requests", async () => {
  const observedPages = [];

  const harness = createHarness({
    dynamicLinks: [],
    browserRequests: [
      {
        url: SCRIPT_URL,
        method: "GET",
        resourceType: "script",
        statusCode: 200,
      },
    ],
    onPage: async (page) => observedPages.push(page),
  });

  await harness.run();

  const requests = observedPages.flatMap((page) => page.apiRequests ?? []);

  assert.equal(
    requests.some((request) => request.url.endsWith("/assets/app.js")),
    false,
  );
});

test("does not duplicate identical API request metadata", async () => {
  const observedPages = [];

  const harness = createHarness({
    dynamicLinks: [],
    browserRequests: [
      {
        url: "https://example.com/api/items",
        method: "GET",
        resourceType: "fetch",
        statusCode: 200,
      },
      {
        url: "https://example.com/api/items",
        method: "GET",
        resourceType: "fetch",
        statusCode: 200,
      },
    ],
    onPage: async (page) => observedPages.push(page),
  });

  await harness.run();

  const requests = observedPages.flatMap((page) => page.apiRequests ?? []);

  assert.equal(
    requests.filter(
      (request) =>
        request.url.includes("/api/items") &&
        request.method === "GET" &&
        request.resourceType === "fetch",
    ).length,
    1,
  );
});

// JavaScript source endpoint discovery integration tests

test("fetches a same-origin script and crawls its discovered API endpoints", async () => {
  const requestedUrls = [];
  const observedPages = [];

  const requestPage = async (url) => {
    requestedUrls.push(url);

    if (url === START_URL) {
      return {
        statusCode: 200,
        headers: { "content-type": "text/html" },
        body: '<html><script src="/assets/app.js"></script></html>',
      };
    }

    if (url === SCRIPT_URL) {
      return {
        statusCode: 200,
        headers: { "content-type": "application/javascript" },
        body: "fetch('/api/users'); fetch('/graphql');",
      };
    }

    return {
      statusCode: 200,
      headers: { "content-type": "application/json" },
      body: '{"ok":true}',
    };
  };

  const result = await crawl({
    startUrl: START_URL,
    scope: createTestScope(),
    maxPaths: 5,
    maxDepth: 1,
    requestPage,
    launch: async () => null,
    discoverSitemaps: async () => [],
    validateSafeUrl: async () => {},
    createLimiter,
    onPage: async (page) => observedPages.push(page),
  });

  assert.ok(requestedUrls.includes(SCRIPT_URL));
  assert.ok(requestedUrls.includes(API_USERS_URL));
  assert.ok(requestedUrls.includes(GRAPHQL_URL));

  assert.equal(
    observedPages.some((page) => page.url === SCRIPT_URL),
    false,
    "JavaScript source must not be reported as a crawled HTML page",
  );

  assert.equal(
    result.pages.some((page) => page.url === SCRIPT_URL),
    false,
  );
});

test("does not fetch an off-origin JavaScript source", async () => {
  const requestedUrls = [];

  const requestPage = async (url) => {
    requestedUrls.push(url);

    return {
      statusCode: 200,
      headers: { "content-type": "text/html" },
      body: `
        <html>
          <script src="https://outside.example/app.js"></script>
        </html>
      `,
    };
  };

  await crawl({
    startUrl: START_URL,
    scope: createTestScope(),
    maxPaths: 5,
    maxDepth: 1,
    requestPage,
    launch: async () => null,
    discoverSitemaps: async () => [],
    validateSafeUrl: async () => {},
    createLimiter,
  });

  assert.deepEqual(requestedUrls, [START_URL]);
});

test("respects maxPaths when queuing JavaScript-discovered endpoints", async () => {
  const requestedUrls = [];

  const requestPage = async (url) => {
    requestedUrls.push(url);

    if (url === START_URL) {
      return {
        statusCode: 200,
        headers: { "content-type": "text/html" },
        body: '<script src="/assets/app.js"></script>',
      };
    }

    if (url === SCRIPT_URL) {
      return {
        statusCode: 200,
        headers: { "content-type": "application/javascript" },
        body: "fetch('/api/users');",
      };
    }

    return {
      statusCode: 200,
      headers: { "content-type": "application/json" },
      body: "{}",
    };
  };

  const result = await crawl({
    startUrl: START_URL,
    scope: createTestScope(),
    maxPaths: 1,
    maxDepth: 1,
    requestPage,
    launch: async () => null,
    discoverSitemaps: async () => [],
    validateSafeUrl: async () => {},
    createLimiter,
  });

  assert.deepEqual(requestedUrls, [START_URL, SCRIPT_URL]);
  assert.equal(result.visited, 1);
  assert.equal(result.pages.length, 1);
  assert.equal(requestedUrls.includes(API_USERS_URL), false);
});

test("does not inspect scripts when maxDepth is zero", async () => {
  const requestedUrls = [];

  const requestPage = async (url) => {
    requestedUrls.push(url);

    return {
      statusCode: 200,
      headers: { "content-type": "text/html" },
      body: '<script src="/assets/app.js"></script>',
    };
  };

  const result = await crawl({
    startUrl: START_URL,
    scope: createTestScope(),
    maxPaths: 5,
    maxDepth: 0,
    requestPage,
    launch: async () => null,
    discoverSitemaps: async () => [],
    validateSafeUrl: async () => {},
    createLimiter,
  });

  assert.deepEqual(requestedUrls, [START_URL]);
  assert.equal(result.visited, 1);
});

test("does not inspect scripts after the page callback cancels the crawl", async () => {
  const controller = new AbortController();
  const requestedUrls = [];

  const requestPage = async (url) => {
    requestedUrls.push(url);

    return {
      statusCode: 200,
      headers: { "content-type": "text/html" },
      body: '<script src="/assets/app.js"></script>',
    };
  };

  const result = await crawl({
    startUrl: START_URL,
    scope: createTestScope(),
    maxPaths: 5,
    maxDepth: 1,
    signal: controller.signal,
    requestPage,
    launch: async () => null,
    discoverSitemaps: async () => [],
    validateSafeUrl: async () => {},
    createLimiter,
    onPage: async () => controller.abort(),
  });

  assert.deepEqual(requestedUrls, [START_URL]);
  assert.equal(result.cancelled, true);
});

test("does not extract API endpoints from a non-JavaScript response", async () => {
  const requestedUrls = [];

  const requestPage = async (url) => {
    requestedUrls.push(url);

    if (url === START_URL) {
      return {
        statusCode: 200,
        headers: { "content-type": "text/html" },
        body: '<script src="/assets/app.js"></script>',
      };
    }

    return {
      statusCode: 200,
      headers: { "content-type": "text/plain" },
      body: "fetch('/api/users');",
    };
  };

  await crawl({
    startUrl: START_URL,
    scope: createTestScope(),
    maxPaths: 5,
    maxDepth: 1,
    requestPage,
    launch: async () => null,
    discoverSitemaps: async () => [],
    validateSafeUrl: async () => {},
    createLimiter,
  });

  assert.ok(requestedUrls.includes(SCRIPT_URL));
  assert.equal(requestedUrls.includes(API_USERS_URL), false);
});
