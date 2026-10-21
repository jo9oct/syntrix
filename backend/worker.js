// STATUS: UPDATED
// FILE: worker.js

import mongoose from "mongoose";

import environment from "./src/config/environment.js";
import { connectDatabase } from "./src/config/database.js";
import { closeQueues } from "./src/config/queue.js";

import { createScanWorker } from "./src/jobs/scan.job.js";
import { createCleanupWorker } from "./src/jobs/cleanup.job.js";
import { createNotificationWorker } from "./src/jobs/notification.job.js";
import { createReportWorker } from "./src/jobs/report.job.js";

import { startScheduler, stopScheduler } from "./src/scheduler/scheduler.js";

const workers = [];

let shuttingDown = false;

const registerWorkerLogging = (worker, name) => {
  worker.on("completed", (job) => {
    console.info(
      JSON.stringify({
        event: "job.completed",
        worker: name,
        jobId: job.id,
        jobName: job.name,
      }),
    );
  });

  worker.on("failed", (job, error) => {
    console.error(
      JSON.stringify({
        event: "job.failed",
        worker: name,
        jobId: job?.id ?? null,
        jobName: job?.name ?? null,
        error: {
          name: error?.name ?? null,
          message: error?.message ?? null,
          code: error?.code ?? null,
          stack: error?.stack ?? null,
        },
      }),
    );
  });

  worker.on("error", (error) => {
    console.error(
      JSON.stringify({
        event: "worker.error",
        worker: name,
        error: {
          name: error?.name ?? null,
          message: error?.message ?? null,
          code: error?.code ?? null,
          stack: error?.stack ?? null,
        },
      }),
    );
  });

  worker.on("stalled", (jobId) => {
    console.warn(
      JSON.stringify({
        event: "job.stalled",
        worker: name,
        jobId,
      }),
    );
  });
};

const startWorker = async () => {
  await connectDatabase();

  const scanWorker = createScanWorker();
  const cleanupWorker = createCleanupWorker();
  const notificationWorker = createNotificationWorker();
  const reportWorker = createReportWorker();

  workers.push(scanWorker, cleanupWorker, notificationWorker, reportWorker);

  registerWorkerLogging(scanWorker, "scan");
  registerWorkerLogging(cleanupWorker, "cleanup");
  registerWorkerLogging(notificationWorker, "notification");
  registerWorkerLogging(reportWorker, "report");

  startScheduler();

  console.info(
    JSON.stringify({
      event: "worker.started",
      environment: environment.nodeEnv,
      workers: [
        environment.queue.scanName,
        environment.queue.cleanupName,
        environment.queue.notificationName,
        environment.queue.reportName,
      ],
    }),
  );
};

const shutdown = async (signal) => {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;

  console.info(
    JSON.stringify({
      event: "worker.shutdown.started",
      signal,
    }),
  );

  try {
    stopScheduler();

    await Promise.all(workers.map((worker) => worker.close()));

    await closeQueues();

    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }

    console.info(
      JSON.stringify({
        event: "worker.shutdown.completed",
      }),
    );

    process.exit(0);
  } catch (error) {
    console.error(
      JSON.stringify({
        event: "worker.shutdown.failed",
        error: {
          name: error?.name ?? null,
          message: error?.message ?? null,
          code: error?.code ?? null,
          stack: error?.stack ?? null,
        },
      }),
    );

    process.exit(1);
  }
};

process.on("SIGTERM", () => {
  void shutdown("SIGTERM");
});

process.on("SIGINT", () => {
  void shutdown("SIGINT");
});

process.on("uncaughtException", (error) => {
  console.error(
    JSON.stringify({
      event: "worker.uncaughtException",
      error: error?.message ?? null,
      stack: error?.stack ?? null,
    }),
  );

  void shutdown("uncaughtException");
});

process.on("unhandledRejection", (reason) => {
  const message = reason instanceof Error ? reason.message : String(reason);

  const stack = reason instanceof Error ? reason.stack : null;

  console.error(
    JSON.stringify({
      event: "worker.unhandledRejection",
      error: message,
      stack,
    }),
  );

  void shutdown("unhandledRejection");
});

startWorker().catch((error) => {
  console.error(
    JSON.stringify({
      event: "worker.start.failed",
      error: error?.message ?? null,
      stack: error?.stack ?? null,
    }),
  );

  process.exit(1);
});
