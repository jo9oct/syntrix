// STATUS: CREATED
// File: src/core/openApiSpecLinks.js

const MAX_SPEC_LINKS = 20;

const SPEC_LINK_PATTERN = /<(?:link|a)\b[^>]*>/gi;

const ATTRIBUTE_PATTERN =
  /([^\s=/>]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/gi;

const SPEC_PATH_PATTERN =
  /(?:^|\/)(?:openapi|swagger)(?:[-._][^/?#]*)?(?:\.json)?\/?$/i;

function parseAttributes(tag) {
  const attributes = Object.create(null);

  for (const match of tag.matchAll(ATTRIBUTE_PATTERN)) {
    attributes[match[1].toLowerCase()] = match[2] ?? match[3] ?? match[4] ?? "";
  }

  return attributes;
}

/**
 * Finds likely OpenAPI/Swagger JSON specification links in HTML.
 * URLs are returned as candidates only; callers must validate scope
 * and URL safety before requesting them.
 */
export function extractOpenApiSpecUrls(html, baseUrl) {
  if (typeof html !== "string" || !html || typeof baseUrl !== "string") {
    return [];
  }

  const urls = new Set();

  for (const match of html.matchAll(SPEC_LINK_PATTERN)) {
    const tag = match[0];
    const attributes = parseAttributes(tag);
    const href = attributes.href;

    if (!href || href.trim() !== href) {
      continue;
    }

    const rel = (attributes.rel || "")
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean);

    const type = (attributes.type || "").split(";")[0].trim().toLowerCase();

    let candidate;

    try {
      candidate = new URL(href, baseUrl);

      if (
        !["http:", "https:"].includes(candidate.protocol) ||
        candidate.username ||
        candidate.password
      ) {
        continue;
      }

      if (candidate.origin !== new URL(baseUrl).origin) {
        continue;
      }
    } catch {
      continue;
    }

    const advertised =
      rel.includes("service-desc") ||
      type === "application/vnd.oai.openapi+json" ||
      type === "application/openapi+json" ||
      (type === "application/json" &&
        SPEC_PATH_PATTERN.test(candidate.pathname));

    const recognizablePath = SPEC_PATH_PATTERN.test(candidate.pathname);

    if (!advertised && !recognizablePath) {
      continue;
    }

    candidate.hash = "";
    urls.add(candidate.toString());

    if (urls.size >= MAX_SPEC_LINKS) {
      break;
    }
  }

  return [...urls];
}
