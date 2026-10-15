const SEVERITIES = new Set(["critical", "high", "medium", "low", "info"]);

const CONFIDENCES = new Set(["low", "medium", "high"]);

const normalizeFinding = ({
  scannerId,
  title,
  description,
  severity = "info",
  confidence = "low",
  category,
  remediation,
  evidenceIds = [],
  metadata = {},
}) => {
  const normalizedSeverity = SEVERITIES.has(severity) ? severity : "info";

  const normalizedConfidence = CONFIDENCES.has(confidence) ? confidence : "low";

  return {
    scannerId,
    title: String(title).slice(0, 500),
    description: String(description).slice(0, 5000),
    severity: normalizedSeverity,
    confidence: normalizedConfidence,
    category: category ?? "security",
    remediation:
      typeof remediation === "string" ? remediation.slice(0, 5000) : undefined,
    evidenceIds: Array.isArray(evidenceIds) ? evidenceIds : [],
    metadata,
  };
};

export { normalizeFinding };
