import mongoose from 'mongoose';
import { connectDatabase } from './src/config/database.js';
import CrawlPage from './src/database/models/crawlPage.model.js';

await connectDatabase();

try {
  const duplicates = await CrawlPage.aggregate([
    {
      $group: {
        _id: { scanId: '$scanId', url: '$url' },
        count: { $sum: 1 },
      },
    },
    { $match: { count: { $gt: 1 } } },
    { $limit: 20 },
  ]);

  console.log('Database:', mongoose.connection.name);
  console.log('Duplicate groups:', JSON.stringify(duplicates, null, 2));
  console.log(
    'Indexes:',
    JSON.stringify(await CrawlPage.collection.indexes(), null, 2),
  );
} finally {
  await mongoose.disconnect();
}
