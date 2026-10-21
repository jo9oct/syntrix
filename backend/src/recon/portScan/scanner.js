
/* STATUS: UPDATED */

import { executeRequest } from "../../core/httpClient.js";
import { createServiceFingerprint } from "../shared/fingerprint.js";

const DEFAULT_PORTS = Object.freeze([
  21, 22, 23, 25, 53, 80, 110, 143, 443, 445, 587, 993, 995,
  1433, 1521, 3306, 3389, 5432, 5900, 6379, 8080, 8443,
]);

const DEFAULT_TIMEOUT_MS = 3000;
const MIN_TIMEOUT_MS = 100;
const MAX_TIMEOUT_MS = 30000;
const MAX_PORTS = 1024;

const HTTPS_FIRST_PORTS = new Set([443, 8443]);

const HTTP_FIRST_PORTS = new Set([80, 8080, 8000, 8008, 8888]);

const normalizePorts = (ports) => {
  const source =
    Array.isArray(ports) && ports.length > 0
      ? ports
      : DEFAULT_PORTS;

  const normalized = [
    ...new Set(
      source
        .map((port) => {
          if (
            typeof port !== "number" &&
            typeof port !== "string"
          ) {
            return NaN;
          }

          if (
            typeof port === "string" &&
            !/^\d+$/.test(port.trim())
          ) {
            return NaN;
          }

          return Number(port);
        })
        .filter(
          (port) =>
            Number.isInteger(port) &&
            port >= 1 &&
            port <= 65535,
        ),
    ),
  ];

  return normalized.slice(0, MAX_PORTS);
};

const normalizeTimeout = (value) => {
  if (value === undefined || value === null || value === "") {
    return DEFAULT_TIMEOUT_MS;
  }

  const timeout = Number(value);

  if (
    !Number.isInteger(timeout) ||
    timeout < MIN_TIMEOUT_MS ||
    timeout > MAX_TIMEOUT_MS
  ) {
    throw new Error(
      `Port scan timeout must be an integer between ${MIN_TIMEOUT_MS} and ${MAX_TIMEOUT_MS} milliseconds.`,
    );
  }

  return timeout;
};

const validateTargetUrl = (value) => {
  let targetUrl;

  try {
    targetUrl = new URL(value);
  } catch {
    throw new Error("Port scan requires a valid target URL.");
  }

  if (!["http:", "https:"].includes(targetUrl.protocol)) {
    throw new Error(
      "Port scan target must use HTTP or HTTPS.",
    );
  }

  if (targetUrl.username || targetUrl.password) {
    throw new Error(
      "Target URLs must not contain embedded credentials.",
    );
  }

  if (!targetUrl.hostname) {
    throw new Error("Port scan target requires a hostname.");
  }

  return targetUrl;
};

const getProtocolsForPort = (port) => {
  if (HTTPS_FIRST_PORTS.has(port)) {
    return ["https", "http"];
  }

  if (HTTP_FIRST_PORTS.has(port)) {
    return ["http", "https"];
  }

  return ["http", "https"];
};

const getPortUrl = (protocol, hostname, port) => {
  const url = new URL(`${protocol}://${hostname}/`);

  const defaultPort = protocol === "https" ? 443 : 80;

  if (port !== defaultPort) {
    url.port = String(port);
  }

  return url.toString();
};

const classifyProbeError = (error) => {
  const code = String(error?.code ?? "").toUpperCase();
  const name = String(error?.name ?? "");

  if (
    code === "ECONNREFUSED" ||
    code === "ERR_CONNECTION_REFUSED"
  ) {
    return "connection_refused";
  }

  if (
    code.includes("TIMEOUT") ||
    code === "ETIMEDOUT" ||
    name === "TimeoutError"
  ) {
    return "timeout";
  }

  if (
    code === "ENOTFOUND" ||
    code === "EAI_AGAIN"
  ) {
    return "dns_error";
  }

  if (
    code.includes("CERT") ||
    code.includes("TLS") ||
    code.includes("SSL")
  ) {
    return "tls_error";
  }

  if (
    name === "AbortError" ||
    code === "ABORT_ERR"
  ) {
    return "aborted";
  }

  return "request_error";
};

const isAbortError = (error, signal) =>
  signal?.aborted === true ||
  error?.name === "AbortError" ||
  error?.code === "ABORT_ERR";

const probePort = async ({
  hostname,
  port,
  timeout,
  scope,
  signal,
}) => {
  const attempts = [];

  for (const protocol of getProtocolsForPort(port)) {
    if (signal?.aborted) {
      return {
        port,
        state: "cancelled",
        attempts,
      };
    }

    const url = getPortUrl(protocol, hostname, port);

    try {
      const response = await executeRequest({
        url,
        method: "HEAD",
        timeout,
        scope,
        signal,
        maxRedirects: 0,
        responseType: "text",
      });

      const statusCode = Number(response?.statusCode);

      if (
        !Number.isInteger(statusCode) ||
        statusCode < 100 ||
        statusCode > 599
      ) {
        attempts.push({
          protocol,
          outcome: "invalid_response",
        });

        continue;
      }

      const result = {
        port,
        state: "open",
        detectionMethod: "http_response",
        protocol,
        statusCode,
        url,
      };

      attempts.push({
        protocol,
        outcome: "http_response",
        statusCode,
      });

      return {
        ...result,
        attempts,
      };
    } catch (error) {
      if (isAbortError(error, signal)) {
        return {
          port,
          state: "cancelled",
          attempts,
        };
      }

      const reason = classifyProbeError(error);

      attempts.push({
        protocol,
        outcome: reason,
      });

      // Scope and authorization errors must not be disguised
      // as ordinary connection failures.
      if (
        reason === "request_error" &&
        /scope|out.of.scope|not authorized|not authorised/i.test(
          String(error?.message ?? ""),
        )
      ) {
        throw error;
      }
    }
  }

  const outcomes = attempts.map((attempt) => attempt.outcome);

  const state = outcomes.includes("timeout")
    ? "unresponsive_or_filtered"
    : outcomes.length > 0 &&
        outcomes.every(
          (outcome) =>
            outcome === "connection_refused",
        )
      ? "connection_refused"
      : "unresponsive_or_not_http";

  return {
    port,
    state,
    detectionMethod: "http_probe",
    attempts,
  };
};

const scan = async (context) => {
  if (!context?.target?.url) {
    throw new Error("Port scan requires a target URL.");
  }

  const targetUrl = validateTargetUrl(context.target.url);
  const hostname = targetUrl.hostname;

  const configuredPorts =
    context.options?.portScan?.ports ??
    context.options?.ports;

  const ports = normalizePorts(configuredPorts);

  const timeout = normalizeTimeout(
    context.options?.portScan?.timeoutMs,
  );

  const results = [];

  for (const port of ports) {
    if (context.signal?.aborted) {
      break;
    }

    const result = await probePort({
      hostname,
      port,
      timeout,
      scope: context.scope,
      signal: context.signal,
    });

    results.push(result);

    if (result.state === "cancelled") {
      break;
    }
  }

  const openPorts = results.filter(
    (result) => result.state === "open",
  );

  const fingerprints = openPorts.map((result) =>
    createServiceFingerprint({
      service: result.protocol,
      port: result.port,
      protocol: result.protocol,
      version: null,
      confidence: "medium",
      source: "portScan",
      evidence: {
        url: result.url,
        statusCode: result.statusCode,
        detectionMethod: result.detectionMethod,
      },
    }),
  );

  const findings = openPorts.map((result) => ({
    title: `HTTP service detected on port ${result.port}`,
    severity: "info",
    confidence: "medium",
    status: "detected",
    description:
      `The target returned an HTTP response on port ${result.port} using ${result.protocol}. This confirms an HTTP-responsive service, not necessarily the underlying service identity.`,
    evidence: {
      port: result.port,
      protocol: result.protocol,
      statusCode: result.statusCode,
      url: result.url,
      detectionMethod: result.detectionMethod,
    },
  }));

  const cancelled =
    context.signal?.aborted === true ||
    results.some((result) => result.state === "cancelled");

  const attemptedPorts = results.filter(
    (result) => result.state !== "cancelled",
  ).length;

  return {
    scannerId: "portScan",

    status: cancelled ? "cancelled" : "completed",

    data: {
      hostname,
      portsScanned: attemptedPorts,

      openPorts: openPorts.map((result) => ({
        port: result.port,
        protocol: result.protocol,
        statusCode: result.statusCode,
      })),

      results,
    },

    findings,

    evidence: openPorts.map((result) => ({
      type: "port-scan",
      port: result.port,
      protocol: result.protocol,
      url: result.url,
      statusCode: result.statusCode,
      detectionMethod: result.detectionMethod,
    })),

    fingerprints,

    verificationRecords: [],

    metadata: {
      hostname,
      ports,
      timeout,
      attemptedPorts,
      cancelled,
      detectionMode: "http_probe",
      limitation:
        "This scanner identifies HTTP-responsive ports. It does not perform a raw TCP connect scan and cannot reliably classify non-HTTP ports as open or closed.",
    },
  };
};

const run = scan;

const scanner = {
  id: "portScan",
  name: "Port Scan",
  description:
    "Identifies HTTP-responsive ports on an authorized target host.",
  run,
};

export {
  scan,
  run,
  scanner,
  createServiceFingerprint,
  DEFAULT_PORTS,
  normalizePorts,
};
