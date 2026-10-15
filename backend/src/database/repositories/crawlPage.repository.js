// STATUS: UPDATED
// File: src/database/repositories/crawlPage.repository.js

import CrawlPage from "../models/crawlPage.model.js";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;
const MAX_SKIP = 100000;
const MAX_OPENAPI_ENDPOINTS = 500;

const normalizePagination = ({ limit, skip }) => {
  const normalizedLimit = limit === undefined ? DEFAULT_LIMIT : Number(limit);

  const normalizedSkip = skip === undefined ? 0 : Number(skip);

  if (
    !Number.isInteger(normalizedLimit) ||
    normalizedLimit < 1 ||
    normalizedLimit > MAX_LIMIT
  ) {
    throw new RangeError(
      `limit must be an integer between 1 and ${MAX_LIMIT}.`,
    );
  }

  if (
    !Number.isInteger(normalizedSkip) ||
    normalizedSkip < 0 ||
    normalizedSkip > MAX_SKIP
  ) {
    throw new RangeError(`skip must be an integer between 0 and ${MAX_SKIP}.`);
  }

  return { limit: normalizedLimit, skip: normalizedSkip };
};

const assertScanScope = ({ ownerId, scanId }) => {
  if (!ownerId || !scanId) {
    throw new TypeError("Both ownerId and scanId are required.");
  }
};

const inputPageFilter = {
  $or: [
    { inputs: { $exists: true, $ne: [] } },
    { forms: { $exists: true, $ne: [] } },
    { queryParameterNames: { $exists: true, $ne: [] } },
    { apiRequests: { $exists: true, $ne: [] } },
  ],
};

const upsertPage = async (page) => {
  if (
    !page ||
    !page.ownerId ||
    !page.scanId ||
    typeof page.pageKey !== "string" ||
    !/^[a-f0-9]{64}$/i.test(page.pageKey)
  ) {
    throw new TypeError(
      "A valid ownerId, scanId and 64-character pageKey are required.",
    );
  }

  return CrawlPage.findOneAndUpdate(
    {
      ownerId: page.ownerId,
      scanId: page.scanId,
      pageKey: page.pageKey,
    },
    { $set: page },
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
      runValidators: true,
    },
  ).lean();
};

const updateOpenApiEndpoints = async ({
  ownerId,
  scanId,
  pageKey,
  openApiEndpoints,
}) => {
  assertScanScope({ ownerId, scanId });

  if (typeof pageKey !== "string" || !/^[a-f0-9]{64}$/i.test(pageKey)) {
    throw new TypeError("A valid 64-character pageKey is required.");
  }

  if (
    !Array.isArray(openApiEndpoints) ||
    openApiEndpoints.length > MAX_OPENAPI_ENDPOINTS
  ) {
    throw new TypeError(
      `openApiEndpoints must be an array containing at most ${MAX_OPENAPI_ENDPOINTS} entries.`,
    );
  }

  return CrawlPage.findOneAndUpdate(
    { ownerId, scanId, pageKey },
    { $set: { openApiEndpoints } },
    {
      new: true,
      runValidators: true,
      upsert: false,
    },
  ).lean();
};

const deleteByScan = async ({ ownerId, scanId }) => {
  assertScanScope({ ownerId, scanId });
  return CrawlPage.deleteMany({ ownerId, scanId });
};

const listByScan = async ({
  ownerId,
  scanId,
  limit = DEFAULT_LIMIT,
  skip = 0,
}) => {
  assertScanScope({ ownerId, scanId });
  const pagination = normalizePagination({ limit, skip });

  return CrawlPage.find({ ownerId, scanId })
    .select("-pageKey")
    .sort({ depth: 1, url: 1, _id: 1 })
    .skip(pagination.skip)
    .limit(pagination.limit)
    .lean();
};

const listInputsByScan = async ({
  ownerId,
  scanId,
  limit = DEFAULT_LIMIT,
  skip = 0,
}) => {
  assertScanScope({ ownerId, scanId });
  const pagination = normalizePagination({ limit, skip });

  return CrawlPage.find({
    ownerId,
    scanId,
    ...inputPageFilter,
  })
    .select({
      _id: 1,
      ownerId: 1,
      scanId: 1,
      url: 1,
      depth: 1,
      forms: 1,
      inputs: 1,
      queryParameterNames: 1,
      apiRequests: 1,
      statusCode: 1,
      createdAt: 1,
    })
    .sort({ depth: 1, url: 1, _id: 1 })
    .skip(pagination.skip)
    .limit(pagination.limit)
    .lean();
};

const countByScan = async ({ ownerId, scanId }) => {
  assertScanScope({ ownerId, scanId });
  return CrawlPage.countDocuments({ ownerId, scanId });
};

const countInputPagesByScan = async ({ ownerId, scanId }) => {
  assertScanScope({ ownerId, scanId });

  return CrawlPage.countDocuments({
    ownerId,
    scanId,
    ...inputPageFilter,
  });
};

export {
  upsertPage,
  updateOpenApiEndpoints,
  deleteByScan,
  listByScan,
  listInputsByScan,
  countByScan,
  countInputPagesByScan,
};
