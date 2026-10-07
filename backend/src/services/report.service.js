// STATUS: UPDATED

import * as reportRepository
  from "../database/repositories/report.repository.js";

import * as scanRepository
  from "../database/repositories/scan.repository.js";

import {
  enqueueReportJob
} from "../jobs/report.job.js";

const assertReportAccess = ({
  userType
}) => {
  if (
    userType === "guest"
  ) {
    const error = new Error(
      "Report generation is not available for guest sessions."
    );

    error.statusCode = 403;
    error.code =
      "GUEST_REPORT_NOT_ALLOWED";

    throw error;
  }
};

const createReport = async ({
  ownerId,
  userType = "user",
  scanId,
  format,
  aiAnalysis = null
}) => {
  assertReportAccess({
    userType
  });

  if (!ownerId) {
    throw new Error(
      "ownerId is required."
    );
  }

  if (!scanId) {
    throw new Error(
      "scanId is required."
    );
  }

  if (!format) {
    throw new Error(
      "Report format is required."
    );
  }

  const scan =
    await scanRepository.findById(
      ownerId,
      scanId
    );

  if (!scan) {
    throw new Error(
      "Scan was not found."
    );
  }

  const existingReport =
    await reportRepository.findExisting(
      ownerId,
      scanId,
      format
    );

  if (existingReport) {
    return {
      report:
        existingReport,

      queued: false,

      duplicated: true
    };
  }

  const report =
    await reportRepository.create({
      ownerId,
      scanId,
      format,
      status: "pending"
    });

  if (!report) {
    throw new Error(
      "Report could not be created."
    );
  }

  try {
    await enqueueReportJob({
      ownerId,
      reportId:
        report._id,
      scanId,
      format,
      aiAnalysis
    });
  } catch (error) {
    await reportRepository.markFailed(
      ownerId,
      report._id,
      error.code ||
        "REPORT_QUEUE_FAILED",
      error.message
    );

    throw error;
  }

  return {
    report,

    queued: true,

    duplicated: false
  };
};

const getReport = async ({
  ownerId,
  userType = "user",
  reportId
}) => {
  assertReportAccess({
    userType
  });

  if (!ownerId) {
    throw new Error(
      "ownerId is required."
    );
  }

  if (!reportId) {
    throw new Error(
      "reportId is required."
    );
  }

  const report =
    await reportRepository.findById(
      ownerId,
      reportId
    );

  if (!report) {
    throw new Error(
      "Report was not found."
    );
  }

  return report;
};

export {
  createReport,
  getReport
};