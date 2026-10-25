/* STATUS: UPDATED */

import { get } from "../../request/request.js";

import { createExchangeEvidence } from "../shared/evidence.js";
import { createServiceFingerprint } from "../shared/fingerprint.js";
import { createReconScanner, getTargetUrl } from "../shared/reconContract.js";
import { assertSafeUrl } from "../shared/resolver.js";

const MAX_HEADER_LENGTH = 2048;

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

const normalizeHeaderValue = (value) => {
  if (Array.isArray(value)) {
    return value.map(String).join(", ");
  }

  if (typeof value === "string" || typeof value === "number") {
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

  if (!entry) {
    return null;
  }

  const value = normalizeHeaderValue(entry[1]);

  return value ? value.trim().slice(0, MAX_HEADER_LENGTH) || null : null;
};

const sanitizeHeaders = (headers) => {
  const safe = {};

  for (const [name, value] of Object.entries(headers ?? {})) {
    if (SENSITIVE_HEADERS.has(name.toLowerCase())) {
      continue;
    }

    const normalized = normalizeHeaderValue(value);

    if (normalized !== null) {
      safe[name] = normalized.slice(0, MAX_HEADER_LENGTH);
    }
  }

  return safe;
};

const normalizeStatus = (response) => {
  const status = Number(response?.status ?? response?.statusCode);

  if (!Number.isInteger(status) || status < 100 || status > 599) {
    throw new Error("Web server detection received an invalid HTTP status.");
  }

  return status;
};

const cancelledResult = () => ({
  data: {
    server: null,
    poweredBy: null,
    protocol: null,
    status: null,
  },
  evidence: [],
  fingerprints: [],
  verificationRecords: [],
  metadata: {
    cancelled: true,
    serverDetected: false,
    poweredByDetected: false,
  },
});

const scanner = createReconScanner({
  id: "recon.web-server",

  name: "Web Server Detection",

  description:
    "Identifies web-server information publicly disclosed through HTTP response headers.",

  async run(context) {
    if (context?.signal?.aborted) {
      return cancelledResult();
    }

    const targetUrl = getTargetUrl(context);

    await assertSafeUrl(targetUrl);

    const parsedUrl = new URL(targetUrl);

    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      throw new Error(
        "Web server detection only supports HTTP and HTTPS targets.",
      );
    }

    const protocol = parsedUrl.protocol.slice(0, -1);

    const port = parsedUrl.port
      ? Number(parsedUrl.port)
      : protocol === "https"
        ? 443
        : 80;

    const requestHeaders = context?.session?.getHeaders?.() ?? {};

    let response;
    try {
      response = await get(targetUrl, {
        signal: context?.signal,
        scope: context?.scope,
        headers: requestHeaders,
        maxRedirects: 0,
      });
    } catch (error) {
      if (context?.signal?.aborted) {
        return cancelledResult();
      }

      return {
        data: {
          server: null,
          poweredBy: null,
          protocol,
          status: null,
          contentType: null,
        },
        evidence: [],
        fingerprints: [],
        verificationRecords: [],
        metadata: {
          serverDetected: false,
          poweredByDetected: false,
          port,
          detectionMethod: "http-response-headers",
          identityVerified: false,
          reachable: false,
          error: error?.message ?? "Request failed",
          cancelled: false,
        },
      };
    }

    if (context?.signal?.aborted) {
      return cancelledResult();
    }

    const responseHeaders = response?.headers ?? {};

    let status;
    try {
      status = normalizeStatus(response);
    } catch {
      status = null;
    }

    const server = getHeader(responseHeaders, "server");

    const poweredBy = getHeader(responseHeaders, "x-powered-by");

    const contentType = getHeader(responseHeaders, "content-type");

    const fingerprints = [];

    if (server) {
      fingerprints.push(
        createServiceFingerprint({
          service: server,
          port,
          protocol,
          version: null,
          confidence: "medium",
          source: "webServer",
          evidence: {
            header: "server",
            value: server,
            responseStatus: status,
          },
        }),
      );
    }

    if (poweredBy) {
      fingerprints.push(
        createServiceFingerprint({
          service: poweredBy,
          port,
          protocol,
          version: null,
          confidence: "low",
          source: "webServer",
          evidence: {
            header: "x-powered-by",
            value: poweredBy,
            responseStatus: status,
          },
        }),
      );
    }

    const evidence = createExchangeEvidence({
      request: {
        method: "GET",
        url: targetUrl,
        headers: sanitizeHeaders(requestHeaders),
      },

      response: {
        status,
        statusText: response?.statusText ?? null,
        headers: sanitizeHeaders(responseHeaders),
        contentType,
        body: null,
      },
    });

    return {
      data: {
        server,
        poweredBy,
        protocol,
        status,
        contentType,
      },

      evidence: [evidence],
      fingerprints,
      verificationRecords: [],

      metadata: {
        serverDetected: Boolean(server),
        poweredByDetected: Boolean(poweredBy),
        port,
        detectionMethod: "http-response-headers",
        identityVerified: false,
        cancelled: false,
        note: "Server headers are self-reported response values and may be absent, modified, or spoofed.",
      },
    };
  },
});

export default scanner;
