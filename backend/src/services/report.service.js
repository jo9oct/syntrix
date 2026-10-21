// STATUS: UPDATED
// FILE: src/services/report.service.js

import * as reportRepository from "../database/repositories/report.repository.js";
import * as scanRepository from "../database/repositories/scan.repository.js";

import { getPlan } from "../access/plan.service.js";
import { resolveEffectivePlanName } from "../access/subscription.service.js";

import { enqueueReportJob } from "../jobs/report.job.js";

import { SUPPORTED_FORMATS } from "../reports/reportBuilder.js";

const createServiceError = (message, statusCode, code) => {
  const error = new Error(message);

  error.statusCode = statusCode;
  error.code = code;

  return error;
};

const assertReportAccess = ({ ownerId, userType }) => {
  if (userType === "guest") {
    throw createServiceError(
      "Report generation is not available for guest sessions.",
      403,
      "GUEST_REPORT_NOT_ALLOWED",
    );
  }

  if (!ownerId) {
    throw createServiceError("ownerId is required.", 400, "OWNER_ID_REQUIRED");
  }
};

const assertReportFormatAccess = ({ format, plan }) => {
  if (!SUPPORTED_FORMATS.includes(format)) {
    throw createServiceError(
      "Unsupported report format. Use json, html, or pdf.",
      400,
      "UNSUPPORTED_REPORT_FORMAT",
    );
  }

  if (!plan.allowedReportFormats.includes(format)) {
    throw createServiceError(
      `The ${plan.name} plan does not support ${format.toUpperCase()} reports.`,
      403,
      "REPORT_FORMAT_NOT_ALLOWED",
    );
  }
};

const assertReportCountAvailable = ({ plan, reportCount }) => {
  const limit = plan.maxReportsPerScan;

  if (limit !== null && reportCount >= limit) {
    throw createServiceError(
      `The ${plan.name} plan allows a maximum of ${limit} reports per scan.`,
      403,
      "REPORT_LIMIT_EXCEEDED",
    );
  }
};

const createReport = async ({
  ownerId,
  userType = "user",
  scanId,
  format,
  aiAnalysis = null,
}) => {
  assertReportAccess({ ownerId, userType });

  if (!scanId) {
    throw createServiceError("scanId is required.", 400, "SCAN_ID_REQUIRED");
  }

  // Resolve the current plan from the trusted user record.
  const planName = await resolveEffectivePlanName({
    userId: ownerId,
  });

  const plan = getPlan(planName);

  assertReportFormatAccess({
    format,
    plan,
  });

  const scan = await scanRepository.findById(ownerId, scanId);

  if (!scan) {
    throw createServiceError("Scan was not found.", 404, "SCAN_NOT_FOUND");
  }

  // Reuse an active or completed report before checking the limit.
  const existingReport = await reportRepository.findExisting(
    ownerId,
    scanId,
    format,
  );

  if (existingReport) {
    return {
      report: existingReport,
      queued: false,
      duplicated: true,
    };
  }

  // Count all report records, including failed attempts.
  const reports = await reportRepository.listByScan(ownerId, scanId, {
    limit: 100,
    skip: 0,
  });

  assertReportCountAvailable({
    plan,
    reportCount: reports.length,
  });

  const report = await reportRepository.create({
    ownerId,
    scanId,
    format,
    status: "pending",
  });

  if (!report) {
    throw createServiceError(
      "Report could not be created.",
      500,
      "REPORT_CREATE_FAILED",
    );
  }

  try {
    await enqueueReportJob({
      ownerId,
      reportId: String(report._id),
      scanId: String(scanId),
      format,
      aiAnalysis,
    });
  } catch (error) {
    await reportRepository.markFailed(
      ownerId,
      report._id,
      error.code || "REPORT_QUEUE_FAILED",
      error.message || "Report generation could not be queued.",
    );

    throw createServiceError(
      "Report generation could not be queued.",
      503,
      "REPORT_QUEUE_FAILED",
    );
  }

  return {
    report,
    queued: true,
    duplicated: false,
  };
};

const getReport = async ({ ownerId, userType = "user", reportId }) => {
  assertReportAccess({ ownerId, userType });

  if (!reportId) {
    throw createServiceError(
      "reportId is required.",
      400,
      "REPORT_ID_REQUIRED",
    );
  }

  const report = await reportRepository.findById(ownerId, reportId);

  if (!report) {
    throw createServiceError("Report was not found.", 404, "REPORT_NOT_FOUND");
  }

  return report;
};

const getReportsByScan = async ({ ownerId, userType = "user", scanId }) => {
  assertReportAccess({ ownerId, userType });

  if (!scanId) {
    throw createServiceError("scanId is required.", 400, "SCAN_ID_REQUIRED");
  }

  const scan = await scanRepository.findById(ownerId, scanId);

  if (!scan) {
    throw createServiceError("Scan was not found.", 404, "SCAN_NOT_FOUND");
  }

  const reports = await reportRepository.listByScan(ownerId, scanId, {
    limit: 100,
    skip: 0,
  });

  const reportsByFormat = {
    json: null,
    html: null,
    pdf: null,
  };

  for (const report of reports) {
    if (
      Object.hasOwn(reportsByFormat, report.format) &&
      reportsByFormat[report.format] === null
    ) {
      reportsByFormat[report.format] = report;
    }
  }

  return {
    scanId: String(scanId),
    reports: reportsByFormat,
  };
};

export { createReport, getReport, getReportsByScan };
