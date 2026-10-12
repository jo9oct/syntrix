
import mongoose from 'mongoose';
import { createHmac } from 'node:crypto';

mongoose.set('autoIndex', false);

const { connectDatabase } = await import('../src/config/database.js');
const { default: CrawlPage } = await import(
  '../src/database/models/crawlPage.model.js'
);

const APPLY = process.argv.includes('--apply');
const SECRET = process.env.CRAWL_PAGE_KEY_SECRET;

const OLD_INDEX = 'scanId_1_url_1';
const NEW_INDEX = 'scanId_1_pageKey_1';

const requireSecret = () => {
  if (typeof SECRET !== 'string' || Buffer.byteLength(SECRET, 'utf8') < 32) {
    throw new Error(
      'CRAWL_PAGE_KEY_SECRET must be configured with at least 32 bytes.',
    );
  }
};

const canonicalize = (value) => {
  const url = new URL(value);

  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error(`Unsupported URL protocol in record ${value}`);
  }

  url.hash = '';
  url.username = '';
  url.password = '';

  const pairs = [...url.searchParams.entries()].sort(
    ([keyA, valueA], [keyB, valueB]) =>
      keyA.localeCompare(keyB) || valueA.localeCompare(valueB),
  );

  url.search = '';

  for (const [key, parameterValue] of pairs) {
    url.searchParams.append(key, parameterValue);
  }

  return url.toString();
};

const hmac = (value) =>
  createHmac('sha256', SECRET).update(value, 'utf8').digest('hex');

const main = async () => {
  requireSecret();

  const connection = await connectDatabase();

  try {
    const collection = CrawlPage.collection;
    const total = await collection.countDocuments();
    const missing = await collection.countDocuments({
      $or: [
        { pageKey: { $exists: false } },
        { pageKey: null },
        { pageKey: '' },
      ],
    });

    const indexes = await collection.indexes();
    const oldIndex = indexes.find((index) => index.name === OLD_INDEX);
    const newIndex = indexes.find((index) => index.name === NEW_INDEX);

    console.log('Database:', connection.name);
    console.log('Collection:', collection.collectionName);
    console.log('Total records:', total);
    console.log('Records requiring backfill:', missing);
    console.log('Old unique index exists:', Boolean(oldIndex));
    console.log('New unique index exists:', Boolean(newIndex));
    console.log('Mode:', APPLY ? 'APPLY' : 'DRY RUN');

    if (!APPLY) {
      console.log('Dry run complete. No documents or indexes were changed.');
      return;
    }

    if (!oldIndex && !newIndex) {
      throw new Error(
        'Neither the expected old nor new index exists. Stopping safely.',
      );
    }

    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupName = `crawlpages_backup_${stamp}`;

    console.log('Creating backup collection:', backupName);

    await collection
      .aggregate([{ $match: {} }, { $out: backupName }])
      .toArray();

    const backupCount = await mongoose.connection.db
      .collection(backupName)
      .countDocuments();

    if (backupCount !== total) {
      throw new Error(
        `Backup verification failed: expected ${total}, found ${backupCount}.`,
      );
    }

    console.log('Backup verified:', backupCount, 'records');

    const records = await collection
      .find({
        $or: [
          { pageKey: { $exists: false } },
          { pageKey: null },
          { pageKey: '' },
        ],
      })
      .project({ _id: 1, url: 1 })
      .toArray();

    const operations = records.map((record) => {
      const canonicalUrl = canonicalize(record.url);

      // The old URL is redacted, so do not pretend this recovers its
      // original identity. The record ID guarantees a unique legacy key.
      const pageKey = hmac(`legacy-migration:${record._id}:${canonicalUrl}`);

      return {
        updateOne: {
          filter: { _id: record._id, pageKey: { $exists: false } },
          update: { $set: { pageKey } },
        },
      };
    });

    // Records with null or empty keys also need a backfill.
    const normalizedOperations = operations.map((operation) => {
      const id = operation.updateOne.filter._id;
      const record = records.find(
        (candidate) => String(candidate._id) === String(id),
      );

      return {
        updateOne: {
          filter: { _id: id },
          update: operation.updateOne.update,
        },
      };
    });

    if (normalizedOperations.length > 0) {
      await collection.bulkWrite(normalizedOperations, { ordered: true });
    }

    const stillMissing = await collection.countDocuments({
      $or: [
        { pageKey: { $exists: false } },
        { pageKey: null },
        { pageKey: '' },
      ],
    });

    if (stillMissing !== 0) {
      throw new Error(
        `${stillMissing} records still lack pageKey. The old index was not removed.`,
      );
    }

    const duplicates = await collection
      .aggregate([
        {
          $group: {
            _id: { scanId: '$scanId', pageKey: '$pageKey' },
            count: { $sum: 1 },
          },
        },
        { $match: { count: { $gt: 1 } } },
        { $limit: 10 },
      ])
      .toArray();

    if (duplicates.length > 0) {
      throw new Error(
        `Duplicate page keys found: ${JSON.stringify(duplicates)}`,
      );
    }

    if (!newIndex) {
      await collection.createIndex(
        { scanId: 1, pageKey: 1 },
        { unique: true, name: NEW_INDEX },
      );
    }

    // Drop the old index only after backfill, validation and new-index
    // creation have succeeded.
    const refreshedIndexes = await collection.indexes();

    if (refreshedIndexes.some((index) => index.name === OLD_INDEX)) {
      await collection.dropIndex(OLD_INDEX);
    }

    console.log('Migration completed successfully.');
    console.log('Backfilled records:', records.length);
    console.log('Backup collection:', backupName);
    console.log('New unique index:', NEW_INDEX);
  } finally {
    await mongoose.disconnect();
  }
};

main().catch((error) => {
  console.error('Migration failed:', error.message);
  process.exitCode = 1;
});
