/* STATUS: UPDATED */

import tls from "node:tls";
import net from "node:net";

import { createFingerprint } from "../shared/fingerprint.js";
import { createReconScanner, getTargetUrl } from "../shared/reconContract.js";
import { assertSafeUrl } from "../shared/resolver.js";

const DEFAULT_TIMEOUT_MS = 5000;
const MIN_TIMEOUT_MS = 500;
const MAX_TIMEOUT_MS = 10000;

const createAbortError = () =>
  Object.assign(new Error("TLS inspection was cancelled."), {
    code: "ABORT_ERR",
  });

const createTimeoutError = () =>
  Object.assign(new Error("TLS connection timed out."), {
    code: "ETIMEDOUT",
  });

const getCertificate = (socket) => {
  const certificate = socket.getPeerCertificate();

  if (!certificate || Object.keys(certificate).length === 0) {
    return null;
  }

  return {
    subject: certificate.subject ?? null,
    issuer: certificate.issuer ?? null,
    subjectAlternativeName: certificate.subjectaltname ?? null,
    validFrom: certificate.valid_from ?? null,
    validTo: certificate.valid_to ?? null,
    serialNumber: certificate.serialNumber ?? null,
    fingerprint: certificate.fingerprint256 ?? certificate.fingerprint ?? null,
    raw: certificate.raw ?? null,
  };
};

const normalizeTimeout = (value) => {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return DEFAULT_TIMEOUT_MS;
  }

  return Math.min(Math.max(parsed, MIN_TIMEOUT_MS), MAX_TIMEOUT_MS);
};

const getCertificateStatus = (certificate, hostname) => {
  if (!certificate) {
    return {
      present: false,
      hostnameMatches: false,
      currentlyValid: false,
      expired: null,
      notYetValid: null,
      daysUntilExpiry: null,
      hostnameError: "Certificate unavailable.",
    };
  }

  const now = Date.now();
  const validFrom = Date.parse(certificate.validFrom ?? "");
  const validTo = Date.parse(certificate.validTo ?? "");

  const validDates =
    Number.isFinite(validFrom) &&
    Number.isFinite(validTo) &&
    validFrom <= validTo;

  const notYetValid = Number.isFinite(validFrom) && now < validFrom;

  const expired = Number.isFinite(validTo) && now > validTo;

  const hostnameError = tls.checkServerIdentity(hostname, {
    subject: certificate.subject,
    subjectaltname: certificate.subjectAlternativeName,
    raw: certificate.raw,
    issuerCertificate: undefined,
  });

  const hostnameMatches = !hostnameError;

  return {
    present: true,
    hostnameMatches,
    currentlyValid: validDates && !notYetValid && !expired && hostnameMatches,
    expired: Number.isFinite(validTo) ? expired : null,
    notYetValid: Number.isFinite(validFrom) ? notYetValid : null,
    daysUntilExpiry: Number.isFinite(validTo)
      ? Math.floor((validTo - now) / 86400000)
      : null,
    hostnameError: hostnameError?.code ?? null,
    validDates,
  };
};

const connectTls = ({ address, port, hostname, timeoutMs, signal }) =>
  new Promise((resolve, reject) => {
    let settled = false;

    const isIpAddress = net.isIP(hostname) !== 0;

    const socket = tls.connect({
      host: address,
      port,
      ...(isIpAddress ? {} : { servername: hostname }),
      rejectUnauthorized: false,
    });

    const cleanup = () => {
      socket.removeListener("secureConnect", onSecureConnect);
      socket.removeListener("error", onError);
      socket.removeListener("timeout", onTimeout);

      if (signal) {
        signal.removeEventListener("abort", onAbort);
      }
    };

    const finish = (callback, value) => {
      if (settled) {
        return;
      }

      settled = true;
      cleanup();
      socket.destroy();
      callback(value);
    };

    const onAbort = () => {
      finish(reject, createAbortError());
    };

    const onTimeout = () => {
      finish(reject, createTimeoutError());
    };

    const onError = (error) => {
      if (signal?.aborted) {
        finish(reject, createAbortError());
        return;
      }

      if (error?.code === "ETIMEDOUT") {
        finish(reject, createTimeoutError());
        return;
      }

      // Do not propagate raw TLS error messages that may expose
      // internal addresses or implementation details.
      finish(
        reject,
        Object.assign(new Error("TLS connection could not be established."), {
          code:
            typeof error?.code === "string"
              ? error.code
              : "TLS_CONNECTION_ERROR",
        }),
      );
    };

    const onSecureConnect = () => {
      const certificate = getCertificate(socket);

      finish(resolve, {
        protocol: socket.getProtocol() ?? null,
        cipher: socket.getCipher()?.name ?? null,
        authorized: socket.authorized,
        authorizationError: socket.authorizationError ?? null,
        certificate,
      });
    };

    socket.setTimeout(timeoutMs);

    socket.once("secureConnect", onSecureConnect);
    socket.once("error", onError);
    socket.once("timeout", onTimeout);

    if (signal) {
      if (signal.aborted) {
        onAbort();
        return;
      }

      signal.addEventListener("abort", onAbort, {
        once: true,
      });
    }
  });

const cancelledResult = () => ({
  data: {
    supported: true,
    cancelled: true,
  },
  evidence: [],
  fingerprints: [],
  verificationRecords: [],
  metadata: {
    cancelled: true,
  },
});

const scanner = createReconScanner({
  id: "recon.ssl",

  name: "SSL/TLS Reconnaissance",

  description:
    "Inspects TLS negotiation and certificate trust, hostname matching, and validity.",

  async run(context) {
    if (context?.signal?.aborted) {
      return cancelledResult();
    }

    const targetUrl = getTargetUrl(context);
    const parsedUrl = new URL(targetUrl);

    if (parsedUrl.protocol !== "https:") {
      return {
        data: {
          supported: false,
          reason: "Target URL is not HTTPS.",
        },
        evidence: [],
        fingerprints: [],
        verificationRecords: [],
        metadata: {
          supported: false,
          cancelled: false,
        },
      };
    }

    await assertSafeUrl(targetUrl);

    if (context?.signal?.aborted) {
      return cancelledResult();
    }

    const port = parsedUrl.port ? Number(parsedUrl.port) : 443;

    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      throw new Error("Invalid TLS target port.");
    }

    let resolution;
    try {
      resolution = await assertSafeUrl(targetUrl);
    } catch (error) {
      return {
        data: {
          supported: false,
          error: error?.message ?? "Target resolution failed.",
        },
        evidence: [],
        fingerprints: [],
        verificationRecords: [],
        metadata: {
          supported: false,
          error: error?.message,
          cancelled: false,
        },
      };
    }

    if (context?.signal?.aborted) {
      return cancelledResult();
    }

    const addresses = resolution?.addresses;

    if (!Array.isArray(addresses) || addresses.length === 0) {
      return {
        data: {
          supported: false,
          error: "No safe address was available for TLS inspection.",
        },
        evidence: [],
        fingerprints: [],
        verificationRecords: [],
        metadata: {
          supported: false,
          error: "No safe address available.",
          cancelled: false,
        },
      };
    }

    // Pin the connection to an address returned by the safe resolver.
    // Keep the original hostname for SNI and certificate identity checks.
    const address = addresses[0];

    const timeoutMs = normalizeTimeout(context?.options?.tlsTimeoutMs);

    let tlsResult;
    try {
      tlsResult = await connectTls({
        address,
        port,
        hostname: parsedUrl.hostname,
        timeoutMs,
        signal: context?.signal,
      });
    } catch (error) {
      if (context?.signal?.aborted) {
        return cancelledResult();
      }

      return {
        data: {
          supported: false,
          error: error?.message ?? "TLS handshake failed",
          code: error?.code,
        },
        evidence: [],
        fingerprints: [],
        verificationRecords: [],
        metadata: {
          supported: false,
          error: error?.message ?? "TLS connection failed",
          errorCode: error?.code,
          cancelled: false,
        },
      };
    }

    if (context?.signal?.aborted) {
      return cancelledResult();
    }

    const certificate = tlsResult.certificate;

    const certificateStatus = getCertificateStatus(
      certificate,
      parsedUrl.hostname,
    );

    const evidence = [
      {
        type: "certificate",
        hostname: parsedUrl.hostname,
        url: targetUrl,
        protocol: tlsResult.protocol,
        cipher: tlsResult.cipher,
        authorized: tlsResult.authorized,
        authorizationError: tlsResult.authorizationError,
        certificate: certificate
          ? {
              subject: certificate.subject,
              issuer: certificate.issuer,
              subjectAlternativeName: certificate.subjectAlternativeName,
              validFrom: certificate.validFrom,
              validTo: certificate.validTo,
              serialNumber: certificate.serialNumber,
              fingerprint: certificate.fingerprint,
            }
          : null,
        certificateStatus,
      },
    ];

    const fingerprints = [];

    if (certificate) {
      fingerprints.push(
        createFingerprint({
          type: "certificate",
          name: parsedUrl.hostname,
          version: tlsResult.protocol,
          confidence: "high",
          source: "ssl",
          evidence: {
            issuer: certificate.issuer,
            subject: certificate.subject,
            serialNumber: certificate.serialNumber,
            fingerprint: certificate.fingerprint,
            validFrom: certificate.validFrom,
            validTo: certificate.validTo,
            hostnameMatches: certificateStatus.hostnameMatches,
            currentlyValid: certificateStatus.currentlyValid,
          },
        }),
      );
    }

    return {
      data: {
        supported: true,
        hostname: parsedUrl.hostname,
        port,
        protocol: tlsResult.protocol,
        cipher: tlsResult.cipher,
        authorized: tlsResult.authorized,
        authorizationError: tlsResult.authorizationError,
        certificate: certificate
          ? {
              subject: certificate.subject,
              issuer: certificate.issuer,
              subjectAlternativeName: certificate.subjectAlternativeName,
              validFrom: certificate.validFrom,
              validTo: certificate.validTo,
              serialNumber: certificate.serialNumber,
              fingerprint: certificate.fingerprint,
            }
          : null,
        certificateStatus,
      },

      evidence,
      fingerprints,
      verificationRecords: [],

      metadata: {
        timeoutMs,
        certificatePresent: Boolean(certificate),
        hostnameMatches: certificateStatus.hostnameMatches,
        certificateCurrentlyValid: certificateStatus.currentlyValid,
        cancelled: false,
      },
    };
  },
});

export default scanner;
