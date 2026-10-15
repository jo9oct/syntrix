import test from "node:test";
import assert from "node:assert/strict";

import { createScope } from "../../src/core/scope.js";

import {
  discoverSitemapUrls,
  extractRobotsSitemaps,
  MAX_SITEMAP_RESOURCES,
  MAX_SITEMAP_URLS,
  MAX_SITEMAP_BYTES,
} from "../../src/core/sitemapDiscovery.js";

const startUrl = "https://example.com/";
const scope = createScope(startUrl);

const xml = (...urls) =>
  `<?xml version="1.0" encoding="UTF-8"?>
  <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    ${urls.map((url) => `<url><loc>${url}</loc></url>`).join("\n")}
  </urlset>`;

const response = (body, status = 200, headers = {}) => ({
  status,
  statusCode: status,
  headers,
  body,
  data: body,
});

const createDependencies = (responses) => {
  const calls = [];

  const request = async (url, options) => {
    calls.push({ url, options });

    if (responses instanceof Error) {
      throw responses;
    }

    if (typeof responses === "function") {
      return responses(url, options);
    }

    if (responses instanceof Map) {
      const result = responses.get(url);

      if (result instanceof Error) {
        throw result;
      }

      return result ?? response("", 404);
    }

    return response("", 404);
  };

  const validateSafeUrl = async (url) => {
    const parsed = new URL(url);

    if (
      parsed.hostname === "localhost" ||
      parsed.hostname === "127.0.0.1" ||
      parsed.hostname === "169.254.169.254"
    ) {
      throw new Error("Blocked unsafe test URL.");
    }

    return { url: parsed };
  };

  return { calls, request, validateSafeUrl };
};

test("discovers same-origin URLs from a sitemap", async () => {
  const dependencies = createDependencies(
    new Map([
      [
        "https://example.com/sitemap.xml",
        response(
          xml("https://example.com/page-a", "https://example.com/page-b"),
        ),
      ],
    ]),
  );

  const result = await discoverSitemapUrls({
    startUrl,
    scope,
    ...dependencies,
  });

  assert.deepEqual(result, [
    "https://example.com/page-a",
    "https://example.com/page-b",
  ]);
});

test("deduplicates URLs after normalization", async () => {
  const dependencies = createDependencies(
    new Map([
      [
        "https://example.com/sitemap.xml",
        response(
          xml(
            "https://example.com/page/",
            "https://example.com/page#section",
            "https://example.com/page",
          ),
        ),
      ],
    ]),
  );

  const result = await discoverSitemapUrls({
    startUrl,
    scope,
    ...dependencies,
  });

  assert.deepEqual(result, ["https://example.com/page"]);
});

test("rejects out-of-scope URLs", async () => {
  const dependencies = createDependencies(
    new Map([
      [
        "https://example.com/sitemap.xml",
        response(
          xml("https://example.com/allowed", "https://other.example/page"),
        ),
      ],
    ]),
  );

  const result = await discoverSitemapUrls({
    startUrl,
    scope,
    ...dependencies,
  });

  assert.deepEqual(result, ["https://example.com/allowed"]);
});

test("rejects unsafe sitemap locations", async () => {
  const dependencies = createDependencies(
    new Map([
      [
        "https://example.com/sitemap.xml",
        response(
          xml(
            "https://example.com/allowed",
            "https://127.0.0.1/private",
            "https://169.254.169.254/latest/meta-data",
          ),
        ),
      ],
    ]),
  );

  const result = await discoverSitemapUrls({
    startUrl,
    scope,
    ...dependencies,
  });

  assert.deepEqual(result, ["https://example.com/allowed"]);
});

test("recursively processes sitemap indexes", async () => {
  const dependencies = createDependencies(
    new Map([
      [
        "https://example.com/sitemap.xml",
        response(`
          <sitemapindex>
            <sitemap>
              <loc>https://example.com/pages.xml</loc>
            </sitemap>
          </sitemapindex>
        `),
      ],
      [
        "https://example.com/pages.xml",
        response(xml("https://example.com/from-index")),
      ],
    ]),
  );

  const result = await discoverSitemapUrls({
    startUrl,
    scope,
    ...dependencies,
  });

  assert.deepEqual(result, ["https://example.com/from-index"]);

  assert.ok(
    dependencies.calls.some(
      (call) => call.url === "https://example.com/pages.xml",
    ),
  );
});

test("a failed sitemap does not stop another candidate", async () => {
  const dependencies = createDependencies(
    new Map([
      ["https://example.com/sitemap.xml", new Error("Test request failure")],
      [
        "https://example.com/sitemap_index.xml",
        response(xml("https://example.com/recovered")),
      ],
    ]),
  );

  const result = await discoverSitemapUrls({
    startUrl,
    scope,
    ...dependencies,
  });

  assert.deepEqual(result, ["https://example.com/recovered"]);
});

test("ignores non-success HTTP responses", async () => {
  const dependencies = createDependencies(
    new Map([
      [
        "https://example.com/sitemap.xml",
        response(xml("https://example.com/should-not-appear"), 503),
      ],
      ["https://example.com/sitemap_index.xml", response("", 404)],
    ]),
  );

  const result = await discoverSitemapUrls({
    startUrl,
    scope,
    ...dependencies,
  });

  assert.deepEqual(result, []);
});

test("rejects a sitemap body larger than the configured limit", async () => {
  const oversizedBody = "x".repeat(MAX_SITEMAP_BYTES + 1);

  const dependencies = createDependencies(
    new Map([["https://example.com/sitemap.xml", response(oversizedBody)]]),
  );

  const result = await discoverSitemapUrls({
    startUrl,
    scope,
    ...dependencies,
  });

  assert.deepEqual(result, []);
});

test("rejects a sitemap with an oversized content-length header", async () => {
  const dependencies = createDependencies(
    new Map([
      [
        "https://example.com/sitemap.xml",
        response(xml("https://example.com/page"), 200, {
          "content-length": String(MAX_SITEMAP_BYTES + 1),
        }),
      ],
    ]),
  );

  const result = await discoverSitemapUrls({
    startUrl,
    scope,
    ...dependencies,
  });

  assert.deepEqual(result, []);
});

test("respects the total sitemap resource limit", async () => {
  const dependencies = createDependencies(async (url) => {
    if (url.endsWith("/sitemap.xml")) {
      const entries = Array.from(
        { length: MAX_SITEMAP_RESOURCES * 2 },
        (_, index) =>
          `<sitemap><loc>https://example.com/sitemap-${index}.xml</loc></sitemap>`,
      ).join("");

      return response(`<sitemapindex>${entries}</sitemapindex>`);
    }

    return response(
      xml(`https://example.com/page-${url.match(/sitemap-(\d+)/)?.[1]}`),
    );
  });

  await discoverSitemapUrls({
    startUrl,
    scope,
    ...dependencies,
  });

  assert.ok(dependencies.calls.length <= MAX_SITEMAP_RESOURCES);
});

test("respects the total discovered URL limit", async () => {
  const urls = Array.from(
    { length: MAX_SITEMAP_URLS + 20 },
    (_, index) => `https://example.com/page-${index}`,
  );

  const dependencies = createDependencies(
    new Map([["https://example.com/sitemap.xml", response(xml(...urls))]]),
  );

  const result = await discoverSitemapUrls({
    startUrl,
    scope,
    ...dependencies,
  });

  assert.ok(result.length <= MAX_SITEMAP_URLS);
});

test("passes request headers and abort signal to sitemap requests", async () => {
  const controller = new AbortController();
  const headers = { "X-Test-Header": "test-value" };

  const dependencies = createDependencies(
    new Map([
      [
        "https://example.com/sitemap.xml",
        response(xml("https://example.com/page")),
      ],
    ]),
  );

  await discoverSitemapUrls({
    startUrl,
    scope,
    headers,
    signal: controller.signal,
    ...dependencies,
  });

  const sitemapCall = dependencies.calls.find(
    (call) => call.url === "https://example.com/sitemap.xml",
  );

  assert.ok(sitemapCall);
  assert.equal(sitemapCall.options.headers["X-Test-Header"], "test-value");
  assert.equal(sitemapCall.options.signal, controller.signal);
});

test("requires a start URL and scope", async () => {
  await assert.rejects(
    discoverSitemapUrls({ startUrl }),
    /startUrl and scope are required/,
  );
});

// Robots.txt sitemap discovery tests

test("extracts valid Sitemap directives case-insensitively", () => {
  const result = extractRobotsSitemaps(`
    User-agent: *
    Sitemap: https://example.com/sitemap-a.xml
    sitemap: https://example.com/sitemap-b.xml
    SITEMAP: https://example.com/sitemap-c.xml
  `);

  assert.deepEqual(result, [
    "https://example.com/sitemap-a.xml",
    "https://example.com/sitemap-b.xml",
    "https://example.com/sitemap-c.xml",
  ]);
});

test("ignores robots comments, malformed entries, unsupported protocols, and credentials", () => {
  const result = extractRobotsSitemaps(`
    # Sitemap: https://example.com/commented.xml
    Sitemap: https://example.com/valid.xml # valid sitemap
    Sitemap:
    Sitemap: not-a-url
    Sitemap: ftp://example.com/sitemap.xml
    Sitemap: https://user:password@example.com/private.xml
    Disallow: /private
  `);

  assert.deepEqual(result, ["https://example.com/valid.xml"]);
});

test("deduplicates robots sitemap directives and removes fragments", () => {
  const result = extractRobotsSitemaps(`
    Sitemap: https://example.com/sitemap.xml#first
    Sitemap: https://example.com/sitemap.xml#second
    Sitemap: https://example.com/sitemap.xml
  `);

  assert.deepEqual(result, ["https://example.com/sitemap.xml"]);
});

test("requests a sitemap declared in robots.txt", async () => {
  const declaredSitemap = "https://example.com/custom-sitemap.xml";

  const dependencies = createDependencies(
    new Map([
      [
        "https://example.com/robots.txt",
        response(`User-agent: *\nSitemap: ${declaredSitemap}`),
      ],
      [
        declaredSitemap,
        response(xml("https://example.com/discovered-from-robots")),
      ],
    ]),
  );

  const result = await discoverSitemapUrls({
    startUrl,
    scope,
    ...dependencies,
  });

  assert.deepEqual(result, ["https://example.com/discovered-from-robots"]);

  assert.ok(
    dependencies.calls.some((call) => call.url === declaredSitemap),
    "the sitemap declared in robots.txt should be requested",
  );
});

test("does not request an out-of-scope sitemap declared in robots.txt", async () => {
  const outsideSitemap = "https://other.example/sitemap.xml";

  const dependencies = createDependencies(
    new Map([
      [
        "https://example.com/robots.txt",
        response(`Sitemap: ${outsideSitemap}`),
      ],
    ]),
  );

  await discoverSitemapUrls({
    startUrl,
    scope,
    ...dependencies,
  });

  assert.ok(
    !dependencies.calls.some((call) => call.url === outsideSitemap),
    "out-of-scope sitemap must not be requested",
  );
});

test("does not request an unsafe sitemap declared in robots.txt", async () => {
  const unsafeSitemap = "https://127.0.0.1/private.xml";

  const dependencies = createDependencies(
    new Map([
      ["https://example.com/robots.txt", response(`Sitemap: ${unsafeSitemap}`)],
    ]),
  );

  await discoverSitemapUrls({
    startUrl,
    scope,
    ...dependencies,
  });

  assert.ok(
    !dependencies.calls.some((call) => call.url === unsafeSitemap),
    "unsafe sitemap must not be requested",
  );
});

test("continues standard sitemap discovery when robots.txt fails", async () => {
  const dependencies = createDependencies(
    new Map([
      [
        "https://example.com/robots.txt",
        new Error("Simulated robots.txt failure"),
      ],
      [
        "https://example.com/sitemap.xml",
        response(xml("https://example.com/fallback-page")),
      ],
    ]),
  );

  const result = await discoverSitemapUrls({
    startUrl,
    scope,
    ...dependencies,
  });

  assert.deepEqual(result, ["https://example.com/fallback-page"]);

  assert.ok(
    dependencies.calls.some(
      (call) => call.url === "https://example.com/sitemap.xml",
    ),
    "standard sitemap discovery should continue",
  );
});

test("keeps robots sitemap discovery within the resource limit", async () => {
  const dependencies = createDependencies(async (url) => {
    if (url === "https://example.com/robots.txt") {
      const directives = Array.from(
        { length: MAX_SITEMAP_RESOURCES * 3 },
        (_, index) => `Sitemap: https://example.com/custom-${index}.xml`,
      );

      return response(directives.join("\n"));
    }

    return response("");
  });

  await discoverSitemapUrls({
    startUrl,
    scope,
    ...dependencies,
  });

  assert.ok(
    dependencies.calls.length <= MAX_SITEMAP_RESOURCES,
    "total requested sitemap resources must remain bounded",
  );
});
