import CrawlPage from '../models/crawlPage.model.js';

const upsertPage = async (page) => {
  if (
    !page ||
    !page.ownerId ||
    !page.scanId ||
    typeof page.pageKey !== 'string' ||
    !/^[a-f0-9]{64}$/i.test(page.pageKey)
  ) {
    throw new TypeError(
      'A valid ownerId, scanId and 64-character pageKey are required.',
    );
  }

  return CrawlPage.findOneAndUpdate(
    {
      ownerId: page.ownerId,
      scanId: page.scanId,
      pageKey: page.pageKey,
    },
    {
      $set: page,
    },
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
      runValidators: true,
    },
  ).lean();
};

const deleteByScan = async ({ ownerId, scanId }) =>
  CrawlPage.deleteMany({ ownerId, scanId });

const listByScan = async ({
  ownerId,
  scanId,
  limit = 50,
  skip = 0,
}) =>
  CrawlPage.find({ ownerId, scanId })
    .select('-pageKey')
    .sort({ depth: 1, url: 1, _id: 1 })
    .skip(skip)
    .limit(limit)
    .lean();

const listInputsByScan = async ({
  ownerId,
  scanId,
  limit = 50,
  skip = 0,
}) =>
  CrawlPage.find({
    ownerId,
    scanId,
    $or: [
      { inputs: { $exists: true, $ne: [] } },
      { forms: { $exists: true, $ne: [] } },
      { queryParameterNames: { $exists: true, $ne: [] } },
    ],
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
      statusCode: 1,
      createdAt: 1,
    })
    .sort({ depth: 1, url: 1, _id: 1 })
    .skip(skip)
    .limit(limit)
    .lean();

const countByScan = async ({ ownerId, scanId }) =>
  CrawlPage.countDocuments({ ownerId, scanId });

const countInputPagesByScan = async ({ ownerId, scanId }) =>
  CrawlPage.countDocuments({
    ownerId,
    scanId,
    $or: [
      { inputs: { $exists: true, $ne: [] } },
      { forms: { $exists: true, $ne: [] } },
      { queryParameterNames: { $exists: true, $ne: [] } },
    ],
  });

export {
  upsertPage,
  deleteByScan,
  listByScan,
  listInputsByScan,
  countByScan,
  countInputPagesByScan,
};