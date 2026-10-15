// STATUS: UPDATED
// File: src/core/discovery.js

import * as cheerio from "cheerio";

import { normalizeUrl, isSameOrigin } from "../utils/url.js";

const extractLinks = (html, baseUrl) => {
  if (
    typeof html !== "string" ||
    html.length === 0 ||
    typeof baseUrl !== "string"
  ) {
    return [];
  }

  let $;

  try {
    $ = cheerio.load(html);
  } catch {
    return [];
  }

  const links = new Set();

  const addHttpUrl = (href) => {
    if (typeof href !== "string" || !href.trim()) {
      return;
    }

    try {
      const resolved = new URL(href.trim(), baseUrl);

      if (!["http:", "https:"].includes(resolved.protocol)) {
        return;
      }

      resolved.hash = "";
      links.add(normalizeUrl(resolved.toString()));
    } catch {
      // Ignore malformed or unsupported URLs.
    }
  };

  // Includes query-based, path-based, and numbered pagination links.
  $("a[href], area[href]").each((_, element) => {
    addHttpUrl($(element).attr("href"));
  });

  // Discover explicit pagination hints from document metadata.
  $("link[rel][href], a[rel][href], area[rel][href]").each((_, element) => {
    const rel = ($(element).attr("rel") || "")
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean);

    if (rel.includes("next") || rel.includes("prev")) {
      addHttpUrl($(element).attr("href"));
    }
  });

  return [...links];
};

const extractCanonicalUrl = (html, baseUrl) => {
  if (
    typeof html !== "string" ||
    html.length === 0 ||
    typeof baseUrl !== "string"
  ) {
    return null;
  }

  let $;

  try {
    $ = cheerio.load(html);
  } catch {
    return null;
  }

  const canonicalLinks = $("link[rel][href]").filter((_, element) => {
    const rel = ($(element).attr("rel") || "")
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean);

    return rel.includes("canonical");
  });

  // Ambiguous canonical declarations are ignored.
  if (canonicalLinks.length !== 1) {
    return null;
  }

  const href = canonicalLinks.first().attr("href")?.trim();

  if (!href) {
    return null;
  }

  try {
    const resolved = new URL(href, baseUrl);

    if (!["http:", "https:"].includes(resolved.protocol)) {
      return null;
    }

    resolved.hash = "";

    return normalizeUrl(resolved.toString());
  } catch {
    return null;
  }
};

const filterSameOrigin = (urls, targetUrl) => {
  return urls.filter((url) => {
    try {
      return isSameOrigin(url, targetUrl);
    } catch {
      return false;
    }
  });
};

export { extractLinks, extractCanonicalUrl, filterSameOrigin };
