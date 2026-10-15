// STATUS: UPDATED

import { Worker } from "bullmq";

import environment from "../config/environment.js";

import { redisConnection, reportQueue } from "../config/queue.js";

import { generateReport } from "../reports/reportService.js";

const REPORT_JOB_NAME = "security-report";

const toError = (value) => {
  if (value instanceof Error) {
    return value;
  }

  if (value && typeof value === "object") {
    const error = new Error(value.message || JSON.stringify(value));

    if (value.name) {
      error.name = value.name;
    }

    if (value.code) {
      error.code = value.code;
    }

    if (value.stack) {
      error.stack = value.stack;
    }

    return error;
  }

  return new Error(String(value));
};

const enqueueReportJob = async ({
  ownerId,
  reportId,
  scanId,
  format,
  aiAnalysis = null,
}) => {
  if (!ownerId) {
    throw new Error("ownerId is required to enqueue a report job.");
  }

  if (!reportId) {
    throw new Error("reportId is required to enqueue a report job.");
  }

  if (!scanId) {
    throw new Error("scanId is required to enqueue a report job.");
  }

  if (!format) {
    throw new Error("Report format is required.");
  }

  return reportQueue.add(
    REPORT_JOB_NAME,
    {
      ownerId,
      reportId,
      scanId,
      format,
      aiAnalysis,
    },
    {
      jobId: `report-${reportId}`,
    },
  );
};

const processReportJob = async (job) => {
  const { ownerId, reportId, scanId, format, aiAnalysis = null } = job.data;

  if (!ownerId || !reportId || !scanId || !format) {
    throw new Error("Invalid report job payload.");
  }

  try {
    return await generateReport({
      ownerId,
      reportId,
      scanId,
      format,
      aiAnalysis,
    });
  } catch (rawError) {
    const error = toError(rawError);

    console.error(
      JSON.stringify({
        event: "report.generation.failed",
        reportId,
        scanId,
        format,
        error: {
          name: error.name || null,
          message: error.message || null,
          code: error.code || null,
          stack: error.stack || null,
        },
      }),
    );

    try {
      const reportRepository =
        await import("../database/repositories/report.repository.js");

      await reportRepository.markFailed(
        ownerId,
        reportId,
        error.code || "REPORT_GENERATION_FAILED",
        error.message || "Report generation failed.",
      );
    } catch (markFailedError) {
      const failure = toError(markFailedError);

      console.error(
        JSON.stringify({
          event: "report.markFailed.failed",
          reportId,
          error: {
            name: failure.name || null,
            message: failure.message || null,
            code: failure.code || null,
            stack: failure.stack || null,
          },
        }),
      );
    }

    throw error;
  }
};

const createReportWorker = () =>
  new Worker(environment.queue.reportName, processReportJob, {
    connection: redisConnection,
    concurrency: 1,
  });

export {
  REPORT_JOB_NAME,
  enqueueReportJob,
  processReportJob,
  createReportWorker,
};
