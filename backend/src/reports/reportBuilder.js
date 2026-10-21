// STATUS: UPDATED
// File: src/reports/reportBuilder.js

import { buildJsonReport, serializeJsonReport } from "./jsonReport.js";

import { buildHtmlReport } from "./htmlReport.js";

const SUPPORTED_FORMATS = Object.freeze(["json", "html", "pdf"]);

const assertSupportedFormat = (format) => {
  if (!SUPPORTED_FORMATS.includes(format)) {
    throw new Error(`Unsupported report format: ${format}`);
  }
};

const buildReport = ({
  format,
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
  assertSupportedFormat(format);

  const data = {
    scan,
    target,
    findings,
    evidence,
    fingerprints,
    risk,
    aiAnalysis,
    companyRuleAnalysis,
    generatedAt,
  };

  if (format === "json") {
    const report = buildJsonReport(data);

    return {
      format,
      contentType: "application/json",
      extension: "json",
      content: serializeJsonReport(report),
    };
  }

  const html = buildHtmlReport(data);

  if (format === "html") {
    return {
      format,
      contentType: "text/html; charset=utf-8",
      extension: "html",
      content: html,
    };
  }

  if (format === "pdf") {
    return {
      format,
      contentType: "application/pdf",
      extension: "pdf",
      content: null,
      pdfSource: html,
    };
  }
};

export { SUPPORTED_FORMATS, buildReport };
