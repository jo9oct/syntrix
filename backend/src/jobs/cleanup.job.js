// STATUS: UPDATED
// File: src/jobs/cleanup.job.js

import { Worker } from "bullmq";

import environment from "../config/environment.js";

import { cleanupQueue, redisConnection } from "../config/queue.js";

import { removeStoredReport } from "../reports/reportStorage.js";

import { cleanupGuestData } from "../services/guestCleanup.service.js";

import { purgeDeletedScan } from "../services/scanPurge.service.js";

const CLEANUP_JOB_NAME = "security-cleanup";

const SCAN_PURGE_RESOURCE = "scan-purge";

const createCleanupJobId = ({ resourceType, ownerId, resourceId }) => {
  if (resourceType === "guest-session" && ownerId) {
    return `guest-cleanup-${ownerId}`;
  }

  if (resourceType === SCAN_PURGE_RESOURCE && resourceId) {
    return `purge-scan-${resourceId}`;
  }

  return undefined;
};

const normalizeResourceType = (data = {}) => {
  if (data.resourceType) {
    return data.resourceType;
  }

  if (data.type === SCAN_PURGE_RESOURCE) {
    return SCAN_PURGE_RESOURCE;
  }

  return null;
};

const normalizeResourceId = (data = {}) =>
  data.resourceId ?? data.scanId ?? null;

const enqueueCleanupJob = async ({
  ownerId = null,
  resourceType,
  resourceId,
  metadata = {},
  delay = 0,
}) => {
  if (!resourceType) {
    throw new Error("resourceType is required for cleanup jobs.");
  }

  if (resourceType === SCAN_PURGE_RESOURCE && (!ownerId || !resourceId)) {
    throw new Error("ownerId and resourceId are required for scan-purge jobs.");
  }

  const normalizedDelay = Math.max(0, Number(delay) || 0);

  const jobId = createCleanupJobId({
    resourceType,
    ownerId,
    resourceId,
  });

  const options = {
    delay: normalizedDelay,
  };

  if (jobId) {
    options.jobId = jobId;
  }

  console.info(
    JSON.stringify({
      event: "cleanup.job.enqueue.started",
      queue: environment.queue.cleanupName,
      jobName: CLEANUP_JOB_NAME,
      ownerId,
      resourceType,
      resourceId: resourceId ?? null,
      jobId: jobId ?? null,
      delay: normalizedDelay,
    }),
  );

  try {
    const job = await cleanupQueue.add(
      CLEANUP_JOB_NAME,
      {
        ownerId,
        resourceType,
        resourceId: resourceId ?? null,
        metadata,
      },
      options,
    );

    console.info(
      JSON.stringify({
        event: "cleanup.job.enqueue.completed",
        queue: environment.queue.cleanupName,
        jobName: CLEANUP_JOB_NAME,
        jobId: job?.id ?? null,
        ownerId,
        resourceType,
        resourceId: resourceId ?? null,
        delay: normalizedDelay,
      }),
    );

    return job;
  } catch (error) {
    console.error(
      JSON.stringify({
        event: "cleanup.job.enqueue.failed",
        queue: environment.queue.cleanupName,
        jobName: CLEANUP_JOB_NAME,
        jobId: jobId ?? null,
        ownerId,
        resourceType,
        resourceId: resourceId ?? null,
        delay: normalizedDelay,
        error: {
          name: error?.name ?? null,
          message: error?.message ?? null,
          code: error?.code ?? null,
        },
      }),
    );

    throw error;
  }
};

const logCleanupCompleted = ({
  job,
  ownerId,
  resourceType,
  resourceId,
  result,
}) => {
  console.info(
    JSON.stringify({
      event: "cleanup.job.process.completed",
      jobId: job?.id ?? null,
      jobName: job?.name ?? null,
      ownerId,
      resourceType,
      resourceId: resourceId ?? null,
      result,
    }),
  );
};

const processCleanupJob = async (job) => {
  const data = job?.data ?? {};

  const ownerId = data.ownerId ?? null;
  const resourceType = normalizeResourceType(data);
  const resourceId = normalizeResourceId(data);
  const metadata = data.metadata ?? {};

  console.info(
    JSON.stringify({
      event: "cleanup.job.process.started",
      jobId: job?.id ?? null,
      jobName: job?.name ?? null,
      ownerId,
      resourceType,
      resourceId,
    }),
  );

  if (!resourceType) {
    throw new Error("Invalid cleanup job payload: resourceType is required.");
  }

  /*
   * Guest-session cleanup.
   */
  if (resourceType === "guest-session") {
    if (!ownerId) {
      throw new Error("ownerId is required for guest-session cleanup.");
    }

    const result = await cleanupGuestData({
      guestOwnerId: ownerId,
    });

    logCleanupCompleted({
      job,
      ownerId,
      resourceType,
      resourceId,
      result,
    });

    return {
      status: "completed",
      ownerId,
      resourceType,
      resourceId,
      result,
    };
  }

  /*
   * Individual report artifact cleanup.
   *
   * The report storage layer must validate that the public ID
   * belongs to the expected resource before deleting it.
   */
  if (resourceType === "report" && metadata.publicId) {
    const result = await removeStoredReport({
      publicId: metadata.publicId,
    });

    logCleanupCompleted({
      job,
      ownerId,
      resourceType,
      resourceId,
      result,
    });

    return {
      status: "completed",
      ownerId,
      resourceType,
      resourceId,
      result,
    };
  }

  /*
   * Permanent scan purge.
   *
   * The service must independently verify:
   * - ownerId and scanId match;
   * - the scan is still deleted;
   * - deletedAt is at least 90 days old;
   * - the scan has not been recovered;
   * - each artifact belongs exclusively to this scan.
   *
   * An early or stale cleanup job must never delete a scan.
   */
  if (resourceType === SCAN_PURGE_RESOURCE) {
    if (!ownerId || !resourceId) {
      throw new Error("ownerId and scanId are required for scan-purge jobs.");
    }

    const result = await purgeDeletedScan({
      ownerId,
      scanId: resourceId,
    });

    logCleanupCompleted({
      job,
      ownerId,
      resourceType,
      resourceId,
      result,
    });

    return {
      status: result?.status ?? "completed",
      ownerId,
      resourceType,
      resourceId,
      result,
    };
  }

  console.warn(
    JSON.stringify({
      event: "cleanup.job.process.skipped",
      jobId: job?.id ?? null,
      jobName: job?.name ?? null,
      ownerId,
      resourceType,
      resourceId,
      reason: "No cleanup handler registered for this resource.",
    }),
  );

  return {
    status: "skipped",
    ownerId,
    resourceType,
    resourceId,
    reason: "No cleanup handler registered for this resource.",
  };
};

const createCleanupWorker = () =>
  new Worker(environment.queue.cleanupName, processCleanupJob, {
    connection: redisConnection,
    concurrency: 1,
  });

export {
  CLEANUP_JOB_NAME,
  enqueueCleanupJob,
  processCleanupJob,
  createCleanupWorker,
};
