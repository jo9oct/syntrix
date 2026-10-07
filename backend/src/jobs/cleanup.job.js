// STATUS: UPDATED

import { Worker } from "bullmq";

import environment from "../config/environment.js";

import {
  cleanupQueue,
  redisConnection
} from "../config/queue.js";

import {
  removeStoredReport
} from "../reports/reportStorage.js";

import {
  cleanupGuestData
} from "../services/guestCleanup.service.js";

const CLEANUP_JOB_NAME =
  "security-cleanup";

const createCleanupJobId = ({
  resourceType,
  ownerId,
  resourceId
}) => {
  if (
    resourceType ===
      "guest-session" &&
    ownerId
  ) {
    return `guest-cleanup-${ownerId}`;
  }

  return undefined;
};

const enqueueCleanupJob = async ({
  ownerId = null,
  resourceType,
  resourceId,
  metadata = {},
  delay = 0
}) => {
  if (!resourceType) {
    throw new Error(
      "resourceType is required for cleanup jobs."
    );
  }

  const jobId =
    createCleanupJobId({
      resourceType,
      ownerId,
      resourceId
    });

  const normalizedDelay =
    Math.max(
      0,
      delay
    );

  const options = {
    delay:
      normalizedDelay
  };

  if (jobId) {
    options.jobId = jobId;
  }

  console.info(
    JSON.stringify({
      event:
        "cleanup.job.enqueue.started",
      queue:
        environment.queue
          .cleanupName,
      jobName:
        CLEANUP_JOB_NAME,
      ownerId,
      resourceType,
      resourceId:
        resourceId ?? null,
      jobId:
        jobId ?? null,
      delay:
        normalizedDelay
    })
  );

  try {
    const job =
      await cleanupQueue.add(
        CLEANUP_JOB_NAME,
        {
          ownerId,
          resourceType,
          resourceId:
            resourceId ?? null,
          metadata
        },
        options
      );

    console.info(
      JSON.stringify({
        event:
          "cleanup.job.enqueue.completed",
        queue:
          environment.queue
            .cleanupName,
        jobName:
          CLEANUP_JOB_NAME,
        jobId:
          job?.id ??
          null,
        ownerId,
        resourceType,
        resourceId:
          resourceId ?? null,
        delay:
          normalizedDelay
      })
    );

    return job;
  } catch (error) {
    console.error(
      JSON.stringify({
        event:
          "cleanup.job.enqueue.failed",
        queue:
          environment.queue
            .cleanupName,
        jobName:
          CLEANUP_JOB_NAME,
        jobId:
          jobId ?? null,
        ownerId,
        resourceType,
        resourceId:
          resourceId ?? null,
        delay:
          normalizedDelay,
        error: {
          name:
            error?.name ??
            null,
          message:
            error?.message ??
            null,
          code:
            error?.code ??
            null,
          stack:
            error?.stack ??
            null
        }
      })
    );

    throw error;
  }
};

const processCleanupJob = async (
  job
) => {
  const {
    ownerId,
    resourceType,
    resourceId,
    metadata = {}
  } = job.data;

  console.info(
    JSON.stringify({
      event:
        "cleanup.job.process.started",
      jobId:
        job?.id ??
        null,
      jobName:
        job?.name ??
        null,
      ownerId,
      resourceType,
      resourceId:
        resourceId ?? null
    })
  );

  if (!resourceType) {
    throw new Error(
      "Invalid cleanup job payload."
    );
  }

  if (
    resourceType ===
    "guest-session"
  ) {
    if (!ownerId) {
      throw new Error(
        "ownerId is required for guest-session cleanup."
      );
    }

    const result =
      await cleanupGuestData({
        guestOwnerId:
          ownerId
      });

    console.info(
      JSON.stringify({
        event:
          "cleanup.job.process.completed",
        jobId:
          job?.id ??
          null,
        jobName:
          job?.name ??
          null,
        ownerId,
        resourceType,
        resourceId:
          resourceId ?? null,
        result
      })
    );

    return {
      status: "completed",
      ownerId,
      resourceType,
      resourceId,
      result
    };
  }

  if (
    resourceType ===
      "report" &&
    metadata.publicId
  ) {
    const result =
      await removeStoredReport({
        publicId:
          metadata.publicId
      });

    console.info(
      JSON.stringify({
        event:
          "cleanup.job.process.completed",
        jobId:
          job?.id ??
          null,
        jobName:
          job?.name ??
          null,
        ownerId,
        resourceType,
        resourceId:
          resourceId ?? null,
        result
      })
    );

    return {
      status: "completed",
      ownerId,
      resourceType,
      resourceId,
      result
    };
  }

  console.warn(
    JSON.stringify({
      event:
        "cleanup.job.process.skipped",
      jobId:
        job?.id ??
        null,
      jobName:
        job?.name ??
        null,
      ownerId,
      resourceType,
      resourceId:
        resourceId ?? null,
      reason:
        "No cleanup handler registered for this resource."
    })
  );

  return {
    status: "skipped",
    ownerId,
    resourceType,
    resourceId,
    reason:
      "No cleanup handler registered for this resource."
  };
};

const createCleanupWorker =
  () =>
    new Worker(
      environment.queue.cleanupName,
      processCleanupJob,
      {
        connection:
          redisConnection,
        concurrency: 1
      }
    );

export {
  CLEANUP_JOB_NAME,
  enqueueCleanupJob,
  processCleanupJob,
  createCleanupWorker
};