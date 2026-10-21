// STATUS: UPDATED
// File: src/reports/jsonReport.js

const buildJsonReport = ({
  scan,
  target,
  findings = [],
  evidence = [],
  fingerprints = [],
  risk = null,
  aiAnalysis = null,
  companyRuleAnalysis = null,
  generatedAt = new Date(),
}) => {
  const companyRuleReport = companyRuleAnalysis
    ? {
        enabled: companyRuleAnalysis.enabled ?? false,
        rulesEvaluated: companyRuleAnalysis.rulesEvaluated ?? 0,
        violatedRules: companyRuleAnalysis.violatedRules ?? 0,
        evaluations: (companyRuleAnalysis.evaluations ?? []).map(
          (evaluation) => ({
            ruleId: evaluation?.ruleId ?? null,
            ruleName: evaluation?.ruleName ?? null,
            status:
              evaluation?.status ??
              (evaluation?.error
                ? "error"
                : !evaluation?.supported
                  ? "unsupported"
                  : evaluation?.violated
                    ? "violated"
                    : "passed"),
            supported: evaluation?.supported ?? false,
            violated: evaluation?.violated ?? false,
            actual: evaluation?.actual ?? null,
            expected: evaluation?.expected ?? null,
            operator: evaluation?.operator ?? null,
            scannerId: evaluation?.scannerId ?? null,
            source: evaluation?.source ?? null,
            error: evaluation?.error ?? null,
          }),
        ),
      }
    : null;

  return {
    report: {
      version: "1.0",
      generatedAt:
        generatedAt instanceof Date
          ? generatedAt.toISOString()
          : new Date(generatedAt).toISOString(),
    },

    scan: {
      id: scan?.id ?? scan?._id ?? null,
      status: scan?.status ?? null,
      startedAt: scan?.startedAt ?? null,
      completedAt: scan?.completedAt ?? null,
      selection: scan?.selection ?? null,
      selectedScannerIds: scan?.selectedScannerIds ?? [],
    },

    target: {
      url: target?.url ?? null,
      hostname: target?.hostname ?? null,
      normalizedUrl: target?.normalizedUrl ?? null,
    },

    risk: risk
      ? {
          score: risk.score ?? 0,
          level: risk.level ?? "info",
          highestSeverity: risk.highestSeverity ?? "info",
          totalFindings: risk.totalFindings ?? findings.length,
          severityCounts: risk.severityCounts ?? {},
          confidenceCounts: risk.confidenceCounts ?? {},
        }
      : null,

    findings: findings.map((finding) => ({
      id: finding?._id ?? finding?.id ?? null,
      fingerprint: finding?.fingerprint ?? null,
      scannerId: finding?.scannerId ?? null,
      category: finding?.category ?? null,
      title: finding?.title ?? null,
      description: finding?.description ?? null,
      severity: finding?.severity ?? "info",
      confidence: finding?.confidence ?? "low",
      status: finding?.status ?? "detected",
      remediation: finding?.remediation ?? null,
      metadata: finding?.metadata ?? {},
    })),

    evidence: evidence.map((item) => ({
      id: item?._id ?? item?.id ?? null,
      findingId: item?.findingId ?? null,
      type: item?.type ?? null,
      request: item?.request ?? null,
      response: item?.response ?? null,
      metadata: item?.metadata ?? {},
    })),

    fingerprints: fingerprints.map((fingerprint) => ({
      id: fingerprint?._id ?? fingerprint?.id ?? null,
      type: fingerprint?.type ?? null,
      value: fingerprint?.value ?? null,
      metadata: fingerprint?.metadata ?? {},
    })),

    aiAnalysis: aiAnalysis ?? null,

    companyRuleAnalysis: companyRuleReport,
  };
};

const serializeJsonReport = (report) => JSON.stringify(report, null, 2);

export { buildJsonReport, serializeJsonReport };
