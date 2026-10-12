// STATUS: CREATED

import CrawlData from '../models/crawlData.model.js';

const startSession = async ({
  ownerId,
  scanId,
  targetUrl,
  plan,
  maxPaths,
  maxDepth,
  requestsPerSecond,
}) =>
  CrawlData.findOneAndUpdate(
    {
      ownerId,
      scanId,
    },
    {
      $set: {
        targetUrl,
        plan,
        maxPaths,
        maxDepth,
        requestsPerSecond,
        status: 'running',
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

const incrementPageCount = async ({
  ownerId,
  scanId,
  succeeded,
}) =>
  CrawlData.updateOne(
    {
      ownerId,
      scanId,
    },
    {
      $inc: {
        pagesAttempted: 1,
        [succeeded
          ? 'pagesSucceeded'
          : 'pagesFailed']: 1,
      },
    },
  );

const finishSession = async ({
  ownerId,
  scanId,
  status,
  errorCode = null,
}) =>
  CrawlData.findOneAndUpdate(
    {
      ownerId,
      scanId,
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

const findByScan = async ({
  ownerId,
  scanId,
}) =>
  CrawlData.findOne({
    ownerId,
    scanId,
  }).lean();

export {
  startSession,
  incrementPageCount,
  finishSession,
  findByScan,
};