import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/sentrix';

export const connectDB = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log(`[Database] Connected to MongoDB at ${MONGODB_URI}`);
  } catch (error) {
    console.error('[Database] Connection error:', error);
    process.exit(1);
  }
};
