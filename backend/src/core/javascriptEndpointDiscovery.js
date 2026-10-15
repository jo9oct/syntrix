const DEFAULT_MAX_ENDPOINTS = 500;
const MAX_SOURCE_BYTES = 1024 * 1024;

const QUOTED_STRING_PATTERN = /(["'`])((?:\\.|(?!\1)[^\\])*?)\1/g;

const API_PATH_PATTERN = /^(?:\/|\.\.?\/)?(?:api(?:\/|$)|graphql(?:\/|$))/i;

const isHttpUrl = (url) =>
  url.protocol === "http:" || url.protocol === "https:";

const hasCredentials = (url) => Boolean(url.username || url.password);

const extractJavaScriptEndpoints = ({
  source,
  scriptUrl,
  pageUrl,
  maxEndpoints = DEFAULT_MAX_ENDPOINTS,
} = {}) => {
  if (
    typeof source !== "string" ||
    source.length === 0 ||
    typeof scriptUrl !== "string" ||
    typeof pageUrl !== "string" ||
    !Number.isSafeInteger(maxEndpoints) ||
    maxEndpoints <= 0
  ) {
    return [];
  }

  if (Buffer.byteLength(source, "utf8") > MAX_SOURCE_BYTES) {
    return [];
  }

  let script;
  let page;

  try {
    script = new URL(scriptUrl);
    page = new URL(pageUrl);
  } catch {
    return [];
  }

  if (
    !isHttpUrl(script) ||
    !isHttpUrl(page) ||
    script.origin !== page.origin ||
    hasCredentials(script) ||
    hasCredentials(page)
  ) {
    return [];
  }

  const endpoints = [];
  const seen = new Set();
  const pattern = new RegExp(
    QUOTED_STRING_PATTERN.source,
    QUOTED_STRING_PATTERN.flags,
  );
  const limit = Math.min(maxEndpoints, DEFAULT_MAX_ENDPOINTS);

  let match;

  while (endpoints.length < limit && (match = pattern.exec(source)) !== null) {
    const candidate = match[2];

    if (
      !candidate ||
      !API_PATH_PATTERN.test(candidate) ||
      candidate !== candidate.trim() ||
      /[\u0000-\u0020\u007f\\]/.test(candidate) ||
      candidate.includes("${") ||
      candidate.includes("`")
    ) {
      continue;
    }

    let endpoint;

    try {
      endpoint = new URL(candidate, page);
    } catch {
      continue;
    }

    if (
      !isHttpUrl(endpoint) ||
      endpoint.origin !== page.origin ||
      hasCredentials(endpoint)
    ) {
      continue;
    }

    endpoint.hash = "";

    if (seen.has(endpoint.href)) {
      continue;
    }

    seen.add(endpoint.href);
    endpoints.push(endpoint.href);
  }

  return endpoints;
};

export { extractJavaScriptEndpoints };
