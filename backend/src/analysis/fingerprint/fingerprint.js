// STATUS: UPDATED

import crypto from "node:crypto";

const normalizeValue = (value) =>
  String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

const stableSerialize = (value) => {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value !== "object") {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(stableSerialize);
  }

  return Object.keys(value)
    .sort()
    .reduce((result, key) => {
      result[key] = stableSerialize(value[key]);
      return result;
    }, {});
};

const createHash = (value) =>
  crypto.createHash("sha256").update(value).digest("hex");

const createFindingFingerprint = ({
  scannerId,
  category,
  title,
  target,
  parameter = null,
  location = null,
  evidenceType = null,
}) => {
  const normalized = [
    normalizeValue(scannerId),
    normalizeValue(category),
    normalizeValue(title),
    normalizeValue(target),
    normalizeValue(parameter),
    normalizeValue(location),
    normalizeValue(evidenceType),
  ].join("|");

  return createHash(normalized);
};

const createTargetFingerprint = ({ normalizedUrl, hostname }) => {
  const normalized = [
    normalizeValue(normalizedUrl),
    normalizeValue(hostname),
  ].join("|");

  return createHash(normalized);
};

const createEvidenceFingerprint = ({
  scannerId,
  findingFingerprint,
  requestMethod = null,
  requestUrl = null,
  responseStatus = null,
  evidenceType = null,
  parameter = null,
  observation = null,
  expected = null,
  actual = null,
  requestParameters = null,
  requestBody = null,
  responseBodySnippet = null,
  payload = null,
}) => {
  const identity = {
    scannerId: normalizeValue(scannerId),
    findingFingerprint: normalizeValue(findingFingerprint),
    requestMethod: normalizeValue(requestMethod),
    requestUrl: normalizeValue(requestUrl),
    responseStatus: normalizeValue(responseStatus),
    evidenceType: normalizeValue(evidenceType),
    parameter: stableSerialize(parameter),
    observation: stableSerialize(observation),
    expected: stableSerialize(expected),
    actual: stableSerialize(actual),
    requestParameters: stableSerialize(requestParameters),
    requestBody: stableSerialize(requestBody),
    responseBodySnippet: stableSerialize(responseBodySnippet),
    payload: stableSerialize(payload),
  };

  return createHash(JSON.stringify(identity));
};

const attachFindingFingerprint = (finding) => {
  if (!finding || typeof finding !== "object") {
    return finding;
  }

  if (finding.fingerprint) {
    return finding;
  }

  return {
    ...finding,
    fingerprint: createFindingFingerprint({
      scannerId: finding.scannerId,
      category: finding.category,
      title: finding.title,
      target: finding.target || finding.url || finding.metadata?.url || "",
      parameter: finding.parameter || finding.metadata?.parameter || null,
      location: finding.location || finding.metadata?.location || null,
      evidenceType:
        finding.evidenceType || finding.metadata?.evidenceType || null,
    }),
  };
};

const attachFindingFingerprints = (findings = []) =>
  findings.map(attachFindingFingerprint);

const correlateFindings = (findings = []) => {
  const groups = new Map();

  for (const finding of findings) {
    const fingerprint =
      finding.fingerprint ||
      createFindingFingerprint({
        scannerId: finding.scannerId,
        category: finding.category,
        title: finding.title,
        target: finding.target || finding.url || finding.metadata?.url || "",
        parameter: finding.parameter || finding.metadata?.parameter || null,
        location: finding.location || finding.metadata?.location || null,
        evidenceType:
          finding.evidenceType || finding.metadata?.evidenceType || null,
      });

    if (!groups.has(fingerprint)) {
      groups.set(fingerprint, []);
    }

    groups.get(fingerprint).push({
      ...finding,
      fingerprint,
    });
  }

  return Array.from(groups.entries()).map(([fingerprint, items]) => ({
    fingerprint,
    count: items.length,
    primary: items[0],
    occurrences: items,
  }));
};

export {
  createFindingFingerprint,
  createTargetFingerprint,
  createEvidenceFingerprint,
  attachFindingFingerprint,
  attachFindingFingerprints,
  correlateFindings,
};
