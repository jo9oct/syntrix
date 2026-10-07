import {
  Queue
} from "bullmq";
import IORedis from "ioredis";

import environment from "./environment.js";

const redisConnection =
  new IORedis(
    environment.redis.url,
    {
      maxRetriesPerRequest:
        null,
      enableReadyCheck:
        true,
      lazyConnect:
        false
    }
  );

const defaultJobOptions =
  Object.freeze({
    attempts:
      environment.queue
        .attempts,

    backoff: {
      type: "exponential",
      delay:
        environment.queue
          .backoffMs
    },

    removeOnComplete: {
      age:
        24 * 60 * 60,
      count: 1000
    },

    removeOnFail: {
      age:
        7 * 24 * 60 * 60,
      count: 5000
    }
  });

const createQueue = (
  name
) =>
  new Queue(name, {
    connection:
      redisConnection,
    defaultJobOptions
  });

const scanQueue =
  createQueue(
    environment.queue
      .scanName
  );

const reportQueue =
  createQueue(
    environment.queue
      .reportName
  );

const cleanupQueue =
  createQueue(
    environment.queue
      .cleanupName
  );

const notificationQueue =
  createQueue(
    environment.queue
      .notificationName
  );

const closeQueues =
  async () => {
    await Promise.all([
      scanQueue.close(),
      reportQueue.close(),
      cleanupQueue.close(),
      notificationQueue.close(),
      redisConnection.quit()
    ]);
  };

export {
  redisConnection,
  defaultJobOptions,
  scanQueue,
  reportQueue,
  cleanupQueue,
  notificationQueue,
  closeQueues
};