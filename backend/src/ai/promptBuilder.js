// STATUS: UPDATED

const MAX_TEXT_LENGTH = 12_000;

const MAX_EVIDENCE_ITEMS = 5;

const truncate = (value, maxLength = MAX_TEXT_LENGTH) => {
  const text = String(value ?? "");

  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength)}...[truncated]`;
};

const sanitizeEvidence = (evidence = []) =>
  evidence.slice(0, MAX_EVIDENCE_ITEMS).map((item) => ({
    type: item?.type ?? null,

    request: item?.request
      ? truncate(JSON.stringify(item.request), 5_000)
      : null,

    response: item?.response
      ? truncate(JSON.stringify(item.response), 5_000)
      : null,

    observation: item?.observation
      ? truncate(JSON.stringify(item.observation), 5_000)
      : null,

    summary: item?.summary ? truncate(item.summary, 2_000) : null,

    metadata: item?.metadata
      ? truncate(JSON.stringify(item.metadata), 3_000)
      : null,
  }));

const buildFindingContext = ({ finding, evidence = [], target = null }) => ({
  scannerId: finding?.scannerId ?? null,

  category: finding?.category ?? null,

  title: truncate(finding?.title, 1_000),

  description: truncate(finding?.description, 5_000),

  impact: truncate(finding?.impact, 3_000),

  severity: finding?.severity ?? "info",

  confidence: finding?.confidence ?? "low",

  status: finding?.status ?? "detected",

  verificationStatus: finding?.verificationStatus ?? "pending",

  remediation: truncate(finding?.remediation, 5_000),

  target: target ? truncate(target, 2_000) : null,

  parameter: finding?.parameter || finding?.metadata?.parameter || null,

  location: finding?.location || finding?.metadata?.location || null,

  evidence: sanitizeEvidence(evidence),
});

const buildSystemPrompt = () => `
You are a defensive application-security analysis assistant.

You analyze findings produced by an authorized web security
assessment platform.

Your analysis must be based ONLY on the supplied finding and
evidence.

STRICT RULES:

1. Do not invent vulnerabilities, endpoints, requests,
   responses, parameters, technologies, or exploitation results.

2. Treat scanner findings as evidence, not absolute proof.

3. Respect the supplied severity, confidence, status, and
   verification status.

4. Clearly distinguish observed facts from technical inference.

5. If the evidence is insufficient to determine something,
   return null or explain the uncertainty instead of guessing.

6. Provide defensive remediation only.

7. Do not provide destructive exploitation instructions.

8. Never expose, reproduce, or request secrets such as
   passwords, API keys, authentication tokens, or session
   cookies.

9. Return ONLY valid JSON.

10. Do not wrap the JSON in Markdown code fences.

11. Every response MUST contain exactly these top-level fields:

{
  "summary": string | null,
  "impact": string | null,
  "rootCause": string | null,
  "uncertainty": string | null,
  "remediation": {
    "summary": string | null,
    "actions": string[],
    "references": string[]
  }
}

12. The remediation must be specific to the supplied finding.
   Do not use generic text such as "review the finding" when
   a finding-specific remediation can be determined.

13. Do not repeat the finding title as the entire summary.

14. Keep the analysis concise but technically useful.

15. If a root cause is not directly observable, describe it
   explicitly as a likely or possible cause rather than a fact.

16. The uncertainty field must explain what the supplied
   evidence does NOT establish.

17. The remediation actions must be concrete defensive
   actions appropriate for the identified security issue.

18. References must contain only references that can be
   reasonably identified from the supplied finding. If none
   are known from the supplied information, return [].
`;

const buildFindingPrompt = ({ finding, evidence = [], target = null }) => {
  const context = buildFindingContext({
    finding,
    evidence,
    target,
  });

  return {
    system: buildSystemPrompt(),

    user: JSON.stringify(
      {
        task: "Perform a defensive security analysis of the supplied finding.",

        requiredOutput: {
          summary:
            "Explain what the finding means using the supplied evidence.",

          impact:
            "Explain the realistic security impact supported by the evidence.",

          rootCause:
            "Identify the most likely technical cause. Mark it as inference when it is not directly observed.",

          uncertainty:
            "Explain what the evidence does not prove and what should be verified manually.",

          remediation: {
            summary: "Give a finding-specific defensive remediation summary.",

            actions: [
              "Provide concrete defensive remediation steps specific to the finding.",
            ],

            references: [
              "Include only references supported by the supplied information.",
            ],
          },
        },

        outputRules: [
          "Return valid JSON only.",
          "Do not return Markdown.",
          "Do not invent evidence.",
          "Use null when a field cannot be determined.",
          "Use an empty array when no references are available.",
          "Keep remediation specific to the actual finding.",
        ],

        finding: context,
      },
      null,
      2,
    ),
  };
};

const buildScanSummaryPrompt = ({ findings = [], risk = null }) => {
  const safeFindings = findings.slice(0, 100).map((finding) => ({
    fingerprint: finding?.fingerprint ?? null,

    scannerId: finding?.scannerId ?? null,

    category: finding?.category ?? null,

    title: truncate(finding?.title, 1_000),

    severity: finding?.severity ?? "info",

    confidence: finding?.confidence ?? "low",

    status: finding?.status ?? "detected",
  }));

  return {
    system: buildSystemPrompt(),

    user: JSON.stringify(
      {
        task: "Summarize the security posture represented by the supplied findings.",

        requirements: {
          summarizeMajorRisks: true,

          identifyPatterns: true,

          prioritizeRemediation: true,

          preserveScannerEvidenceBoundaries: true,
        },

        risk,

        findings: safeFindings,
      },
      null,
      2,
    ),
  };
};

export { buildFindingContext, buildFindingPrompt, buildScanSummaryPrompt };
