
 // STATUS: UPDATED
 // File: src/reports/htmlReport.js

const escapeHtml = (value) => {
  const text = String(value ?? "");

  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
};

const formatDate = (value) => {
  if (!value) {
    return "N/A";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "N/A";
  }

  return date.toISOString();
};

const formatValue = (value) => {
  if (value === null || value === undefined) {
    return "N/A";
  }

  if (typeof value === "string") {
    return value;
  }

  if (
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return String(value);
  }

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return "[Unable to display value]";
  }
};

const getEvaluationStatus = (evaluation) => {
  if (evaluation?.error) {
    return "error";
  }

  if (evaluation?.status) {
    return evaluation.status;
  }

  if (!evaluation?.supported) {
    return "unsupported";
  }

  return evaluation.violated
    ? "violated"
    : "passed";
};

const renderCompanyRuleEvaluation = (evaluation) => {
  const status = getEvaluationStatus(evaluation);

  return `
    <tr>
      <td>
        <strong>${escapeHtml(
          evaluation?.ruleName || "Unnamed rule"
        )}</strong>
        <div class="muted">
          ID: ${escapeHtml(
            evaluation?.ruleId || "N/A"
          )}
        </div>
      </td>

      <td>
        <span class="badge rule-status-${escapeHtml(status)}">
          ${escapeHtml(status)}
        </span>
      </td>

      <td>${escapeHtml(
        evaluation?.supported === true
          ? "Yes"
          : evaluation?.supported === false
            ? "No"
            : "N/A"
      )}</td>

      <td>${escapeHtml(
        evaluation?.scannerId || "N/A"
      )}</td>

      <td>${escapeHtml(
        evaluation?.operator || "N/A"
      )}</td>

      <td>
        <pre class="rule-value">${escapeHtml(
          formatValue(evaluation?.expected)
        )}</pre>
      </td>

      <td>
        <pre class="rule-value">${escapeHtml(
          formatValue(evaluation?.actual)
        )}</pre>
      </td>

      <td>${escapeHtml(
        evaluation?.source || "N/A"
      )}</td>

      <td>
        ${
          evaluation?.error
            ? `<pre class="rule-value rule-error">${escapeHtml(
                formatValue(evaluation.error)
              )}</pre>`
            : "N/A"
        }
      </td>
    </tr>
  `;
};

const renderCompanyRuleAnalysis = (
  companyRuleAnalysis = null
) => {
  if (!companyRuleAnalysis) {
    return `
      <section class="card">
        <h2>Company Rule Analysis</h2>
        <div class="empty">
          No company-rule analysis was recorded for this scan.
        </div>
      </section>
    `;
  }

  const evaluations =
    Array.isArray(companyRuleAnalysis.evaluations)
      ? companyRuleAnalysis.evaluations
      : [];

  const enabled =
    companyRuleAnalysis.enabled ?? false;

  return `
    <section class="card">
      <h2>Company Rule Analysis</h2>

      <div class="summary">
        <div class="metric">
          <div>Analysis Enabled</div>
          <div class="metric-value">
            ${enabled ? "Yes" : "No"}
          </div>
        </div>

        <div class="metric">
          <div>Rules Evaluated</div>
          <div class="metric-value">
            ${escapeHtml(
              companyRuleAnalysis.rulesEvaluated ?? 0
            )}
          </div>
        </div>

        <div class="metric">
          <div>Violated Rules</div>
          <div class="metric-value">
            ${escapeHtml(
              companyRuleAnalysis.violatedRules ?? 0
            )}
          </div>
        </div>

        <div class="metric">
          <div>Passed Rules</div>
          <div class="metric-value">
            ${evaluations.filter(
              (evaluation) =>
                getEvaluationStatus(evaluation) === "passed"
            ).length}
          </div>
        </div>

        <div class="metric">
          <div>Unsupported Rules</div>
          <div class="metric-value">
            ${evaluations.filter(
              (evaluation) =>
                getEvaluationStatus(evaluation) === "unsupported"
            ).length}
          </div>
        </div>

        <div class="metric">
          <div>Evaluation Errors</div>
          <div class="metric-value">
            ${evaluations.filter(
              (evaluation) =>
                getEvaluationStatus(evaluation) === "error"
            ).length}
          </div>
        </div>
      </div>

      <h3 class="rule-table-heading">
        Individual Rule Evaluations
      </h3>

      ${
        evaluations.length
          ? `
            <div class="table-wrapper">
              <table class="rule-table">
                <thead>
                  <tr>
                    <th>Rule</th>
                    <th>Status</th>
                    <th>Supported</th>
                    <th>Scanner</th>
                    <th>Operator</th>
                    <th>Expected</th>
                    <th>Actual</th>
                    <th>Source</th>
                    <th>Error</th>
                  </tr>
                </thead>
                <tbody>
                  ${evaluations
                    .map(renderCompanyRuleEvaluation)
                    .join("\n")}
                </tbody>
              </table>
            </div>
          `
          : `
            <div class="empty">
              No individual rule evaluations were recorded.
            </div>
          `
      }
    </section>
  `;
};

const renderFinding = (finding) => `
<section class="finding">
  <div class="finding-header">
    <div>
      <h3>${escapeHtml(
        finding?.title || "Untitled finding"
      )}</h3>
      <p class="muted">
        ${escapeHtml(
          finding?.scannerId || "unknown-scanner"
        )}
      </p>
    </div>

    <div class="badges">
      <span class="badge severity-${escapeHtml(
        finding?.severity || "info"
      )}">
        ${escapeHtml(
          finding?.severity || "info"
        )}
      </span>

      <span class="badge">
        ${escapeHtml(
          finding?.confidence || "low"
        )} confidence
      </span>
    </div>
  </div>

  <p>
    ${escapeHtml(
      finding?.description ||
        "No description available."
    )}
  </p>

  <div class="finding-meta">
    <strong>Category:</strong>
    ${escapeHtml(
      finding?.category || "N/A"
    )}
  </div>

  <div class="finding-meta">
    <strong>Status:</strong>
    ${escapeHtml(
      finding?.status || "detected"
    )}
  </div>

  ${
    finding?.remediation
      ? `
        <div class="remediation">
          <strong>Remediation</strong>
          <p>${escapeHtml(
            typeof finding.remediation === "string"
              ? finding.remediation
              : JSON.stringify(finding.remediation)
          )}</p>
        </div>
      `
      : ""
  }
</section>
`;

const renderFindings = (findings = []) => {
  if (!findings.length) {
    return `
      <div class="empty">
        No findings were recorded for this assessment.
      </div>
    `;
  }

  return findings.map(renderFinding).join("\n");
};

const buildHtmlReport = ({
  scan,
  target,
  findings = [],
  risk = null,
  companyRuleAnalysis = null,
  generatedAt = new Date(),
}) => {
  const riskScore = Number(risk?.score ?? 0);
  const riskLevel = risk?.level ?? "info";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta
    name="viewport"
    content="width=device-width, initial-scale=1.0"
  >
  <title>Security Assessment Report</title>

  <style>
    body {
      margin: 0;
      padding: 0;
      background: #f4f6f8;
      color: #17202a;
      font-family:
        -apple-system,
        BlinkMacSystemFont,
        "Segoe UI",
        sans-serif;
    }

    .container {
      width: min(1100px, 94%);
      margin: 40px auto;
    }

    .header,
    .card,
    .finding {
      background: #ffffff;
      border-radius: 10px;
      padding: 24px;
      margin-bottom: 20px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
    }

    h1, h2, h3 {
      margin-top: 0;
    }

    .muted {
      color: #687078;
    }

    .summary {
      display: grid;
      grid-template-columns:
        repeat(auto-fit, minmax(180px, 1fr));
      gap: 16px;
    }

    .metric {
      padding: 18px;
      border: 1px solid #e0e5e9;
      border-radius: 8px;
    }

    .metric-value {
      font-size: 30px;
      font-weight: 700;
      margin-top: 8px;
      overflow-wrap: anywhere;
    }

    .finding-header {
      display: flex;
      justify-content: space-between;
      gap: 20px;
      align-items: flex-start;
    }

    .badges {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }

    .badge {
      display: inline-block;
      padding: 5px 9px;
      border-radius: 5px;
      background: #e9edf0;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
    }

    .severity-critical {
      background: #e8b0b0;
    }

    .severity-high {
      background: #edc0a2;
    }

    .severity-medium {
      background: #ead79b;
    }

    .severity-low {
      background: #b9d6bc;
    }

    .severity-info {
      background: #c7d5e5;
    }

    .rule-status-passed {
      background: #b9d6bc;
    }

    .rule-status-violated,
    .rule-status-error {
      background: #e8b0b0;
    }

    .rule-status-unsupported {
      background: #ead79b;
    }

    .finding-meta {
      margin-top: 10px;
      color: #4e5963;
    }

    .remediation {
      margin-top: 18px;
      padding: 16px;
      border-left: 4px solid #596b7a;
      background: #f4f6f8;
    }

    .rule-table-heading {
      margin-top: 28px;
    }

    .table-wrapper {
      width: 100%;
      overflow-x: auto;
    }

    .rule-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }

    .rule-table th,
    .rule-table td {
      padding: 12px;
      border: 1px solid #e0e5e9;
      text-align: left;
      vertical-align: top;
    }

    .rule-table th {
      background: #f4f6f8;
    }

    .rule-table td {
      overflow-wrap: anywhere;
    }

    .rule-value {
      margin: 0;
      white-space: pre-wrap;
      overflow-wrap: anywhere;
      font-family: monospace;
      font-size: 12px;
    }

    .rule-error {
      color: #a12622;
    }

    .empty {
      padding: 25px;
      text-align: center;
      color: #687078;
    }

    @media print {
      body {
        background: #ffffff;
      }

      .container {
        width: 100%;
        margin: 0;
      }

      .header,
      .card,
      .finding {
        box-shadow: none;
        border: 1px solid #ddd;
        break-inside: avoid;
      }

      .table-wrapper {
        overflow: visible;
      }

      .rule-table {
        font-size: 10px;
      }

      .rule-table th,
      .rule-table td {
        padding: 5px;
      }
    }
  </style>
</head>

<body>
  <main class="container">

    <section class="header">
      <h1>Web Security Assessment Report</h1>

      <p class="muted">
        Generated:
        ${escapeHtml(formatDate(generatedAt))}
      </p>

      <p>
        <strong>Target:</strong>
        ${escapeHtml(target?.url || "N/A")}
      </p>

      <p>
        <strong>Scan ID:</strong>
        ${escapeHtml(scan?.id || scan?._id || "N/A")}
      </p>
    </section>

    <section class="card">
      <h2>Risk Summary</h2>

      <div class="summary">
        <div class="metric">
          <div>Risk Score</div>
          <div class="metric-value">
            ${escapeHtml(riskScore)}
          </div>
        </div>

        <div class="metric">
          <div>Risk Level</div>
          <div class="metric-value">
            ${escapeHtml(riskLevel)}
          </div>
        </div>

        <div class="metric">
          <div>Total Findings</div>
          <div class="metric-value">
            ${escapeHtml(
              risk?.totalFindings ?? findings.length
            )}
          </div>
        </div>

        <div class="metric">
          <div>Critical</div>
          <div class="metric-value">
            ${escapeHtml(risk?.severityCounts?.critical ?? 0)}
          </div>
        </div>

        <div class="metric">
          <div>High</div>
          <div class="metric-value">
            ${escapeHtml(risk?.severityCounts?.high ?? 0)}
          </div>
        </div>

        <div class="metric">
          <div>Medium</div>
          <div class="metric-value">
            ${escapeHtml(risk?.severityCounts?.medium ?? 0)}
          </div>
        </div>
      </div>
    </section>

    ${renderCompanyRuleAnalysis(companyRuleAnalysis)}

    <section>
      <h2>Findings</h2>
      ${renderFindings(findings)}
    </section>

  </main>
</body>
</html>`;
};

export {
  buildHtmlReport,
  escapeHtml,
};
