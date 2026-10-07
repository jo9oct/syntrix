import crypto from "node:crypto";

const normalizeValue = (value) =>
  String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

const createHash = (value) =>
  crypto
    .createHash("sha256")
    .update(value)
    .digest("hex");

const createFindingFingerprint = ({
  scannerId,
  category,
  title,
  target,
  parameter = null,
  location = null,
  evidenceType = null
}) => {
  const normalized = [
    normalizeValue(scannerId),
    normalizeValue(category),
    normalizeValue(title),
    normalizeValue(target),
    normalizeValue(parameter),
    normalizeValue(location),
    normalizeValue(evidenceType)
  ].join("|");

  return createHash(normalized);
};

const createTargetFingerprint = ({
  normalizedUrl,
  hostname
}) => {
  const normalized = [
    normalizeValue(normalizedUrl),
    normalizeValue(hostname)
  ].join("|");

  return createHash(normalized);
};

const createEvidenceFingerprint = ({
  scannerId,
  findingFingerprint,
  requestMethod = null,
  requestUrl = null,
  responseStatus = null
}) => {
  const normalized = [
    normalizeValue(scannerId),
    normalizeValue(findingFingerprint),
    normalizeValue(requestMethod),
    normalizeValue(requestUrl),
    normalizeValue(responseStatus)
  ].join("|");

  return createHash(normalized);
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
      target:
        finding.target ||
        finding.url ||
        finding.metadata?.url ||
        "",
      parameter:
        finding.parameter ||
        finding.metadata?.parameter ||
        null,
      location:
        finding.location ||
        finding.metadata?.location ||
        null,
      evidenceType:
        finding.evidenceType ||
        finding.metadata?.evidenceType ||
        null
    })
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
        target:
          finding.target ||
          finding.url ||
          finding.metadata?.url ||
          "",
        parameter:
          finding.parameter ||
          finding.metadata?.parameter ||
          null,
        location:
          finding.location ||
          finding.metadata?.location ||
          null,
        evidenceType:
          finding.evidenceType ||
          finding.metadata?.evidenceType ||
          null
      });

    if (!groups.has(fingerprint)) {
      groups.set(fingerprint, []);
    }

    groups.get(fingerprint).push({
      ...finding,
      fingerprint
    });
  }

  return Array.from(groups.entries()).map(
    ([fingerprint, items]) => ({
      fingerprint,
      count: items.length,
      primary: items[0],
      occurrences: items
    })
  );
};

export {
  createFindingFingerprint,
  createTargetFingerprint,
  createEvidenceFingerprint,
  attachFindingFingerprint,
  attachFindingFingerprints,
  correlateFindings
};