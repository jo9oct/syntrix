import { Worker } from "bullmq";

import environment from "../config/environment.js";
import {
  notificationQueue,
  redisConnection
} from "../config/queue.js";
import {
  NOTIFICATION_CHANNELS
} from "../notifications/notification.constants.js";
import {
  sendEmail
} from "../notifications/email.notification.js";

const NOTIFICATION_JOB_NAME =
  "security-notification";

const enqueueNotificationJob = async ({
  ownerId,
  type,
  payload = {}
}) => {
  if (!ownerId) {
    throw new Error(
      "ownerId is required to enqueue a notification job."
    );
  }

  if (!type) {
    throw new Error(
      "Notification type is required."
    );
  }

  return notificationQueue.add(
    NOTIFICATION_JOB_NAME,
    {
      ownerId,
      type,
      payload
    }
  );
};

const processNotificationJob =
  async (job) => {
    const {
      ownerId,
      type,
      payload = {}
    } = job.data;

    if (!ownerId || !type) {
      throw new Error(
        "Invalid notification job payload."
      );
    }

    const {
      channel =
        NOTIFICATION_CHANNELS.EMAIL,
      recipient,
      data = {}
    } = payload;

    if (
      channel ===
      NOTIFICATION_CHANNELS.EMAIL
    ) {
      if (!recipient) {
        return {
          status: "skipped",
          reason:
            "No email recipient configured.",
          ownerId,
          type
        };
      }

      const email =
        await sendEmail({
          recipient,
          subject:
            `Security Assessment: ${type}`,
          text: JSON.stringify(
            data,
            null,
            2
          )
        });

      return {
        status: email.status,
        ownerId,
        type,
        channel
      };
    }

    throw new Error(
      `Unsupported notification channel: ${channel}`
    );
  };

const createNotificationWorker =
  () =>
    new Worker(
      environment.queue
        .notificationName,
      processNotificationJob,
      {
        connection:
          redisConnection,
        concurrency: 1
      }
    );

export {
  NOTIFICATION_JOB_NAME,
  enqueueNotificationJob,
  processNotificationJob,
  createNotificationWorker
};