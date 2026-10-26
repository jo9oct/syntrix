import test from "node:test";
import assert from "node:assert/strict";

import { buildJsonReport } from "../../src/reports/jsonReport.js";
import { buildHtmlReport } from "../../src/reports/htmlReport.js";

test("reportBuilder - includes AI recommendations in JSON report", () => {
  const scan = { _id: "scan_123", targetUrl: "https://example.com" };
  const target = { url: "https://example.com" };
  const findings = [
    {
      _id: "f_01",
      title: "SQL Injection in category",
      scannerId: "sqli",
      severity: "high",
      confidence: "high",
      remediation: "Use parameterized queries",
      aiAnalysis: {
        summary: "Critical SQL injection allows DB exfiltration.",
        rootCause: "Unsanitized input passed directly to SQL query.",
        impact: "Confidentiality and integrity loss.",
        remediation: {
          summary: "Adopt prepared statements across all handlers.",
          actions: ["Audit DAO layer", "Replace concatenation with parameter binding"],
          references: ["CWE-89", "OWASP Top 10 A03:2021"],
        },
      },
    },
  ];

  const jsonReport = buildJsonReport({
    scan,
    target,
    findings,
    aiAnalysis: findings.map((f) => ({ findingId: f._id, result: f.aiAnalysis })),
  });

  assert.equal(jsonReport.findings.length, 1);
  assert.equal(jsonReport.findings[0].aiAnalysis?.summary, "Critical SQL injection allows DB exfiltration.");
  assert.equal(jsonReport.findings[0].aiAnalysis?.rootCause, "Unsanitized input passed directly to SQL query.");
  assert.equal(jsonReport.findings[0].aiAnalysis?.remediation?.actions.length, 2);
  assert.ok(Array.isArray(jsonReport.aiAnalysis));
});

test("reportBuilder - includes AI recommendations in HTML & PDF report", () => {
  const scan = { _id: "scan_123", targetUrl: "https://example.com" };
  const target = { url: "https://example.com" };
  const findings = [
    {
      _id: "f_01",
      title: "SQL Injection in category",
      scannerId: "sqli",
      severity: "high",
      confidence: "high",
      aiAnalysis: {
        summary: "Critical SQL injection allows DB exfiltration.",
        rootCause: "Unsanitized input passed directly to SQL query.",
        impact: "Confidentiality and integrity loss.",
        remediation: {
          summary: "Adopt prepared statements across all handlers.",
          actions: ["Audit DAO layer", "Replace concatenation with parameter binding"],
          references: ["CWE-89"],
        },
      },
    },
  ];

  const html = buildHtmlReport({
    scan,
    target,
    findings,
    aiAnalysis: findings.map((f) => ({ findingId: f._id, result: f.aiAnalysis })),
  });

  assert.ok(html.includes("✦ AI Security Advisory"));
  assert.ok(html.includes("Root Cause Analysis"));
  assert.ok(html.includes("Unsanitized input passed directly to SQL query."));
  assert.ok(html.includes("Threat & Business Impact"));
  assert.ok(html.includes("Defensive Developer Remediation Checklist:"));
  assert.ok(html.includes("Replace concatenation with parameter binding"));
  assert.ok(html.includes("CWE-89"));
});

