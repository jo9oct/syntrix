// STATUS: UPDATED
// File: src/core/sitemapDiscovery.js

import { get as defaultGet } from "../request/request.js";
import { normalizeUrl } from "../utils/url.js";
import { assertInScope } from "./scope.js";
import { assertSafeUrl as defaultAssertSafeUrl } from "../recon/shared/resolver.js";

const MAX_SITEMAP_RESOURCES = 10;
const MAX_SITEMAP_URLS = 100;
const MAX_SITEMAP_INDEX_DEPTH = 2;
const MAX_SITEMAP_BYTES = 2 * 1024 * 1024;

const ROBOTS_PATH = "/robots.txt";

const SITEMAP_PATHS = Object.freeze(["/sitemap.xml", "/sitemap_index.xml"]);

const decodeXmlValue = (value) =>
  value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .trim();

const extractLocations = (body) => {
  if (typeof body !== "string") return [];

  const locations = [];
  const pattern = /<loc\b[^>]*>([\s\S]*?)<\/loc>/gi;
  let match;

  while (
    (match = pattern.exec(body)) !== null &&
    locations.length < MAX_SITEMAP_URLS
  ) {
    const value = decodeXmlValue(match[1]);

    if (!value) continue;

    try {
      const url = new URL(value);

      if (!["http:", "https:"].includes(url.protocol)) continue;
      if (url.username || url.password) continue;

      url.hash = "";
      locations.push(url.toString());
    } catch {
      // Ignore invalid XML location values.
    }
  }

  return [...new Set(locations)].slice(0, MAX_SITEMAP_URLS);
};

/**
 * Extract Sitemap directives from robots.txt.
 * Directive names are case-insensitive. Comments are ignored.
 */
const extractRobotsSitemaps = (body) => {
  if (typeof body !== "string") return [];

  const sitemaps = [];

  for (const rawLine of body.split(/\r?\n/)) {
    const line = rawLine.split("#", 1)[0].trim();

    if (!line) continue;

    const separator = line.indexOf(":");

    if (separator < 0) continue;

    const directive = line.slice(0, separator).trim().toLowerCase();

    if (directive !== "sitemap") continue;

    const value = line.slice(separator + 1).trim();

    if (!value || value.length > 2000) continue;

    try {
      const url = new URL(value);

      if (!["http:", "https:"].includes(url.protocol)) continue;
      if (url.username || url.password) continue;

      url.hash = "";
      sitemaps.push(url.toString());
    } catch {
      // Ignore malformed sitemap directives.
    }
  }

  return [...new Set(sitemaps)].slice(0, MAX_SITEMAP_URLS);
};

const isSitemapIndex = (body) =>
  typeof body === "string" && /<sitemapindex\b/i.test(body);

const getResponseBody = (response) => {
  const body = response?.body ?? response?.data;

  if (typeof body !== "string") return null;

  if (Buffer.byteLength(body, "utf8") > MAX_SITEMAP_BYTES) {
    return null;
  }

  const contentLengthHeader = Object.keys(response?.headers ?? {}).find(
    (name) => name.toLowerCase() === "content-length",
  );

  const contentLength = Number(
    contentLengthHeader ? response.headers[contentLengthHeader] : NaN,
  );

  if (Number.isFinite(contentLength) && contentLength > MAX_SITEMAP_BYTES) {
    return null;
  }

  return body;
};

const isSuccessfulResponse = (response) => {
  const statusCode = response?.statusCode ?? response?.status;

  return Number.isInteger(statusCode) && statusCode >= 200 && statusCode < 300;
};

const discoverSitemapUrls = async ({
  startUrl,
  scope,
  headers = {},
  signal,
  request = defaultGet,
  validateSafeUrl = defaultAssertSafeUrl,
} = {}) => {
  if (typeof startUrl !== "string" || !scope) {
    throw new TypeError("startUrl and scope are required.");
  }

  if (typeof request !== "function") {
    throw new TypeError("request must be a function.");
  }

  if (typeof validateSafeUrl !== "function") {
    throw new TypeError("validateSafeUrl must be a function.");
  }

  const baseUrl = new URL(startUrl);

  const pending = [
    {
      url: new URL(ROBOTS_PATH, baseUrl.origin).toString(),
      type: "robots",
      depth: 0,
    },
    ...SITEMAP_PATHS.map((pathname) => ({
      url: new URL(pathname, baseUrl.origin).toString(),
      type: "sitemap",
      depth: 0,
    })),
  ];

  const checked = new Set();
  const discovered = new Set();

  while (
    pending.length > 0 &&
    checked.size < MAX_SITEMAP_RESOURCES &&
    discovered.size < MAX_SITEMAP_URLS
  ) {
    if (signal?.aborted) break;

    const current = pending.shift();

    let resourceUrl;

    try {
      resourceUrl = normalizeUrl(current.url);
      assertInScope(resourceUrl, scope);
      await validateSafeUrl(resourceUrl);
    } catch {
      // Unsafe or out-of-scope resources are never requested.
      continue;
    }

    if (checked.has(resourceUrl)) continue;

    checked.add(resourceUrl);

    try {
      const response = await request(resourceUrl, {
        headers,
        signal,
      });

      if (signal?.aborted) break;
      if (!isSuccessfulResponse(response)) continue;

      const body = getResponseBody(response);

      if (body === null) continue;

      if (current.type === "robots") {
        const declaredSitemaps = extractRobotsSitemaps(body);

        for (const sitemapUrl of declaredSitemaps) {
          if (checked.size + pending.length >= MAX_SITEMAP_RESOURCES) {
            break;
          }

          pending.push({
            url: sitemapUrl,
            type: "sitemap",
            depth: 0,
          });
        }

        continue;
      }

      const locations = extractLocations(body);

      if (isSitemapIndex(body) && current.depth < MAX_SITEMAP_INDEX_DEPTH) {
        for (const location of locations) {
          if (checked.size + pending.length >= MAX_SITEMAP_RESOURCES) {
            break;
          }

          pending.push({
            url: location,
            type: "sitemap",
            depth: current.depth + 1,
          });
        }

        continue;
      }

      for (const location of locations) {
        if (discovered.size >= MAX_SITEMAP_URLS) break;

        try {
          const normalized = normalizeUrl(location);

          assertInScope(normalized, scope);
          await validateSafeUrl(normalized);

          discovered.add(normalized);
        } catch {
          // Ignore unsafe or out-of-scope page URLs.
        }
      }
    } catch {
      if (signal?.aborted) break;

      // A failed robots.txt or sitemap must not stop other candidates.
    }
  }

  return [...discovered].slice(0, MAX_SITEMAP_URLS);
};

export {
  discoverSitemapUrls,
  extractRobotsSitemaps,
  MAX_SITEMAP_RESOURCES,
  MAX_SITEMAP_URLS,
  MAX_SITEMAP_INDEX_DEPTH,
  MAX_SITEMAP_BYTES,
};
