// STATUS: UPDATED
// File: src/reports/reportService.js

import * as reportRepository from "../database/repositories/report.repository.js";
import * as scanRepository from "../database/repositories/scan.repository.js";
import * as targetRepository from "../database/repositories/target.repository.js";
import * as findingRepository from "../database/repositories/finding.repository.js";
import * as evidenceRepository from "../database/repositories/evidence.repository.js";
import * as fingerprintRepository from "../database/repositories/fingerprint.repository.js";
import * as aiAnalysisRepository from "../database/repositories/aiAnalysis.repository.js";

import { buildReport, SUPPORTED_FORMATS } from "./reportBuilder.js";

import { buildPdfDocument, assertPdfSource } from "./pdfReport.js";

import { storeReport, removeStoredReport } from "./reportStorage.js";

const createReportError = (message, code, statusCode = 500) => {
  const error = new Error(message);
  error.code = code;
  error.statusCode = statusCode;
  return error;
};

const getHostname = (value) => {
  try {
    return new URL(value).hostname;
  } catch {
    return null;
  }
};

const calculateRisk = (scan, findings) => {
  const severityCounts = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    info: 0,
  };

  const confidenceCounts = {
    low: 0,
    medium: 0,
    high: 0,
  };

  for (const finding of findings) {
    if (Object.hasOwn(severityCounts, finding.severity)) {
      severityCounts[finding.severity] += 1;
    }

    if (Object.hasOwn(confidenceCounts, finding.confidence)) {
      confidenceCounts[finding.confidence] += 1;
    }
  }

  const score = Math.min(100, Math.max(0, Number(scan.riskScore) || 0));

  const highestSeverity =
    ["critical", "high", "medium", "low", "info"].find(
      (severity) => severityCounts[severity] > 0,
    ) || "info";

  const level =
    score >= 80
      ? "critical"
      : score >= 60
        ? "high"
        : score >= 40
          ? "medium"
          : score >= 20
            ? "low"
            : "info";

  return {
    score,
    level,
    highestSeverity,
    totalFindings: findings.length,
    severityCounts,
    confidenceCounts,
  };
};

const generateReport = async ({
  ownerId,
  reportId,
  scanId,
  format,
  aiAnalysis = null,
}) => {
  if (!ownerId || !reportId || !scanId) {
    throw createReportError(
      "ownerId, reportId, and scanId are required.",
      "REPORT_ARGUMENTS_REQUIRED",
      400,
    );
  }

  if (!SUPPORTED_FORMATS.includes(format)) {
    throw createReportError(
      "Unsupported report format.",
      "UNSUPPORTED_REPORT_FORMAT",
      400,
    );
  }

  const report = await reportRepository.findById(ownerId, reportId);

  if (!report || String(report.scanId) !== String(scanId)) {
    throw createReportError(
      "The report does not belong to this owner and scan.",
      "REPORT_NOT_FOUND",
      404,
    );
  }

  // BullMQ jobs may be retried after a successful generation.
  if (report.status === "completed") {
    return report;
  }

  const scan = await scanRepository.findById(ownerId, scanId);

  if (!scan) {
    throw createReportError("Scan was not found.", "SCAN_NOT_FOUND", 404);
  }

  const target = await targetRepository.findById(ownerId, scan.targetId);

  if (!target) {
    throw createReportError(
      "The target associated with this scan was not found.",
      "TARGET_NOT_FOUND",
      404,
    );
  }

  // Repositories enforce owner and scan scope.
  const [findings, evidence, fingerprints, fetchedAiAnalysis] = await Promise.all([
    findingRepository.listByScan(ownerId, scanId, {
      limit: 1000,
      skip: 0,
    }),
    evidenceRepository.listByScan(ownerId, scanId, {
      limit: 1000,
      skip: 0,
    }),
    fingerprintRepository.listByScan(ownerId, scanId, {
      limit: 1000,
      skip: 0,
    }),
    aiAnalysis
      ? Promise.resolve(aiAnalysis)
      : aiAnalysisRepository.findByScanId(ownerId, scanId).catch(() => null),
  ]);

  const effectiveAiAnalysis =
    aiAnalysis || (fetchedAiAnalysis?.length ? fetchedAiAnalysis : null);

  const normalizedScan = {
    ...scan,
    id: String(scan._id),
    selection: scan.scanSelection,
    selectedScannerIds: [
      ...(scan.scanSelection?.recon ?? []),
      ...(scan.scanSelection?.security ?? []),
    ],

    // Include persisted company-rule evaluations in reports.
    companyRuleAnalysis: scan.companyRuleAnalysis ?? null,
  };

  const normalizedTarget = {
    ...target,
    url: target.url ?? scan.targetUrl,
    hostname: target.hostname ?? getHostname(scan.targetUrl),
    normalizedUrl: target.normalizedUrl ?? scan.targetUrl,
  };

  const risk = calculateRisk(scan, findings);

  const generatedAt = new Date();

  const document = buildReport({
    format,
    scan: normalizedScan,
    target: normalizedTarget,
    findings,
    evidence,
    fingerprints,
    risk,
    aiAnalysis: effectiveAiAnalysis,
    companyRuleAnalysis: normalizedScan.companyRuleAnalysis,
    generatedAt,
  });

  let content = document.content;

  if (format === "pdf") {
    content = assertPdfSource(
      await buildPdfDocument({
        html: document.pdfSource,
      }),
    );
  }

  let storedReport = null;

  try {
    storedReport = await storeReport({
      ownerId: String(ownerId),
      scanId: String(scanId),
      reportId: String(reportId),
      format,
      content,
      contentType: document.contentType,
    });

    const completedReport = await reportRepository.markCompleted(
      ownerId,
      reportId,
      storedReport,
    );

    if (!completedReport) {
      throw createReportError(
        "Generated report could not be saved to the database.",
        "REPORT_COMPLETION_FAILED",
      );
    }

    return completedReport;
  } catch (error) {
    // Avoid leaving an uploaded file orphaned if database completion fails.
    if (storedReport?.storagePublicId) {
      try {
        await removeStoredReport({
          publicId: storedReport.storagePublicId,
        });
      } catch {
        // Preserve the original generation error.
      }
    }

    throw error;
  }
};

export { generateReport };
