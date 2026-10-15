import test from "node:test";
import assert from "node:assert/strict";

import { extractLinks } from "../../src/core/discovery.js";

const baseUrl = "https://example.com/articles/";

test("extracts ordinary anchor links", () => {
  const html = '<a href="/about">About</a>';

  assert.deepEqual(extractLinks(html, baseUrl), ["https://example.com/about"]);
});

test("does not treat canonical links as ordinary anchor links", () => {
  const html = `
    <link rel="canonical" href="/articles/original">
  `;

  assert.deepEqual(extractLinks(html, baseUrl), []);
});

test("extracts rel-next links", () => {
  const html = `
    <link rel="next" href="?page=2">
  `;

  assert.deepEqual(extractLinks(html, baseUrl), [
    "https://example.com/articles?page=2",
  ]);
});

test("extracts pagination links from ordinary anchors", () => {
  const html = `
    <a href="?page=2">Next</a>
    <a href="/articles/page/3">3</a>
  `;

  assert.deepEqual(extractLinks(html, baseUrl), [
    "https://example.com/articles?page=2",
    "https://example.com/articles/page/3",
  ]);
});

import { extractCanonicalUrl } from "../../src/core/discovery.js";

test("extracts a relative canonical URL", () => {
  const html = `
    <link rel="canonical" href="/articles/original">
  `;

  assert.equal(
    extractCanonicalUrl(html, baseUrl),
    "https://example.com/articles/original",
  );
});

test("extracts canonical links regardless of attribute order and case", () => {
  const html = `
    <LINK href="/articles/original" REL="canonical">
  `;

  assert.equal(
    extractCanonicalUrl(html, baseUrl),
    "https://example.com/articles/original",
  );
});

test("returns null when a canonical link is absent", () => {
  assert.equal(
    extractCanonicalUrl("<html><body>No canonical</body></html>", baseUrl),
    null,
  );
});

test("returns null for invalid canonical URLs", () => {
  const html = `
    <link rel="canonical" href="javascript:alert(1)">
  `;

  assert.equal(extractCanonicalUrl(html, baseUrl), null);
});

test("returns null when multiple canonical links are present", () => {
  const html = `
    <link rel="canonical" href="/articles/one">
    <link rel="canonical" href="/articles/two">
  `;

  assert.equal(extractCanonicalUrl(html, baseUrl), null);
});
