
/* STATUS: UPDATED */

import { get } from "../../request/request.js";

import { createExchangeEvidence } from "../shared/evidence.js";
import {
  createReconScanner,
  getTargetUrl,
} from "../shared/reconContract.js";
import { assertSafeUrl } from "../shared/resolver.js";

const MAX_SITEMAP_URLS = 100;
const MAX_SITEMAP_BYTES = 1024 * 1024;
const MAX_LOCATION_LENGTH = 2048;

const SITEMAP_PATHS = Object.freeze([
  "/sitemap.xml",
  "/sitemap_index.xml",
]);

const decodeXmlValue = (value) =>
  value
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&apos;/gi, "'")
    .trim();

const extractLocations = (body, allowedOrigin) => {
  if (typeof body !== "string") {
    return [];
  }

  const locations = new Set();
  const pattern = /<loc\b[^>]*>([\s\S]*?)<\/loc\s*>/gi;

  let match;

  while (
    (match = pattern.exec(body)) !== null &&
    locations.size < MAX_SITEMAP_URLS
  ) {
    const value = decodeXmlValue(match[1])
      .slice(0, MAX_LOCATION_LENGTH);

    if (!value) {
      continue;
    }

    try {
      const url = new URL(value);

      if (!["http:", "https:"].includes(url.protocol)) {
        continue;
      }

      // Only expose same-origin URLs as candidates from this sitemap.
      // Other origins require separate, explicit scope authorization.
      if (url.origin !== allowedOrigin) {
        continue;
      }

      url.username = "";
      url.password = "";
      url.hash = "";

      locations.add(url.toString());
    } catch {
      // Ignore malformed sitemap entries.
    }
  }

  return [...locations];
};

const getResponseHeader = (headers, name) => {
  if (!headers || typeof headers !== "object") {
    return null;
  }

  const key = Object.keys(headers).find(
    (header) => header.toLowerCase() === name.toLowerCase(),
  );

  return key ? headers[key] : null;
};

const createUnavailableResult = (url, status = null) => ({
  url,
  status,
  locations: [],
});

const scanner = createReconScanner({
  id: "recon.sitemap",

  name: "Sitemap Reconnaissance",

  description:
    "Discovers same-origin URLs listed in standard XML sitemap resources.",

  async run(context) {
    const targetUrl = getTargetUrl(context);
    const baseUrl = new URL(targetUrl);

    if (!["http:", "https:"].includes(baseUrl.protocol)) {
      throw new Error(
        "Sitemap reconnaissance only supports HTTP and HTTPS targets.",
      );
    }

    const discovered = [];
    const evidence = [];
    let cancelled = false;

    for (const pathname of SITEMAP_PATHS) {
      if (context?.signal?.aborted) {
        cancelled = true;
        break;
      }

      const sitemapUrl = new URL(pathname, baseUrl.origin).toString();

      try {
        await assertSafeUrl(sitemapUrl);

        if (context?.signal?.aborted) {
          cancelled = true;
          break;
        }

        // Sitemap discovery is public; do not forward authenticated
        // cookies or authorization headers to these resources.
        const response = await get(sitemapUrl, {
          signal: context?.signal,
          scope: context?.scope,
          headers: {
            Accept: "application/xml, text/xml;q=0.9, */*;q=0.1",
          },
          maxRedirects: 0,
          maxContentLength: MAX_SITEMAP_BYTES,
          maxBodyLength: MAX_SITEMAP_BYTES,
          responseType: "text",
        });

        if (context?.signal?.aborted) {
          cancelled = true;
          break;
        }

        const status = Number(response?.status);

        if (
          !Number.isInteger(status) ||
          status < 100 ||
          status > 599
        ) {
          discovered.push(createUnavailableResult(sitemapUrl));
          continue;
        }

        const successfulResponse = status >= 200 && status < 300;
        const body = successfulResponse && typeof response.data === "string"
          ? response.data
          : null;

        const bodyBytes = body === null
          ? 0
          : Buffer.byteLength(body, "utf8");

        if (bodyBytes > MAX_SITEMAP_BYTES) {
          discovered.push(createUnavailableResult(sitemapUrl, status));
          continue;
        }

        const locations = body === null
          ? []
          : extractLocations(body, baseUrl.origin);

        discovered.push({
          url: sitemapUrl,
          status,
          locations,
        });

        evidence.push(
          createExchangeEvidence({
            request: {
              method: "GET",
              url: sitemapUrl,
              headers: {
                Accept: "application/xml, text/xml;q=0.9, */*;q=0.1",
              },
            },

            response: {
              status,
              statusText: response?.statusText ?? null,
              headers: response?.headers ?? {},
              contentType: getResponseHeader(
                response?.headers,
                "content-type",
              ),
              // Do not duplicate potentially large sitemap XML in evidence.
              body: null,
            },
          }),
        );
      } catch (error) {
        if (context?.signal?.aborted) {
          cancelled = true;
          break;
        }

        // Preserve an HTTP status if the request library exposes one.
        const status = Number(error?.response?.status);
        const validStatus =
          Number.isInteger(status) && status >= 100 && status <= 599
            ? status
            : null;

        discovered.push(createUnavailableResult(sitemapUrl, validStatus));
      }
    }

    const discoveredUrls = [
      ...new Set(
        discovered.flatMap((sitemap) => sitemap.locations),
      ),
    ].slice(0, MAX_SITEMAP_URLS);

    return {
      data: {
        sitemaps: discovered,
        discoveredUrls,
      },

      evidence,
      fingerprints: [],
      verificationRecords: [],

      metadata: {
        maximumUrls: MAX_SITEMAP_URLS,
        sitemapCandidates: SITEMAP_PATHS.length,
        sitemapResourcesChecked: discovered.length,
        discoveredUrlCount: discoveredUrls.length,
        cancelled,
        sameOriginOnly: true,
        note:
          "Discovered URLs are candidates only. Revalidate scope and SSRF protections before crawling them.",
      },
    };
  },
});

export default scanner;
