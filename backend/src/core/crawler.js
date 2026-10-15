// STATUS: UPDATED
// File: src/core/crawler.js

import puppeteer from "puppeteer-core";

import { get } from "../request/request.js";
import { createRateLimiter } from "./rateLimiter.js";
import { normalizeUrl } from "../utils/url.js";
import { discoverLinks } from "../discovery/discovery.js";
import { extractCanonicalUrl } from "./discovery.js";
import { discoverSitemapUrls } from "./sitemapDiscovery.js";
import { assertInScope } from "./scope.js";
import { assertSafeUrl } from "../recon/shared/resolver.js";
import { extractJavaScriptEndpoints } from "./javascriptEndpointDiscovery.js";
import { extractOpenApiSpecUrls } from "./openApiSpecLinks.js";
import { extractOpenApiEndpoints } from "./openApiDiscovery.js";

const MAX_PATHS_HARD_LIMIT = 5000;
const MAX_DEPTH_HARD_LIMIT = 20;

const RENDER_TIMEOUT_MS = 10000;
const RENDER_SETTLE_MS = 750;
const MAX_RENDERED_HTML_LENGTH = 2 * 1024 * 1024;
const MAX_DYNAMIC_INPUTS = 500;
const MAX_DYNAMIC_FORMS = 100;
const MAX_DYNAMIC_LINKS = 1000;
const MAX_API_REQUESTS = 500;
const MAX_PARAMETER_NAMES = 200;
const MAX_BODY_BYTES_TO_INSPECT = 64 * 1024;

const MAX_SCRIPT_REFERENCES = 50;
const MAX_SCRIPT_ENDPOINTS_PER_PAGE = 500;
const MAX_SCRIPT_SOURCE_BYTES = 1024 * 1024;

// Crawl-wide limits prevent a large site from causing unbounded discovery.
const MAX_SCRIPT_REFERENCES_PER_CRAWL = 250;
const MAX_SCRIPT_ENDPOINTS_PER_CRAWL = 5000;

const MAX_OPENAPI_SPECS_PER_PAGE = 20;
const MAX_OPENAPI_ENDPOINTS_PER_PAGE = 500;
const MAX_OPENAPI_SPECS_PER_CRAWL = 50;
const MAX_OPENAPI_ENDPOINTS_PER_CRAWL = 2000;
const MAX_OPENAPI_SPEC_BYTES = 1024 * 1024;

const JAVASCRIPT_CONTENT_TYPES = [
  "application/javascript",
  "text/javascript",
  "application/ecmascript",
  "text/ecmascript",
  "application/x-javascript",
];

const createAbortError = () => {
  const error = new Error("Crawling was cancelled.");
  error.name = "AbortError";
  error.code = "CRAWL_CANCELLED";
  return error;
};

const logCrawlDiagnostic = (event, details = {}) => {
  try {
    console.warn(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: "warn",
        component: "crawler",
        event,
        ...details,
      }),
    );
  } catch {
    // Diagnostics must never interrupt a crawl.
  }
};

const normalizeRequestError = (error, signal) => {
  if (signal?.aborted || error?.code === "CRAWL_CANCELLED") {
    return "CRAWL_CANCELLED";
  }

  const code = String(error?.code ?? "").toUpperCase();
  const name = String(error?.name ?? "").toUpperCase();

  if (
    ["ECONNABORTED", "ETIMEDOUT", "ESOCKETTIMEDOUT"].includes(code) ||
    name === "TIMEOUTERROR"
  ) {
    return "CRAWL_TIMEOUT";
  }

  if (["ENOTFOUND", "EAI_AGAIN", "EAI_FAIL"].includes(code)) {
    return "CRAWL_DNS_FAILED";
  }

  if (
    ["ECONNREFUSED", "ECONNRESET", "EHOSTUNREACH", "ENETUNREACH"].includes(code)
  ) {
    return "CRAWL_CONNECTION_FAILED";
  }

  return "CRAWL_REQUEST_FAILED";
};

const normalizeRenderError = (error) => {
  const code = String(error?.code ?? "").toUpperCase();
  const name = String(error?.name ?? "").toUpperCase();

  if (
    ["ETIMEDOUT", "ESOCKETTIMEDOUT", "ECONNABORTED"].includes(code) ||
    name === "TIMEOUTERROR"
  ) {
    return "RENDER_TIMEOUT";
  }

  if (name === "TARGETCLOSEDERROR" || name === "PROTOCOLERROR") {
    return "RENDER_BROWSER_PROTOCOL_ERROR";
  }

  if (name === "TYPEERROR") {
    return "RENDER_TYPE_ERROR";
  }

  return "RENDER_FAILED";
};

const classifyHttpStatus = (statusCode) => {
  if (Number.isInteger(statusCode) && statusCode >= 200 && statusCode < 400) {
    return { status: "success", errorCode: null };
  }

  if (Number.isInteger(statusCode) && statusCode >= 400 && statusCode <= 599) {
    return {
      status: "failed",
      errorCode: `HTTP_${statusCode}`,
    };
  }

  return {
    status: "failed",
    errorCode: "CRAWL_INVALID_RESPONSE",
  };
};

const getHeader = (headers, name) => {
  if (!headers || typeof headers !== "object") {
    return "";
  }

  const key = Object.keys(headers).find(
    (headerName) => headerName.toLowerCase() === name.toLowerCase(),
  );

  return key ? headers[key] : "";
};

const isHtmlResponse = (headers, response) => {
  const contentType =
    getHeader(headers, "content-type") || response?.contentType || "";

  return String(contentType).toLowerCase().includes("text/html");
};

const isJavaScriptResponse = (headers) => {
  const contentType = String(getHeader(headers, "content-type") || "")
    .split(";")[0]
    .trim()
    .toLowerCase();

  return JAVASCRIPT_CONTENT_TYPES.includes(contentType);
};

const sanitizeObservedUrl = (value, baseUrl) => {
  try {
    const url = new URL(value);
    const base = new URL(baseUrl);

    if (!["http:", "https:"].includes(url.protocol)) {
      return null;
    }

    if (url.username || url.password || url.origin !== base.origin) {
      return null;
    }

    url.hash = "";

    for (const key of [...url.searchParams.keys()]) {
      url.searchParams.set(key, "");
    }

    return url.toString();
  } catch {
    return null;
  }
};

const sanitizeNavigationUrl = (value, baseUrl) => {
  try {
    const url = new URL(value, baseUrl);
    const base = new URL(baseUrl);

    if (!["http:", "https:"].includes(url.protocol)) {
      return null;
    }

    if (url.username || url.password || url.origin !== base.origin) {
      return null;
    }

    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
};

const extractScriptUrls = (html, baseUrl) => {
  if (typeof html !== "string" || !html) {
    return [];
  }

  const scripts = new Set();
  const scriptTagPattern = /<script\b[^>]*>/gi;
  const srcAttributePattern =
    /\bsrc\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/i;

  let tagMatch;

  while (
    scripts.size < MAX_SCRIPT_REFERENCES &&
    (tagMatch = scriptTagPattern.exec(html)) !== null
  ) {
    const srcMatch = tagMatch[0].match(srcAttributePattern);

    if (!srcMatch) {
      continue;
    }

    const rawSrc = srcMatch[1] ?? srcMatch[2] ?? srcMatch[3];

    if (!rawSrc || rawSrc.trim() !== rawSrc) {
      continue;
    }

    const scriptUrl = sanitizeNavigationUrl(rawSrc, baseUrl);

    if (scriptUrl) {
      scripts.add(scriptUrl);
    }
  }

  return [...scripts].slice(0, MAX_SCRIPT_REFERENCES);
};

const getParameterNamesFromUrl = (value) => {
  try {
    return [...new Set([...new URL(value).searchParams.keys()])]
      .filter(Boolean)
      .slice(0, MAX_PARAMETER_NAMES);
  } catch {
    return [];
  }
};

const getParameterNamesFromBody = (body, contentType) => {
  if (
    typeof body !== "string" ||
    !body ||
    Buffer.byteLength(body, "utf8") > MAX_BODY_BYTES_TO_INSPECT
  ) {
    return [];
  }

  const type = String(contentType || "").toLowerCase();

  try {
    if (type.includes("application/json")) {
      const parsed = JSON.parse(body);

      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        return [];
      }

      return Object.keys(parsed).slice(0, MAX_PARAMETER_NAMES);
    }

    if (type.includes("application/x-www-form-urlencoded")) {
      return [...new Set([...new URLSearchParams(body).keys()])].slice(
        0,
        MAX_PARAMETER_NAMES,
      );
    }
  } catch {
    // Ignore malformed bodies. Never retain raw content.
  }

  return [];
};

const safeMetadataString = (value, maxLength = 256) => {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, maxLength) : null;
};

const launchBrowser = async () => {
  const executablePath =
    process.env.PUPPETEER_EXECUTABLE_PATH || "/usr/bin/chromium";

  return puppeteer.launch({
    executablePath,
    headless: true,
    timeout: RENDER_TIMEOUT_MS,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
    ],
  });
};

const waitForRender = async (signal) => {
  if (signal?.aborted) {
    throw createAbortError();
  }

  await new Promise((resolve, reject) => {
    let timeout;

    const onAbort = () => {
      clearTimeout(timeout);
      signal?.removeEventListener("abort", onAbort);
      reject(createAbortError());
    };

    timeout = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, RENDER_SETTLE_MS);

    signal?.addEventListener("abort", onAbort, { once: true });

    if (signal?.aborted) {
      onAbort();
    }
  });
};

const collectDynamicDom = async (page) => {
  return page.evaluate(
    ({ maxInputs, maxForms, maxLinks }) => {
      const clean = (value, max = 512) => {
        if (typeof value !== "string") {
          return null;
        }

        const result = value.trim().replace(/\s+/g, " ");
        return result ? result.slice(0, max) : null;
      };

      const readControl = (element) => {
        const tag = element.tagName.toLowerCase();

        if (!["input", "textarea", "select", "button"].includes(tag)) {
          return null;
        }

        const labels = Array.from(element.labels || [])
          .map((label) => label.textContent || "")
          .filter(Boolean)
          .join(" ");

        return {
          tag,
          name: clean(element.getAttribute("name")),
          type: clean(
            tag === "input" || tag === "button"
              ? element.getAttribute("type") ||
                  (tag === "input" ? "text" : "submit")
              : tag,
            64,
          ),
          id: clean(element.id),
          label: clean(labels),
          ariaLabel: clean(element.getAttribute("aria-label")),
          placeholder: clean(element.getAttribute("placeholder")),
          formId: clean(element.form?.id || element.getAttribute("form")),
          required: element.required === true,
          disabled: element.disabled === true,
          autocomplete: clean(element.getAttribute("autocomplete"), 128),
        };
      };

      const inputs = Array.from(
        document.querySelectorAll("input, textarea, select, button"),
      )
        .slice(0, maxInputs)
        .map(readControl)
        .filter(Boolean);

      const forms = Array.from(document.forms)
        .slice(0, maxForms)
        .map((form) => {
          const controls = Array.from(
            form.querySelectorAll("input, textarea, select, button"),
          ).slice(0, 200);

          if (form.id) {
            for (const control of document.querySelectorAll("[form]")) {
              if (control.getAttribute("form") === form.id) {
                controls.push(control);
              }
            }
          }

          return {
            id: clean(form.id),
            action: form.action || location.href,
            method: clean(form.method || "GET", 16)?.toUpperCase() || "GET",
            inputs: [...new Set(controls)]
              .slice(0, 200)
              .map(readControl)
              .filter(Boolean),
          };
        });

      const discoveredLinks = Array.from(document.querySelectorAll("a[href]"))
        .slice(0, maxLinks)
        .map((anchor) => anchor.href)
        .filter(Boolean);

      return { inputs, forms, discoveredLinks };
    },
    {
      maxInputs: MAX_DYNAMIC_INPUTS,
      maxForms: MAX_DYNAMIC_FORMS,
      maxLinks: MAX_DYNAMIC_LINKS,
    },
  );
};

const renderPage = async ({
  browser,
  url,
  scope,
  headers = {},
  signal,
  validateSafeUrl = assertSafeUrl,
}) => {
  if (!browser || signal?.aborted) {
    return null;
  }

  const targetOrigin = new URL(url).origin;
  const page = await browser.newPage();
  const apiRequests = new Map();

  const rememberApiRequest = (request) => {
    try {
      if (signal?.aborted) {
        return;
      }

      const resourceType = String(request.resourceType() || "").toLowerCase();

      if (!["fetch", "xhr"].includes(resourceType)) {
        return;
      }

      const method = String(request.method() || "GET").toUpperCase();
      const requestUrl = request.url();
      const sanitizedUrl = sanitizeObservedUrl(requestUrl, url);

      if (!sanitizedUrl || new URL(requestUrl).origin !== targetOrigin) {
        return;
      }

      const requestHeaders = request.headers() || {};
      const contentType = safeMetadataString(
        requestHeaders["content-type"] || requestHeaders["Content-Type"],
      );

      const bodyParameterNames = getParameterNamesFromBody(
        request.postData(),
        contentType,
      );

      const key = JSON.stringify([sanitizedUrl, method, resourceType]);

      if (!apiRequests.has(key) && apiRequests.size >= MAX_API_REQUESTS) {
        return;
      }

      const existing = apiRequests.get(key);

      apiRequests.set(key, {
        url: sanitizedUrl,
        method,
        resourceType,
        contentType,
        queryParameterNames: getParameterNamesFromUrl(requestUrl),
        bodyParameterNames,
        statusCode: existing?.statusCode ?? null,
      });
    } catch {
      // Observation must never interrupt the crawl.
    }
  };

  let stage = "configure";

  try {
    page.setDefaultNavigationTimeout(RENDER_TIMEOUT_MS);
    page.setDefaultTimeout(RENDER_TIMEOUT_MS);

    await page.setExtraHTTPHeaders(headers);
    await page.setRequestInterception(true);

    page.on("request", (request) => {
      void (async () => {
        try {
          if (signal?.aborted) {
            await request.abort("aborted").catch(() => {});
            return;
          }

          const requestUrl = request.url();

          if (
            requestUrl === "about:blank" ||
            requestUrl.startsWith("data:") ||
            requestUrl.startsWith("blob:")
          ) {
            await request.continue().catch(() => {});
            return;
          }

          const parsedUrl = new URL(requestUrl);

          if (
            !["http:", "https:"].includes(parsedUrl.protocol) ||
            parsedUrl.origin !== targetOrigin
          ) {
            await request.abort("blockedbyclient").catch(() => {});
            return;
          }

          assertInScope(requestUrl, scope);
          await validateSafeUrl(requestUrl);

          rememberApiRequest(request);
          await request.continue().catch(() => {});
        } catch {
          await request.abort("blockedbyclient").catch(() => {});
        }
      })();
    });

    page.on("response", (response) => {
      try {
        const request = response.request();
        const resourceType = String(request.resourceType() || "").toLowerCase();

        if (!["fetch", "xhr"].includes(resourceType)) {
          return;
        }

        const sanitizedUrl = sanitizeObservedUrl(request.url(), url);

        if (!sanitizedUrl) {
          return;
        }

        const key = JSON.stringify([
          sanitizedUrl,
          String(request.method() || "GET").toUpperCase(),
          resourceType,
        ]);

        const existing = apiRequests.get(key);

        if (!existing) {
          return;
        }

        const status = response.status();

        apiRequests.set(key, {
          ...existing,
          statusCode:
            Number.isInteger(status) && status >= 100 && status <= 599
              ? status
              : null,
        });
      } catch {
        // Ignore malformed or unavailable response metadata.
      }
    });

    stage = "navigation";

    await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: RENDER_TIMEOUT_MS,
    });

    stage = "settle";
    await waitForRender(signal);

    if (signal?.aborted) {
      throw createAbortError();
    }

    stage = "read_html";
    const html = await page.content();

    if (
      typeof html !== "string" ||
      html.length === 0 ||
      Buffer.byteLength(html, "utf8") > MAX_RENDERED_HTML_LENGTH
    ) {
      logCrawlDiagnostic("render.invalid_html", {
        stage,
        reason:
          typeof html !== "string"
            ? "INVALID_HTML_TYPE"
            : html.length === 0
              ? "EMPTY_HTML"
              : "HTML_SIZE_LIMIT",
      });

      return null;
    }

    stage = "collect_dom";
    const dynamicDom = await collectDynamicDom(page);

    const sanitizeDynamicLinks = (links) => {
      const result = new Set();

      for (const link of links || []) {
        const sanitized = sanitizeNavigationUrl(link, url);

        if (sanitized) {
          result.add(sanitized);
        }

        if (result.size >= MAX_DYNAMIC_LINKS) {
          break;
        }
      }

      return [...result];
    };

    const sanitizeDynamicForms = (forms) => {
      const result = [];

      for (const form of forms || []) {
        try {
          const action = new URL(form.action || url, url);

          if (
            !["http:", "https:"].includes(action.protocol) ||
            action.username ||
            action.password ||
            action.origin !== targetOrigin
          ) {
            continue;
          }

          action.hash = "";

          result.push({
            id: safeMetadataString(form.id, 512),
            action: action.toString(),
            method: ["GET", "POST", "DIALOG"].includes(
              String(form.method || "GET").toUpperCase(),
            )
              ? String(form.method || "GET").toUpperCase()
              : "GET",
            inputs: (form.inputs || []).slice(0, 200),
          });

          if (result.length >= MAX_DYNAMIC_FORMS) {
            break;
          }
        } catch {
          // Ignore invalid form actions.
        }
      }

      return result;
    };

    return {
      html,
      dynamicInputs: (dynamicDom.inputs || []).slice(0, MAX_DYNAMIC_INPUTS),
      dynamicForms: sanitizeDynamicForms(dynamicDom.forms),
      discoveredLinks: sanitizeDynamicLinks(dynamicDom.discoveredLinks),
      apiRequests: [...apiRequests.values()].slice(0, MAX_API_REQUESTS),
    };
  } catch (error) {
    if (signal?.aborted || error?.code === "CRAWL_CANCELLED") {
      throw createAbortError();
    }

    logCrawlDiagnostic("render.failed", {
      stage,
      errorCode: normalizeRenderError(error),
    });

    return null;
  } finally {
    await page.close().catch(() => {});
  }
};

const collectStaticAndRenderedLinks = ({
  staticHtml,
  renderedHtml,
  baseUrl,
}) => {
  const links = new Set();

  for (const html of [staticHtml, renderedHtml]) {
    if (typeof html !== "string" || !html) {
      continue;
    }

    try {
      for (const link of discoverLinks({
        html,
        baseUrl,
        sameOrigin: true,
      })) {
        const safeLink = sanitizeNavigationUrl(link, baseUrl);

        if (safeLink) {
          links.add(safeLink);
        }

        if (links.size >= MAX_DYNAMIC_LINKS) {
          return [...links];
        }
      }
    } catch {
      // A failed representation must not discard the other one.
    }
  }

  return [...links];
};

/**
 * Fetches same-origin JavaScript resources as text.
 * Script files are not crawl pages and do not consume maxPaths.
 * The requested URL and endpoint sets are shared across the crawl.
 */
const discoverJavaScriptEndpoints = async ({
  html,
  baseUrl,
  scope,
  headers,
  signal,
  requestPage,
  validateSafeUrl,
  limiter,
  requestedScripts,
  reportedEndpoints,
}) => {
  if (
    typeof html !== "string" ||
    !html ||
    signal?.aborted ||
    !(requestedScripts instanceof Set) ||
    !(reportedEndpoints instanceof Set)
  ) {
    return [];
  }

  const scriptUrls = extractScriptUrls(html, baseUrl);
  const pageEndpoints = new Set();

  for (const scriptUrl of scriptUrls) {
    if (signal?.aborted) {
      break;
    }

    if (
      requestedScripts.has(scriptUrl) ||
      requestedScripts.size >= MAX_SCRIPT_REFERENCES_PER_CRAWL
    ) {
      continue;
    }

    let safeScriptUrl;

    try {
      safeScriptUrl = normalizeUrl(scriptUrl);
      assertInScope(safeScriptUrl, scope);
      await validateSafeUrl(safeScriptUrl);
    } catch {
      continue;
    }

    if (requestedScripts.has(safeScriptUrl)) {
      continue;
    }

    if (requestedScripts.size >= MAX_SCRIPT_REFERENCES_PER_CRAWL) {
      break;
    }

    // Mark before the request to prevent repeated attempts on other pages.
    requestedScripts.add(safeScriptUrl);

    try {
      await limiter.acquire();
    } catch {
      if (signal?.aborted) {
        break;
      }

      continue;
    }

    if (signal?.aborted) {
      break;
    }

    let response;

    try {
      response = await requestPage(safeScriptUrl, { headers, signal });
    } catch {
      if (signal?.aborted) {
        break;
      }

      continue;
    }

    if (signal?.aborted) {
      break;
    }

    const statusCode = Number.isInteger(response?.statusCode)
      ? response.statusCode
      : Number.isInteger(response?.status)
        ? response.status
        : null;

    if (
      !Number.isInteger(statusCode) ||
      statusCode < 200 ||
      statusCode >= 300
    ) {
      continue;
    }

    const responseHeaders =
      response?.headers && typeof response.headers === "object"
        ? response.headers
        : {};

    if (!isJavaScriptResponse(responseHeaders)) {
      continue;
    }

    const source = typeof response?.body === "string" ? response.body : "";

    if (
      !source ||
      Buffer.byteLength(source, "utf8") > MAX_SCRIPT_SOURCE_BYTES
    ) {
      continue;
    }

    const remainingGlobal =
      MAX_SCRIPT_ENDPOINTS_PER_CRAWL - reportedEndpoints.size;
    const remainingPage = MAX_SCRIPT_ENDPOINTS_PER_PAGE - pageEndpoints.size;
    const maxEndpoints = Math.min(remainingGlobal, remainingPage);

    if (maxEndpoints <= 0) {
      break;
    }

    let extracted;

    try {
      extracted = extractJavaScriptEndpoints({
        source,
        scriptUrl: safeScriptUrl,
        pageUrl: baseUrl,
        maxEndpoints,
      });
    } catch {
      continue;
    }

    for (const endpoint of extracted) {
      if (signal?.aborted) {
        break;
      }

      let safeEndpoint;

      try {
        safeEndpoint = normalizeUrl(endpoint);
        assertInScope(safeEndpoint, scope);
        await validateSafeUrl(safeEndpoint);
      } catch {
        continue;
      }

      if (
        reportedEndpoints.size >= MAX_SCRIPT_ENDPOINTS_PER_CRAWL ||
        pageEndpoints.size >= MAX_SCRIPT_ENDPOINTS_PER_PAGE
      ) {
        break;
      }

      reportedEndpoints.add(safeEndpoint);
      pageEndpoints.add(safeEndpoint);
    }
  }

  return [...pageEndpoints];
};

/**
 * Discovers OpenAPI/Swagger JSON specifications.
 * Documented operations are metadata only and are never requested.
 * Both sets are shared across the entire crawl.
 */
const discoverOpenApiEndpoints = async ({
  html,
  baseUrl,
  scope,
  headers,
  signal,
  requestPage,
  validateSafeUrl,
  limiter,
  attemptedSpecifications,
  reportedEndpoints,
}) => {
  if (
    typeof html !== "string" ||
    !html ||
    signal?.aborted ||
    !(attemptedSpecifications instanceof Set) ||
    !(reportedEndpoints instanceof Map)
  ) {
    return [];
  }

  let specificationUrls;

  try {
    specificationUrls = extractOpenApiSpecUrls(html, baseUrl).slice(
      0,
      MAX_OPENAPI_SPECS_PER_PAGE,
    );
  } catch {
    return [];
  }

  const pageEndpoints = new Map();

  for (const specificationUrl of specificationUrls) {
    if (signal?.aborted) {
      break;
    }

    if (
      attemptedSpecifications.has(specificationUrl) ||
      attemptedSpecifications.size >= MAX_OPENAPI_SPECS_PER_CRAWL
    ) {
      continue;
    }

    let safeSpecificationUrl;

    try {
      safeSpecificationUrl = normalizeUrl(specificationUrl);

      const specification = new URL(safeSpecificationUrl);
      const pageUrl = new URL(baseUrl);

      if (
        !["http:", "https:"].includes(specification.protocol) ||
        specification.username ||
        specification.password ||
        specification.origin !== pageUrl.origin
      ) {
        continue;
      }

      assertInScope(safeSpecificationUrl, scope);
      await validateSafeUrl(safeSpecificationUrl);
    } catch {
      continue;
    }

    if (
      attemptedSpecifications.has(safeSpecificationUrl) ||
      attemptedSpecifications.size >= MAX_OPENAPI_SPECS_PER_CRAWL
    ) {
      continue;
    }

    // Count attempted requests globally, including unsuccessful requests.
    attemptedSpecifications.add(safeSpecificationUrl);

    try {
      await limiter.acquire();
    } catch {
      if (signal?.aborted) {
        break;
      }

      continue;
    }

    if (signal?.aborted) {
      break;
    }

    let response;

    try {
      response = await requestPage(safeSpecificationUrl, {
        headers,
        signal,
      });
    } catch {
      if (signal?.aborted) {
        break;
      }

      continue;
    }

    if (signal?.aborted) {
      break;
    }

    const statusCode = Number.isInteger(response?.statusCode)
      ? response.statusCode
      : Number.isInteger(response?.status)
        ? response.status
        : null;

    if (
      !Number.isInteger(statusCode) ||
      statusCode < 200 ||
      statusCode >= 300
    ) {
      continue;
    }

    const source = typeof response?.body === "string" ? response.body : "";

    if (!source || Buffer.byteLength(source, "utf8") > MAX_OPENAPI_SPEC_BYTES) {
      continue;
    }

    const remainingGlobal =
      MAX_OPENAPI_ENDPOINTS_PER_CRAWL - reportedEndpoints.size;
    const remainingPage = MAX_OPENAPI_ENDPOINTS_PER_PAGE - pageEndpoints.size;
    const maxEndpoints = Math.min(remainingGlobal, remainingPage);

    if (maxEndpoints <= 0) {
      break;
    }

    let extracted;

    try {
      extracted = extractOpenApiEndpoints({
        source,
        baseUrl: safeSpecificationUrl,
        maxEndpoints,
      });
    } catch {
      continue;
    }

    for (const endpoint of extracted) {
      if (signal?.aborted) {
        break;
      }

      const method = String(endpoint.method || "").toUpperCase();
      const path = endpoint.path;

      if (!method || typeof path !== "string" || !path) {
        continue;
      }

      // Deduplicate endpoint identity across specifications.
      const identity = `${method} ${path}`;

      if (reportedEndpoints.has(identity)) {
        const existing = reportedEndpoints.get(identity);
        pageEndpoints.set(identity, existing);
        continue;
      }

      if (
        reportedEndpoints.size >= MAX_OPENAPI_ENDPOINTS_PER_CRAWL ||
        pageEndpoints.size >= MAX_OPENAPI_ENDPOINTS_PER_PAGE
      ) {
        break;
      }

      const metadata = {
        method,
        path,
        specificationUrl: safeSpecificationUrl,
      };

      reportedEndpoints.set(identity, metadata);
      pageEndpoints.set(identity, metadata);
    }
  }

  return [...pageEndpoints.values()];
};

const enqueueDiscoveredUrl = async ({
  value,
  depth,
  scope,
  queue,
  queued,
  visited,
  maxPaths,
  validateSafeUrl = assertSafeUrl,
}) => {
  let normalized;

  try {
    normalized = normalizeUrl(value);
    assertInScope(normalized, scope);
    await validateSafeUrl(normalized);
  } catch {
    return false;
  }

  if (visited.has(normalized) || queued.has(normalized)) {
    return false;
  }

  if (visited.size + queue.length >= maxPaths) {
    return false;
  }

  queue.push({ url: normalized, depth });
  queued.add(normalized);

  return true;
};

const enqueueSitemapUrls = async ({
  startUrl,
  scope,
  headers,
  signal,
  queue,
  queued,
  visited,
  maxPaths,
  discoverSitemaps = discoverSitemapUrls,
  validateSafeUrl = assertSafeUrl,
}) => {
  const sitemapUrls = await discoverSitemaps({
    startUrl,
    scope,
    headers,
    signal,
  });

  for (const sitemapUrl of sitemapUrls) {
    if (signal?.aborted) {
      break;
    }

    await enqueueDiscoveredUrl({
      value: sitemapUrl,
      depth: 1,
      scope,
      queue,
      queued,
      visited,
      maxPaths,
      validateSafeUrl,
    });
  }
};

const crawl = async ({
  startUrl,
  scope,
  maxPaths = 25,
  maxDepth = 2,
  requestsPerSecond = 2,
  headers = {},
  signal,
  onPage = null,
  requestPage = get,
  discoverSitemaps = discoverSitemapUrls,
  launch = launchBrowser,
  validateSafeUrl = assertSafeUrl,
  createLimiter = createRateLimiter,
} = {}) => {
  if (typeof startUrl !== "string" || !scope) {
    throw new TypeError("startUrl and scope are required.");
  }

  if (
    typeof requestPage !== "function" ||
    typeof discoverSitemaps !== "function" ||
    typeof launch !== "function" ||
    typeof validateSafeUrl !== "function" ||
    typeof createLimiter !== "function"
  ) {
    throw new TypeError("Crawler dependencies must be functions.");
  }

  if (
    !Number.isInteger(maxPaths) ||
    maxPaths < 1 ||
    maxPaths > MAX_PATHS_HARD_LIMIT
  ) {
    throw new TypeError(
      `maxPaths must be between 1 and ${MAX_PATHS_HARD_LIMIT}.`,
    );
  }

  if (
    !Number.isInteger(maxDepth) ||
    maxDepth < 0 ||
    maxDepth > MAX_DEPTH_HARD_LIMIT
  ) {
    throw new TypeError(
      `maxDepth must be between 0 and ${MAX_DEPTH_HARD_LIMIT}.`,
    );
  }

  const limiter = createLimiter({ requestsPerSecond });
  const visited = new Set();
  const queued = new Set();
  const firstUrl = normalizeUrl(startUrl);

  assertInScope(firstUrl, scope);
  await validateSafeUrl(firstUrl);

  const queue = [{ url: firstUrl, depth: 0 }];
  queued.add(firstUrl);

  const results = [];
  let browser = null;
  let sitemapDiscoveryAttempted = false;

  // Shared crawl-wide discovery budgets and deduplication.
  const attemptedOpenApiSpecifications = new Set();
  const reportedOpenApiEndpoints = new Map();
  const requestedScripts = new Set();
  const reportedScriptEndpoints = new Set();

  try {
    browser = await launch();
  } catch (error) {
    logCrawlDiagnostic("browser.launch_failed", {
      errorCode: normalizeRenderError(error),
    });
  }

  try {
    while (queue.length > 0 && visited.size < maxPaths) {
      if (signal?.aborted) {
        break;
      }

      const current = queue.shift();

      if (visited.has(current.url) || current.depth > maxDepth) {
        continue;
      }

      assertInScope(current.url, scope);
      visited.add(current.url);

      await limiter.acquire();

      if (signal?.aborted) {
        break;
      }

      let response;

      try {
        response = await requestPage(current.url, { headers, signal });
      } catch (error) {
        const failedPage = {
          url: current.url,
          depth: current.depth,
          status: "failed",
          statusCode: null,
          headers: {},
          body: null,
          dynamicInputs: [],
          dynamicForms: [],
          discoveredLinks: [],
          apiRequests: [],
          openApiEndpoints: [],
          javascriptEndpoints: [],
          errorCode: normalizeRequestError(error, signal),
        };

        results.push(failedPage);

        if (typeof onPage === "function") {
          await onPage(failedPage);
        }

        if (signal?.aborted) {
          break;
        }

        if (!sitemapDiscoveryAttempted && current.depth === 0 && maxDepth > 0) {
          sitemapDiscoveryAttempted = true;

          try {
            await enqueueSitemapUrls({
              startUrl: firstUrl,
              scope,
              headers,
              signal,
              queue,
              queued,
              visited,
              maxPaths,
              discoverSitemaps,
              validateSafeUrl,
            });
          } catch {
            logCrawlDiagnostic("sitemap.discovery_failed", {
              reason: "SITEMAP_DISCOVERY_ERROR",
            });
          }
        }

        continue;
      }

      const statusCode = Number.isInteger(response?.statusCode)
        ? response.statusCode
        : Number.isInteger(response?.status)
          ? response.status
          : null;

      const classification = classifyHttpStatus(statusCode);

      const responseHeaders =
        response?.headers && typeof response.headers === "object"
          ? response.headers
          : {};

      const staticHtml =
        typeof response?.body === "string" ? response.body : "";

      const discoveryHtml =
        classification.status === "success" ? staticHtml : "";

      let renderedHtml = "";
      let dynamicInputs = [];
      let dynamicForms = [];
      let dynamicLinks = [];
      let apiRequests = [];

      if (
        classification.status === "success" &&
        staticHtml &&
        isHtmlResponse(responseHeaders, response) &&
        browser
      ) {
        try {
          const rendered = await renderPage({
            browser,
            url: current.url,
            scope,
            headers,
            signal,
            validateSafeUrl,
          });

          if (rendered) {
            renderedHtml = rendered.html || "";
            dynamicInputs = rendered.dynamicInputs || [];
            dynamicForms = rendered.dynamicForms || [];
            dynamicLinks = rendered.discoveredLinks || [];
            apiRequests = rendered.apiRequests || [];
          }
        } catch (error) {
          if (signal?.aborted || error?.code === "CRAWL_CANCELLED") {
            break;
          }

          logCrawlDiagnostic("render.unexpected_failure", {
            errorCode: normalizeRenderError(error),
          });
        }
      }

      if (signal?.aborted) {
        break;
      }

      const staticAndRenderedLinks = collectStaticAndRenderedLinks({
        staticHtml,
        renderedHtml,
        baseUrl: current.url,
      });

      const canonicalUrl = extractCanonicalUrl(discoveryHtml, current.url);

      const initialDiscoveredUrls = [
        ...(canonicalUrl ? [canonicalUrl] : []),
        ...staticAndRenderedLinks,
        ...dynamicLinks,
      ];

      const reportDiscoveredLinks = new Set(
        initialDiscoveredUrls
          .map((value) => sanitizeObservedUrl(value, current.url))
          .filter(Boolean),
      );

      const page = {
        url: current.url,
        depth: current.depth,
        status: classification.status,
        statusCode,
        headers: responseHeaders,
        body: discoveryHtml || null,
        dynamicInputs,
        dynamicForms,
        discoveredLinks: [...reportDiscoveredLinks].slice(0, MAX_DYNAMIC_LINKS),
        apiRequests,
        openApiEndpoints: [],
        javascriptEndpoints: [],
        errorCode: classification.errorCode,
      };

      results.push(page);

      // Preserve existing callback timing. Discovery metadata is completed
      // after this callback, but is present in the final crawl result.
      if (typeof onPage === "function") {
        await onPage(page);
      }

      if (signal?.aborted) {
        break;
      }

      if (!sitemapDiscoveryAttempted && current.depth === 0 && maxDepth > 0) {
        sitemapDiscoveryAttempted = true;

        try {
          await enqueueSitemapUrls({
            startUrl: firstUrl,
            scope,
            headers,
            signal,
            queue,
            queued,
            visited,
            maxPaths,
            discoverSitemaps,
            validateSafeUrl,
          });
        } catch {
          logCrawlDiagnostic("sitemap.discovery_failed", {
            reason: "SITEMAP_DISCOVERY_ERROR",
          });
        }
      }

      if (signal?.aborted) {
        break;
      }

      if (
        classification.status !== "success" ||
        current.depth >= maxDepth ||
        !isHtmlResponse(responseHeaders, response)
      ) {
        continue;
      }

      const combinedHtml = [discoveryHtml, renderedHtml]
        .filter(Boolean)
        .join("\n");

      // OpenAPI/Swagger documents are parsed as metadata only.
      try {
        page.openApiEndpoints = await discoverOpenApiEndpoints({
          html: combinedHtml,
          baseUrl: current.url,
          scope,
          headers,
          signal,
          requestPage,
          validateSafeUrl,
          limiter,
          attemptedSpecifications: attemptedOpenApiSpecifications,
          reportedEndpoints: reportedOpenApiEndpoints,
        });
      } catch (error) {
        if (signal?.aborted || error?.code === "CRAWL_CANCELLED") {
          break;
        }

        logCrawlDiagnostic("openapi.discovery_failed", {
          reason: "OPENAPI_DISCOVERY_ERROR",
        });
      }

      if (signal?.aborted) {
        break;
      }

      try {
        page.javascriptEndpoints = await discoverJavaScriptEndpoints({
          html: combinedHtml,
          baseUrl: current.url,
          scope,
          headers,
          signal,
          requestPage,
          validateSafeUrl,
          limiter,
          requestedScripts,
          reportedEndpoints: reportedScriptEndpoints,
        });
      } catch (error) {
        if (signal?.aborted || error?.code === "CRAWL_CANCELLED") {
          break;
        }

        logCrawlDiagnostic("javascript.discovery_failed", {
          reason: "JAVASCRIPT_DISCOVERY_ERROR",
        });
      }

      if (signal?.aborted) {
        break;
      }

      for (const endpoint of page.javascriptEndpoints) {
        const observed = sanitizeObservedUrl(endpoint, current.url);

        if (observed) {
          reportDiscoveredLinks.add(observed);
        }
      }

      page.discoveredLinks = [...reportDiscoveredLinks].slice(
        0,
        MAX_DYNAMIC_LINKS,
      );

      const allDiscoveredUrls = [
        ...initialDiscoveredUrls,
        ...page.javascriptEndpoints,
      ];

      for (const discoveredUrl of allDiscoveredUrls) {
        if (signal?.aborted) {
          break;
        }

        await enqueueDiscoveredUrl({
          value: discoveredUrl,
          depth: current.depth + 1,
          scope,
          queue,
          queued,
          visited,
          maxPaths,
          validateSafeUrl,
        });
      }
    }
  } finally {
    if (browser) {
      await browser.close().catch(() => {});
    }
  }

  return {
    pages: results.map((page) => ({
      url: page.url,
      depth: page.depth,
      status: page.status,
      statusCode: page.statusCode,
      errorCode: page.errorCode,
      discoveredLinks: page.discoveredLinks ?? [],
      dynamicInputs: page.dynamicInputs ?? [],
      dynamicForms: page.dynamicForms ?? [],
      apiRequests: page.apiRequests ?? [],
      openApiEndpoints: page.openApiEndpoints ?? [],
      javascriptEndpoints: page.javascriptEndpoints ?? [],
    })),
    discoverySummary: {
      attemptedOpenApiSpecifications: attemptedOpenApiSpecifications.size,
      openApiEndpoints: reportedOpenApiEndpoints.size,
      requestedScripts: requestedScripts.size,
      javascriptEndpoints: reportedScriptEndpoints.size,
    },
    visited: visited.size,
    cancelled: Boolean(signal?.aborted),
  };
};

export { crawl, MAX_PATHS_HARD_LIMIT, MAX_DEPTH_HARD_LIMIT };
