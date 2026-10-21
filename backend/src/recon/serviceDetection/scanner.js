
/* STATUS: UPDATED */

import { get } from "../../request/request.js";

import { createExchangeEvidence } from "../shared/evidence.js";
import { createServiceFingerprint } from "../shared/fingerprint.js";
import {
  createReconScanner,
  getTargetUrl,
} from "../shared/reconContract.js";
import { assertSafeUrl } from "../shared/resolver.js";

const MAX_TITLE_LENGTH = 500;

const SENSITIVE_HEADERS = new Set([
  "authorization",
  "proxy-authorization",
  "cookie",
  "set-cookie",
  "x-api-key",
  "x-auth-token",
  "x-csrf-token",
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
    (candidate) =>
      candidate.toLowerCase() === name.toLowerCase(),
  );

  return key
    ? normalizeHeaderValue(headers[key])
    : null;
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
      safe[key] = normalized;
    }
  }

  return safe;
};

const extractTitle = (body) => {
  if (typeof body !== "string") {
    return null;
  }

  const match = body.match(
    /<title\b[^>]*>([\s\S]*?)<\/title\s*>/i,
  );

  if (!match) {
    return null;
  }

  const title = match[1]
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return title
    ? title.slice(0, MAX_TITLE_LENGTH)
    : null;
};

const normalizeStatus = (response) => {
  const value = Number(
    response?.status ?? response?.statusCode,
  );

  return Number.isInteger(value) &&
    value >= 100 &&
    value <= 599
    ? value
    : null;
};

const normalizeBody = (response) => {
  const body = response?.data ?? response?.body;

  return typeof body === "string" ? body : null;
};

const getServiceDetails = (url) => {
  const parsed = new URL(url);

  const protocol = parsed.protocol.slice(0, -1);

  if (protocol !== "http" && protocol !== "https") {
    throw new Error(
      "Service detection supports HTTP and HTTPS targets only.",
    );
  }

  return {
    protocol,
    service: protocol,
    hostname: parsed.hostname,
    port: Number(
      parsed.port || (protocol === "https" ? 443 : 80),
    ),
  };
};

const scanner = createReconScanner({
  id: "recon.service-detection",

  name: "Service Detection",

  description:
    "Identifies HTTP and HTTPS services and observable server characteristics on the authorized target.",

  async run(context) {
    if (context?.signal?.aborted) {
      return {
        data: {
          cancelled: true,
        },
        evidence: [],
        fingerprints: [],
      };
    }

    const targetUrl = getTargetUrl(context);

    const serviceDetails = getServiceDetails(targetUrl);

    await assertSafeUrl(targetUrl);

    const sessionHeaders =
      context?.session?.getHeaders?.() ?? {};

    const response = await get(targetUrl, {
      signal: context?.signal,
      scope: context?.scope,
      headers: sessionHeaders,
      maxRedirects: 0,
    });

    if (context?.signal?.aborted) {
      return {
        data: {
          cancelled: true,
        },
        evidence: [],
        fingerprints: [],
      };
    }

    const status = normalizeStatus(response);

    if (status === null) {
      throw new Error(
        "Service detection received an invalid HTTP response status.",
      );
    }

    const responseHeaders = response?.headers ?? {};

    const server = getHeader(
      responseHeaders,
      "server",
    );

    const poweredBy = getHeader(
      responseHeaders,
      "x-powered-by",
    );

    const contentType = getHeader(
      responseHeaders,
      "content-type",
    );

    const body = normalizeBody(response);

    const title =
      contentType?.toLowerCase().includes("html") ||
      /^\s*(?:<!doctype\s+html|<html\b)/i.test(
        body ?? "",
      )
        ? extractTitle(body)
        : null;

    const safeResponseHeaders = sanitizeHeaders(
      responseHeaders,
    );

    const evidence = [
      createExchangeEvidence({
        request: {
          method: "GET",
          url: targetUrl,
          headers: sanitizeHeaders(sessionHeaders),
        },

        response: {
          status,
          statusText: response?.statusText ?? null,
          headers: safeResponseHeaders,
          body: null,
          contentType,
        },
      }),
    ];

    const fingerprint = createServiceFingerprint({
      service: serviceDetails.service,
      port: serviceDetails.port,
      protocol: serviceDetails.protocol,
      version: null,
      confidence: "high",
      source: "serviceDetection",
      evidence: {
        url: targetUrl,
        statusCode: status,
        server,
        poweredBy,
        contentType,
      },
    });

    return {
      data: {
        hostname: serviceDetails.hostname,
        port: serviceDetails.port,
        protocol: serviceDetails.protocol,
        service: serviceDetails.service,
        status,
        statusText: response?.statusText ?? null,
        server,
        poweredBy,
        version: null,
        contentType,
        title,
      },

      evidence,

      fingerprints: [fingerprint],
    };
  },
});

export default scanner;
