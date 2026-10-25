/* STATUS: UPDATED */

import { get } from "../../request/request.js";

import { detectCveCandidates } from "./cveDetection.js";

import { createExchangeEvidence } from "../shared/evidence.js";
import { createTechnologyFingerprint } from "../shared/fingerprint.js";
import { createReconScanner, getTargetUrl } from "../shared/reconContract.js";
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
    pattern:
      /\b(?:LiteSpeed|OpenLiteSpeed)\/(v?\d+(?:\.\d+){0,5}(?:[-+._][a-z0-9]+)*)/i,
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
    pattern:
      /(?:^|\/)jquery(?:[.-]min)?[.-](\d+(?:\.\d+){1,3})(?:[.-]min)?\.js(?:$|[?#])/i,
  },
  {
    name: "Bootstrap",
    pattern:
      /(?:^|\/)bootstrap(?:[.-]bundle)?(?:[.-]min)?[.-](\d+(?:\.\d+){1,3})(?:[.-]min)?\.(?:js|css)(?:$|[?#])/i,
  },
  {
    name: "Vue",
    pattern:
      /(?:^|\/)vue(?:[.-]runtime)?(?:[.-]global)?(?:[.-]prod)?[.-](\d+(?:\.\d+){1,3})\.js(?:$|[?#])/i,
  },
  {
    name: "React",
    pattern:
      /(?:^|\/)react(?:[.-]dom)?(?:[.-]production)?[.-](\d+(?:\.\d+){1,3})\.js(?:$|[?#])/i,
  },
  {
    name: "Angular",
    pattern:
      /(?:^|\/)angular(?:[.-]core)?[.-](\d+(?:\.\d+){1,3})\.js(?:$|[?#])/i,
  },
]);

const normalizeHeaderValue = (value) => {
  if (Array.isArray(value)) {
    return value.map(String).join(", ");
  }

  if (typeof value === "string") {
    return value;
  }

  return null;
};

const getHeader = (headers, name) => {
  if (!headers || typeof headers !== "object") {
    return null;
  }

  const key = Object.keys(headers).find(
    (candidate) => candidate.toLowerCase() === name.toLowerCase(),
  );

  return key ? normalizeHeaderValue(headers[key]) : null;
};

const sanitizeHeaders = (headers) => {
  if (!headers || typeof headers !== "object") {
    return {};
  }

  const safe = {};

  for (const [key, value] of Object.entries(headers)) {
    if (SENSITIVE_HEADERS.has(key.toLowerCase())) {
      continue;
    }

    const normalized = normalizeHeaderValue(value);

    if (normalized !== null) {
      safe[key] = normalized.slice(0, MAX_HEADER_VALUE_LENGTH);
    }
  }

  return safe;
};

const cleanVersion = (raw) => {
  if (!raw) return null;
  return raw.replace(/^v/i, "").trim().slice(0, 50);
};

const detectVersions = (headers = {}, body = "", contentType = "") => {
  const detected = [];
  const seen = new Set();

  const add = (name, version, source, confidence) => {
    if (!name || !version || detected.length >= MAX_DETECTIONS) return;
    const key = `${name.toLowerCase()}:${version}`;
    if (seen.has(key)) return;
    seen.add(key);

    detected.push({
      name,
      version: cleanVersion(version),
      source,
      confidence,
    });
  };

  // 1. HTTP Headers
  for (const sig of HEADER_SIGNATURES) {
    const serverHeader = getHeader(headers, "server") ?? "";
    const poweredBy = getHeader(headers, "x-powered-by") ?? "";
    const combined = `${serverHeader} ${poweredBy}`;

    const match = combined.match(sig.pattern);
    if (match?.[1]) {
      add(sig.name, match[1], "http-header", "high");
    }
  }

  // 2. HTML Meta generator & asset scripts
  if (typeof body === "string" && body.length > 0) {
    const inspectedBody = body.slice(0, MAX_HTML_INSPECTION_LENGTH);

    // Meta generator
    for (const sig of GENERATOR_SIGNATURES) {
      const match = inspectedBody.match(sig.pattern);
      if (match?.[1]) {
        add(sig.name, match[1], "meta-generator", "high");
      }
    }

    // Scripts and CSS paths
    for (const sig of ASSET_SIGNATURES) {
      const match = inspectedBody.match(sig.pattern);
      if (match?.[1]) {
        add(sig.name, match[1], "script-asset", "medium");
      }
    }
  }

  return detected;
};

const emptyResult = (cancelled = false, error = null) => ({
  data: {
    versions: [],
    totalDetected: 0,
    cveDetection: {
      candidates: [],
      queriedProducts: 0,
    },
    ...(error ? { error } : {}),
  },
  evidence: [],
  fingerprints: [],
  metadata: {
    cancelled,
    reachable: !error,
    ...(error ? { error } : {}),
  },
});

const scanner = createReconScanner({
  id: "recon.version-detection",

  name: "Version & CVE Detection",

  description:
    "Detects software versions from HTTP responses and correlates them with known public CVE disclosures.",

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

    let response;
    try {
      response = await get(targetUrl, {
        signal: context?.signal,
        scope: context?.scope,
        headers: sessionHeaders,
        maxRedirects: 0,
      });
    } catch (error) {
      if (context?.signal?.aborted) {
        return emptyResult(true);
      }

      return emptyResult(false, error?.message ?? "Connection failed");
    }

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

    let cveCandidates = [];
    try {
      if (!context?.signal?.aborted && versions.length > 0) {
        cveCandidates = await detectCveCandidates(versions, context?.signal);
      }
    } catch {
      // CVE lookup failure must never crash the version scanner
      cveCandidates = [];
    }

    return {
      data: {
        versions,
        totalDetected: versions.length,
        cveDetection: {
          candidates: cveCandidates,
          queriedProducts: versions.length,
        },
      },

      evidence,

      fingerprints,

      metadata: {
        versionCount: versions.length,
        cveCount: cveCandidates.length,
        reachable: true,
        cancelled: false,
      },
    };
  },
});

export default scanner;
export { scanner, detectVersions };
