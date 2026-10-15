const SEVERITY_WEIGHT = Object.freeze({
  critical: 10,
  high: 7,
  medium: 4,
  low: 2,
  info: 0,
});

const CONFIDENCE_MULTIPLIER = Object.freeze({
  high: 1,
  medium: 0.8,
  low: 0.6,
});

const SEVERITY_ORDER = Object.freeze([
  "critical",
  "high",
  "medium",
  "low",
  "info",
]);

const clamp = (value, minimum, maximum) =>
  Math.min(Math.max(value, minimum), maximum);

const normalizeSeverity = (severity) => {
  const value = String(severity ?? "").toLowerCase();

  return Object.prototype.hasOwnProperty.call(SEVERITY_WEIGHT, value)
    ? value
    : "info";
};

const normalizeConfidence = (confidence) => {
  const value = String(confidence ?? "").toLowerCase();

  return Object.prototype.hasOwnProperty.call(CONFIDENCE_MULTIPLIER, value)
    ? value
    : "low";
};

const calculateFindingRisk = (finding) => {
  const severity = normalizeSeverity(finding?.severity);
  const confidence = normalizeConfidence(finding?.confidence);

  const severityWeight = SEVERITY_WEIGHT[severity];
  const confidenceMultiplier = CONFIDENCE_MULTIPLIER[confidence];

  return severityWeight * confidenceMultiplier;
};

const calculateRawRisk = (findings = []) =>
  findings.reduce((total, finding) => total + calculateFindingRisk(finding), 0);

const calculateRiskScore = (findings = []) => {
  if (!findings.length) {
    return 0;
  }

  const rawRisk = calculateRawRisk(findings);

  const maximumPossibleRisk = findings.length * SEVERITY_WEIGHT.critical;

  if (maximumPossibleRisk === 0) {
    return 0;
  }

  const score = Math.round((rawRisk / maximumPossibleRisk) * 100);

  return clamp(score, 0, 100);
};

const calculateSeverityCounts = (findings = []) => {
  const counts = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    info: 0,
  };

  for (const finding of findings) {
    const severity = normalizeSeverity(finding?.severity);

    counts[severity] += 1;
  }

  return counts;
};

const calculateConfidenceCounts = (findings = []) => {
  const counts = {
    high: 0,
    medium: 0,
    low: 0,
  };

  for (const finding of findings) {
    const confidence = normalizeConfidence(finding?.confidence);

    counts[confidence] += 1;
  }

  return counts;
};

const determineRiskLevel = (riskScore) => {
  const score = clamp(Number(riskScore) || 0, 0, 100);

  if (score >= 75) {
    return "critical";
  }

  if (score >= 50) {
    return "high";
  }

  if (score >= 25) {
    return "medium";
  }

  if (score > 0) {
    return "low";
  }

  return "info";
};

const calculateRisk = (findings = []) => {
  const severityCounts = calculateSeverityCounts(findings);

  const confidenceCounts = calculateConfidenceCounts(findings);

  const rawRisk = calculateRawRisk(findings);
  const riskScore = calculateRiskScore(findings);
  const riskLevel = determineRiskLevel(riskScore);

  const highestSeverity =
    SEVERITY_ORDER.find((severity) => severityCounts[severity] > 0) || "info";

  return {
    score: riskScore,
    level: riskLevel,
    rawRisk,
    highestSeverity,
    totalFindings: findings.length,
    severityCounts,
    confidenceCounts,
  };
};

const sortFindingsByRisk = (findings = []) =>
  [...findings].sort((left, right) => {
    const severityDifference =
      SEVERITY_WEIGHT[normalizeSeverity(right.severity)] -
      SEVERITY_WEIGHT[normalizeSeverity(left.severity)];

    if (severityDifference !== 0) {
      return severityDifference;
    }

    return calculateFindingRisk(right) - calculateFindingRisk(left);
  });

export {
  SEVERITY_WEIGHT,
  CONFIDENCE_MULTIPLIER,
  calculateFindingRisk,
  calculateRawRisk,
  calculateRiskScore,
  calculateSeverityCounts,
  calculateConfidenceCounts,
  determineRiskLevel,
  calculateRisk,
  sortFindingsByRisk,
};
