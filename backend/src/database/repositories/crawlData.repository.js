// STATUS: UPDATED
// File: src/database/repositories/crawlData.repository.js

import CrawlData from "../models/crawlData.model.js";

const TERMINAL_STATUSES = ["completed", "failed", "cancelled"];

const startSession = async ({
  ownerId,
  scanId,
  targetUrl,
  plan,
  maxPaths,
  maxDepth,
  requestsPerSecond,
}) => {
  if (!ownerId || !scanId) {
    const error = new Error(
      "ownerId and scanId are required to start a crawl session.",
    );

    error.code = "CRAWL_SESSION_ARGUMENTS_REQUIRED";
    error.statusCode = 400;

    throw error;
  }

  return CrawlData.findOneAndUpdate(
    {
      ownerId,
      scanId,
      status: {
        $nin: TERMINAL_STATUSES,
      },
    },
    {
      $set: {
        targetUrl,
        plan,
        maxPaths,
        maxDepth,
        requestsPerSecond,
        status: "running",
        pagesAttempted: 0,
        pagesSucceeded: 0,
        pagesFailed: 0,
        startedAt: new Date(),
        completedAt: null,
        errorCode: null,
      },
    },
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
      runValidators: true,
    },
  ).lean();
};

const incrementPageCount = async ({ ownerId, scanId, succeeded }) =>
  CrawlData.updateOne(
    {
      ownerId,
      scanId,
      status: "running",
    },
    {
      $inc: {
        pagesAttempted: 1,
        [succeeded ? "pagesSucceeded" : "pagesFailed"]: 1,
      },
    },
  );

const finishSession = async ({ ownerId, scanId, status, errorCode = null }) => {
  if (!TERMINAL_STATUSES.includes(status)) {
    const error = new Error(
      "A crawl session must finish with a terminal status.",
    );

    error.code = "INVALID_CRAWL_TERMINAL_STATUS";
    error.statusCode = 400;

    throw error;
  }

  return CrawlData.findOneAndUpdate(
    {
      ownerId,
      scanId,
      status: "running",
    },
    {
      $set: {
        status,
        errorCode,
        completedAt: new Date(),
      },
    },
    {
      new: true,
      runValidators: true,
    },
  ).lean();
};

const findByScan = async ({ ownerId, scanId }) =>
  CrawlData.findOne({
    ownerId,
    scanId,
  }).lean();

/*
 * Permanently remove crawl-session records belonging to one scan.
 * Both identifiers are required to prevent broad or cross-owner deletion.
 */
const deleteByScan = async (ownerId, scanId) => {
  if (!ownerId || !scanId) {
    const error = new Error(
      "ownerId and scanId are required to delete crawl data.",
    );

    error.code = "CRAWL_DELETE_ARGUMENTS_REQUIRED";
    error.statusCode = 400;

    throw error;
  }

  return CrawlData.deleteMany({
    ownerId,
    scanId,
  });
};

export {
  startSession,
  incrementPageCount,
  finishSession,
  findByScan,
  deleteByScan,
};
