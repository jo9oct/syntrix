// STATUS: UPDATED

import { calculateFindingCounts, normalizeScannerFindings } from "./finding.js";

import { createPendingVerification } from "./verification.js";

const normalizeEvidence = (scannerId, evidence) => {
  if (!Array.isArray(evidence)) {
    return [];
  }

  return evidence
    .filter((item) => item && typeof item === "object")
    .map((item) => ({
      scannerId,

      type: item.type ?? "metadata",

      findingId: item.findingId ?? null,

      findingFingerprint: item.findingFingerprint ?? null,

      findingKey: item.findingKey ?? null,

      fingerprint: item.fingerprint ?? null,

      request: item.request ?? undefined,

      response: item.response ?? undefined,

      observation: item.observation ?? undefined,

      metadata: item.metadata ?? {},

      method: item.method ?? undefined,

      url: item.url ?? undefined,

      statusCode: item.statusCode ?? undefined,

      bodyExcerpt: item.bodyExcerpt ?? undefined,

      summary: item.summary ?? undefined,

      sensitiveDataRedacted: item.sensitiveDataRedacted ?? true,
    }));
};

const processScannerResult = ({ scanner, result }) => {
  if (!result || typeof result !== "object") {
    throw new TypeError(`Scanner ${scanner.id} returned an invalid result.`);
  }

  const findings = normalizeScannerFindings(scanner.id, result.findings);

  const evidence = normalizeEvidence(scanner.id, result.evidence);

  const fingerprints = Array.isArray(result.fingerprints)
    ? result.fingerprints.map((fingerprint) => ({
        scannerId: scanner.id,

        ...fingerprint,
      }))
    : [];

  const verificationRecords = findings.map((finding) =>
    createPendingVerification({
      finding,
    }),
  );

  return {
    scannerId: scanner.id,

    category: scanner.category,

    status: result.status ?? "completed",

    data: result.data ?? {},

    findings,

    evidence,

    fingerprints,

    verificationRecords,

    metadata: result.metadata ?? {},
  };
};

const mergeResults = (results) => {
  const findings = results.flatMap((result) => result.findings);

  const evidence = results.flatMap((result) => result.evidence);

  const fingerprints = results.flatMap((result) => result.fingerprints);

  const verificationRecords = results.flatMap(
    (result) => result.verificationRecords,
  );

  return {
    scannerResults: results,

    findings,

    evidence,

    fingerprints,

    verificationRecords,

    counts: calculateFindingCounts(findings),
  };
};

export { mergeResults, processScannerResult };
