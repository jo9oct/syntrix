
/* STATUS: UPDATED */

import { get } from "../../request/request.js";

import { createExchangeEvidence } from "../shared/evidence.js";
import { createTechnologyFingerprint } from "../shared/fingerprint.js";
import {
  createReconScanner,
  getTargetUrl,
} from "../shared/reconContract.js";
import { assertSafeUrl } from "../shared/resolver.js";

const MAX_HTML_LENGTH = 512 * 1024;
const MAX_TAGS = 1500;
const MAX_MATCHES_PER_TECHNOLOGY = 5;

const SENSITIVE_HEADERS = new Set([
  "authorization",
  "proxy-authorization",
  "cookie",
  "set-cookie",
  "x-api-key",
  "x-auth-token",
  "x-csrf-token",
  "x-xsrf-token",
]);

const SIGNATURES = Object.freeze([
  {
    name: "WordPress",
    rules: [
      { source: "asset", pattern: /\/wp-content\//i, confidence: "high" },
      { source: "asset", pattern: /\/wp-includes\//i, confidence: "high" },
      { source: "generator", pattern: /^WordPress(?:\s|$)/i, confidence: "high" },
    ],
  },
  {
    name: "Next.js",
    rules: [
      { source: "asset", pattern: /\/_next\/static\//i, confidence: "high" },
      { source: "html", pattern: /<script\b[^>]*id=["']__NEXT_DATA__["']/i, confidence: "high" },
      { source: "html", pattern: /self\.__next_f\s*\./i, confidence: "medium" },
      { source: "header:x-powered-by", pattern: /^Next\.js\b/i, confidence: "high" },
    ],
  },
  {
    name: "React",
    rules: [
      { source: "asset", pattern: /(?:^|\/)react(?:-dom)?(?:\.production|\.development)?(?:\.min)?\.js(?:[?#]|$)/i, confidence: "high" },
      { source: "html", pattern: /\bdata-reactroot(?:\s|=|>)/i, confidence: "high" },
    ],
  },
  {
    name: "Angular",
    rules: [
      { source: "html", pattern: /\bng-version\s*=/i, confidence: "high" },
      { source: "asset", pattern: /(?:^|\/)angular(?:\.min)?\.js(?:[?#]|$)/i, confidence: "high" },
      { source: "html", pattern: /\bng-app(?:\s|=|>)/i, confidence: "medium" },
    ],
  },
  {
    name: "Vue.js",
    rules: [
      { source: "asset", pattern: /(?:^|\/)vue(?:\.runtime(?:\.global)?)?(?:\.min)?\.js(?:[?#]|$)/i, confidence: "high" },
      { source: "html", pattern: /\bdata-v-[a-f0-9]{6,16}(?:\s|=|>)/i, confidence: "medium" },
    ],
  },
  {
    name: "jQuery",
    rules: [
      { source: "asset", pattern: /(?:^|\/)jquery(?:-[0-9][\w.-]*)?(?:\.min)?\.js(?:[?#]|$)/i, confidence: "high" },
    ],
  },
  {
    name: "Bootstrap",
    rules: [
      { source: "asset", pattern: /(?:^|\/)bootstrap(?:\.bundle)?(?:\.min)?\.(?:js|css)(?:[?#]|$)/i, confidence: "high" },
    ],
  },
  {
    name: "PHP",
    rules: [
      { source: "header:x-powered-by", pattern: /\bPHP(?:\/|\s)\d/i, confidence: "high" },
      { source: "header:set-cookie", pattern: /(?:^|[;,]\s*)PHPSESSID=/i, confidence: "medium" },
    ],
  },
  {
    name: "Express",
    rules: [
      { source: "header:x-powered-by", pattern: /^Express(?:\s|\/|$)/i, confidence: "high" },
    ],
  },
  {
    name: "ASP.NET",
    rules: [
      { source: "header:x-powered-by", pattern: /\bASP\.NET\b/i, confidence: "high" },
      { source: "header:x-aspnet-version", pattern: /\d/i, confidence: "high" },
    ],
  },
  {
    name: "nginx",
    rules: [
      { source: "header:server", pattern: /\bnginx(?:\/|\s|$)/i, confidence: "high" },
    ],
  },
  {
    name: "Apache",
    rules: [
      { source: "header:server", pattern: /\bApache(?:\/|\s|$)/i, confidence: "high" },
    ],
  },
]);

const normalizeHeaderValue = (value) => {
  if (Array.isArray(value)) {
    return value.map(String).join(", ");
  }

  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }

  return "";
};

const getHeader = (headers, name) => {
  const entry = Object.entries(headers ?? {}).find(
    ([key]) => key.toLowerCase() === name.toLowerCase(),
  );

  return entry ? normalizeHeaderValue(entry[1]) : "";
};

const sanitizeHeaders = (headers) => {
  const safe = {};

  for (const [name, value] of Object.entries(headers ?? {})) {
    if (SENSITIVE_HEADERS.has(name.toLowerCase())) {
      continue;
    }

    const normalized = normalizeHeaderValue(value);

    if (normalized) {
      safe[name] = normalized.slice(0, 2048);
    }
  }

  return safe;
};

const extractAttributes = (tag) => {
  const attributes = {};
  const pattern =
    /([a-zA-Z_:][\w:.-]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/g;

  for (const match of tag.matchAll(pattern)) {
    const key = match[1].toLowerCase();

    if (!(key in attributes)) {
      attributes[key] =
        match[2] ?? match[3] ?? match[4] ?? "";
    }
  }

  return attributes;
};

const extractHtmlSignals = (html) => {
  const assets = [];
  const generators = [];

  const tags =
    html.match(/<(?:script|link|meta)\b[^>]*>/gi) ?? [];

  for (const tag of tags.slice(0, MAX_TAGS)) {
    const attributes = extractAttributes(tag);

    if (/^<meta\b/i.test(tag)) {
      if (attributes.name?.toLowerCase() === "generator") {
        generators.push((attributes.content ?? "").slice(0, 256));
      }
      continue;
    }

    const asset = attributes.src ?? attributes.href;

    if (asset && asset.length <= 2048) {
      assets.push(asset);
    }
  }

  return {
    assets,
    generators,
  };
};

const getConfidence = (matches) =>
  matches.some((match) => match.confidence === "high")
    ? "high"
    : "medium";

const detectTechnologies = (headers, body, contentType) => {
  const html =
    typeof body === "string" &&
    (
      contentType.toLowerCase().includes("html") ||
      /^\s*(?:<!doctype\s+html|<html\b)/i.test(body)
    )
      ? body.slice(0, MAX_HTML_LENGTH)
      : "";

  const { assets, generators } = extractHtmlSignals(html);

  const technologies = [];

  for (const technology of SIGNATURES) {
    const matches = [];

    for (const rule of technology.rules) {
      let matched = false;

      if (rule.source === "asset") {
        matched = assets.some((asset) =>
          rule.pattern.test(asset),
        );
      } else if (rule.source === "generator") {
        matched = generators.some((generator) =>
          rule.pattern.test(generator),
        );
      } else if (rule.source === "html") {
        matched = rule.pattern.test(html);
      } else if (rule.source.startsWith("header:")) {
        const headerName = rule.source.slice(7);
        matched = rule.pattern.test(
          getHeader(headers, headerName),
        );
      }

      if (matched) {
        matches.push({
          source: rule.source,
          confidence: rule.confidence,
        });
      }

      if (matches.length >= MAX_MATCHES_PER_TECHNOLOGY) {
        break;
      }
    }

    if (matches.length === 0) {
      continue;
    }

    technologies.push({
      name: technology.name,
      source: "http-response",
      confidence: getConfidence(matches),
      matches,
    });
  }

  return technologies;
};

const cancelledResult = () => ({
  data: {
    technologies: [],
  },
  evidence: [],
  fingerprints: [],
  verificationRecords: [],
  metadata: {
    cancelled: true,
    technologyCount: 0,
    signaturesChecked: SIGNATURES.length,
  },
});

const scanner = createReconScanner({
  id: "recon.technology",

  name: "Technology Detection",

  description:
    "Identifies web technologies through bounded passive analysis of HTTP headers and HTML signatures.",

  async run(context) {
    if (context?.signal?.aborted) {
      return cancelledResult();
    }

    const targetUrl = getTargetUrl(context);

    await assertSafeUrl(targetUrl);

    const requestHeaders =
      context?.session?.getHeaders?.() ?? {};

    const response = await get(targetUrl, {
      signal: context?.signal,
      scope: context?.scope,
      headers: requestHeaders,
      maxRedirects: 0,
    });

    if (context?.signal?.aborted) {
      return cancelledResult();
    }

    const headers = response?.headers ?? {};
    const contentType = getHeader(headers, "content-type");

    const body =
      typeof response?.data === "string"
        ? response.data
        : typeof response?.body === "string"
          ? response.body
          : "";

    const statusCode = Number(
      response?.status ?? response?.statusCode,
    );

    if (
      !Number.isInteger(statusCode) ||
      statusCode < 100 ||
      statusCode > 599
    ) {
      throw new Error(
        "Technology detection received an invalid HTTP status.",
      );
    }

    const technologies = detectTechnologies(
      headers,
      body,
      contentType,
    );

    const fingerprints = technologies.map((technology) =>
      createTechnologyFingerprint({
        name: technology.name,
        version: null,
        source: "http-response",
        confidence: technology.confidence,
        evidence: {
          url: targetUrl,
          statusCode,
          matches: technology.matches,
        },
      }),
    );

    const evidence = [
      createExchangeEvidence({
        request: {
          method: "GET",
          url: targetUrl,
          headers: sanitizeHeaders(requestHeaders),
        },
        response: {
          status: statusCode,
          statusText: response?.statusText ?? null,
          headers: sanitizeHeaders(headers),
          body: null,
          contentType: contentType || null,
        },
      }),
    ];

    return {
      data: {
        technologies,
      },

      evidence,
      fingerprints,
      verificationRecords: [],

      metadata: {
        technologyCount: technologies.length,
        signaturesChecked: SIGNATURES.length,
        detectionMethod: "passive-http-response-analysis",
        cancelled: false,
        note:
          "Technology signatures are observational indicators and do not independently verify installed software.",
      },
    };
  },
});

export default scanner;
