
/* STATUS: UPDATED */

import { get } from "../../request/request.js";

import { detectCveCandidates } from "./cveDetection.js";

import { createExchangeEvidence } from "../shared/evidence.js";
import { createTechnologyFingerprint } from "../shared/fingerprint.js";
import {
  createReconScanner,
  getTargetUrl,
} from "../shared/reconContract.js";
import { assertSafeUrl } from "../shared/resolver.js";

const MAX_HTML_INSPECTION_LENGTH = 512 * 1024;
const MAX_HEADER_VALUE_LENGTH = 2048;
const MAX_DETECTIONS = 50;

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

const HEADER_SIGNATURES = Object.freeze([
  {
    name: "nginx",
    pattern: /\bnginx\/(v?\d+(?:\.\d+){0,5}(?:[-+._][a-z0-9]+)*)/i,
  },
  {
    name: "Apache",
    pattern: /\bApache\/(v?\d+(?:\.\d+){0,5}(?:[-+._][a-z0-9]+)*)/i,
  },
  {
    name: "PHP",
    pattern: /\bPHP\/(v?\d+(?:\.\d+){0,5}(?:[-+._][a-z0-9]+)*)/i,
  },
  {
    name: "Express",
    pattern: /\bExpress(?:\/|\s+)(v?\d+(?:\.\d+){0,5}(?:[-+._][a-z0-9]+)*)/i,
  },
  {
    name: "IIS",
    pattern: /\b(?:Microsoft-)?IIS\/(v?\d+(?:\.\d+){0,5}(?:[-+._][a-z0-9]+)*)/i,
  },
  {
    name: "OpenResty",
    pattern: /\bopenresty\/(v?\d+(?:\.\d+){0,5}(?:[-+._][a-z0-9]+)*)/i,
  },
  {
    name: "LiteSpeed",
    pattern: /\b(?:LiteSpeed|OpenLiteSpeed)\/(v?\d+(?:\.\d+){0,5}(?:[-+._][a-z0-9]+)*)/i,
  },
  {
    name: "Caddy",
    pattern: /\bCaddy(?:\/|\s+)(v?\d+(?:\.\d+){0,5}(?:[-+._][a-z0-9]+)*)/i,
  },
  {
    name: "ASP.NET",
    pattern: /\bASP\.NET(?:\/|\s+)(v?\d+(?:\.\d+){0,5}(?:[-+._][a-z0-9]+)*)/i,
  },
]);

const GENERATOR_SIGNATURES = Object.freeze([
  {
    name: "WordPress",
    pattern: /\bWordPress\s+(v?\d+(?:\.\d+){0,5}(?:[-+._][a-z0-9]+)*)/i,
  },
  {
    name: "Drupal",
    pattern: /\bDrupal\s+(v?\d+(?:\.\d+){0,5}(?:[-+._][a-z0-9]+)*)/i,
  },
  {
    name: "Joomla",
    pattern: /\bJoomla!?\s+(v?\d+(?:\.\d+){0,5}(?:[-+._][a-z0-9]+)*)/i,
  },
  {
    name: "Ghost",
    pattern: /\bGhost\s+(v?\d+(?:\.\d+){0,5}(?:[-+._][a-z0-9]+)*)/i,
  },
]);

const ASSET_SIGNATURES = Object.freeze([
  {
    name: "jQuery",
    pattern: /(?:^|\/)jquery(?:[.-]min)?[.-](\d+(?:\.\d+){1,3})(?:[.-]min)?\.js(?:$|[?#])/i,
  },
  {
    name: "Bootstrap",
    pattern: /(?:^|\/)bootstrap(?:[.-]bundle)?(?:[.-]min)?[.-](\d+(?:\.\d+){1,3})(?:[.-]min)?\.(?:js|css)(?:$|[?#])/i,
  },
  {
    name: "Vue",
    pattern: /(?:^|\/)vue(?:[.-]runtime)?(?:[.-]global)?(?:[.-]prod)?[.-](\d+(?:\.\d+){1,3})\.js(?:$|[?#])/i,
  },
]);

const normalizeHeaderValue = (value) => {
  if (Array.isArray(value)) {
    return value.map(String).join(", ");
  }

  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number") {
    return String(value);
  }

  return null;
};

const getHeader = (headers, name) => {
  if (!headers || typeof headers !== "object") {
    return null;
  }

  const entry = Object.entries(headers).find(
    ([key]) => key.toLowerCase() === name.toLowerCase(),
  );

  return entry ? normalizeHeaderValue(entry[1]) : null;
};

const sanitizeHeaders = (headers) => {
  if (!headers || typeof headers !== "object") {
    return {};
  }

  const safe = {};

  for (const [name, value] of Object.entries(headers)) {
    if (SENSITIVE_HEADERS.has(name.toLowerCase())) {
      continue;
    }

    const normalized = normalizeHeaderValue(value);

    if (normalized !== null) {
      safe[name] = normalized.slice(0, MAX_HEADER_VALUE_LENGTH);
    }
  }

  return safe;
};

const normalizeVersion = (value) => {
  if (typeof value !== "string") {
    return null;
  }

  const version = value.trim().replace(/^v/i, "");

  if (
    !version ||
    version.length > 64 ||
    !/^\d+(?:\.\d+){0,5}(?:[-+._][a-z0-9]+)*$/i.test(version)
  ) {
    return null;
  }

  return version;
};

const addDetection = (detections, candidate) => {
  if (detections.length >= MAX_DETECTIONS) {
    return;
  }

  const version = normalizeVersion(candidate.version);

  if (!version || !candidate.name) {
    return;
  }

  const duplicate = detections.some(
    (item) =>
      item.name.toLowerCase() === candidate.name.toLowerCase() &&
      item.version === version,
  );

  if (duplicate) {
    return;
  }

  detections.push({
    name: candidate.name,
    version,
    source: candidate.source,
    confidence: candidate.confidence,
  });
};

const detectHeaderVersions = (headers, detections) => {
  const relevantHeaders = [
    "server",
    "x-powered-by",
    "x-aspnet-version",
    "x-aspnetmvc-version",
  ];

  for (const headerName of relevantHeaders) {
    const value = getHeader(headers, headerName);

    if (!value) {
      continue;
    }

    const boundedValue = value.slice(0, MAX_HEADER_VALUE_LENGTH);

    if (
      headerName === "x-aspnet-version" ||
      headerName === "x-aspnetmvc-version"
    ) {
      addDetection(detections, {
        name:
          headerName === "x-aspnet-version" ? "ASP.NET" : "ASP.NET MVC",
        version: boundedValue,
        source: `header:${headerName}`,
        confidence: "medium",
      });

      continue;
    }

    for (const signature of HEADER_SIGNATURES) {
      const match = boundedValue.match(signature.pattern);

      if (!match?.[1]) {
        continue;
      }

      addDetection(detections, {
        name: signature.name,
        version: match[1],
        source: `header:${headerName}`,
        confidence: "medium",
      });
    }
  }
};

const extractHtmlAttributes = (tag) => {
  const attributes = {};
  const pattern =
    /([a-zA-Z_:][\w:.-]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>\x60]+))/g;

  for (const match of tag.matchAll(pattern)) {
    const name = match[1].toLowerCase();

    if (!(name in attributes)) {
      attributes[name] = match[2] ?? match[3] ?? match[4] ?? "";
    }
  }

  return attributes;
};

const detectGeneratorVersions = (html, detections) => {
  const metaTags = html.match(/<meta\b[^>]*>/gi) ?? [];

  for (const tag of metaTags.slice(0, 500)) {
    const attributes = extractHtmlAttributes(tag);

    if (attributes.name?.toLowerCase() !== "generator") {
      continue;
    }

    const content = attributes.content ?? "";

    for (const signature of GENERATOR_SIGNATURES) {
      const match = content.match(signature.pattern);

      if (!match?.[1]) {
        continue;
      }

      addDetection(detections, {
        name: signature.name,
        version: match[1],
        source: "html:meta-generator",
        confidence: "medium",
      });
    }
  }
};

const detectAssetVersions = (html, detections) => {
  const assetTags = html.match(/<(?:script|link)\b[^>]*>/gi) ?? [];

  for (const tag of assetTags.slice(0, 1000)) {
    const attributes = extractHtmlAttributes(tag);
    const assetUrl = attributes.src ?? attributes.href;

    if (!assetUrl || assetUrl.length > 2048) {
      continue;
    }

    for (const signature of ASSET_SIGNATURES) {
      const match = assetUrl.match(signature.pattern);

      if (!match?.[1]) {
        continue;
      }

      addDetection(detections, {
        name: signature.name,
        version: match[1],
        source: "html:asset-reference",
        confidence: "low",
      });
    }
  }
};

const detectVersions = (headers, body, contentType) => {
  const detections = [];

  detectHeaderVersions(headers, detections);

  if (typeof body !== "string") {
    return detections;
  }

  const html = body.slice(0, MAX_HTML_INSPECTION_LENGTH);

  const isHtml =
    contentType?.toLowerCase().includes("text/html") ||
    /^\s*(?:<!doctype\s+html|<html\b)/i.test(html);

  if (!isHtml) {
    return detections;
  }

  detectGeneratorVersions(html, detections);
  detectAssetVersions(html, detections);

  return detections;
};

const emptyResult = (cancelled = false) => ({
  data: {
    versions: [],
    totalDetected: 0,
    cveDetection: {
      candidates: [],
      queriedProducts: 0,
      errors: [],
      status: cancelled ? "cancelled" : "no-products",
    },
    cancelled,
  },
  evidence: [],
  fingerprints: [],
});

const scanner = createReconScanner({
  id: "recon.version-detection",

  name: "Version Detection",

  description:
    "Identifies software versions from HTTP headers, HTML generator metadata, and static asset references, then looks up potential CVE candidates.",

  async run(context) {
    if (context?.signal?.aborted) {
      return emptyResult(true);
    }

    const targetUrl = getTargetUrl(context);

    await assertSafeUrl(targetUrl);

    if (context?.signal?.aborted) {
      return emptyResult(true);
    }

    const sessionHeaders = context?.session?.getHeaders?.() ?? {};

    const response = await get(targetUrl, {
      signal: context?.signal,
      scope: context?.scope,
      headers: sessionHeaders,
      maxRedirects: 0,
    });

    if (context?.signal?.aborted) {
      return emptyResult(true);
    }

    const responseHeaders = response?.headers ?? {};

    const contentType = getHeader(responseHeaders, "content-type");

    const body =
      typeof response?.data === "string"
        ? response.data
        : typeof response?.body === "string"
          ? response.body
          : null;

    const versions = detectVersions(responseHeaders, body, contentType);

    const fingerprints = versions.map((item) =>
      createTechnologyFingerprint({
        name: item.name,
        version: item.version,
        source: item.source,
        confidence: item.confidence,
      }),
    );

    const status = Number(response?.status ?? response?.statusCode);

    const evidence = [
      createExchangeEvidence({
        request: {
          method: "GET",
          url: targetUrl,
          headers: sanitizeHeaders(sessionHeaders),
        },

        response: {
          status:
            Number.isInteger(status) && status >= 100 && status <= 599
              ? status
              : null,
          statusText: response?.statusText ?? null,
          headers: sanitizeHeaders(responseHeaders),
          body: null,
          contentType,
        },
      }),
    ];

    if (context?.signal?.aborted) {
      return {
        data: {
          versions,
          totalDetected: versions.length,
          cveDetection: {
            candidates: [],
            queriedProducts: 0,
            errors: [],
            status: "cancelled",
          },
          cancelled: true,
        },
        evidence,
        fingerprints,
      };
    }

    let cveDetection = {
      candidates: [],
      queriedProducts: 0,
      errors: [],
      status: "no-products",
    };

    if (versions.length > 0) {
      try {
        cveDetection = await detectCveCandidates(versions, {
          signal: context?.signal,
        });
      } catch {
        cveDetection = {
          candidates: [],
          queriedProducts: 0,
          errors: [
            {
              message: "CVE candidate lookup failed.",
            },
          ],
          status: "failed",
        };
      }
    }

    return {
      data: {
        versions,
        totalDetected: versions.length,
        detectionMethod: "passive-http-response-analysis",
        cveDetection,
        note:
          "Detected versions are inferred from server-reported headers or HTML references. CVE results are keyword-based candidates and do not confirm that the detected software is affected.",
      },

      evidence,
      fingerprints,
    };
  },
});

export default scanner;
