import mongoose from 'mongoose';

import environment from './environment.js';

const getMongoUri = () => {
  const uri =
    environment.database?.uri ??
    environment.mongoUri ??
    environment.mongodb?.uri ??
    process.env.MONGODB_URI ??
    process.env.MONGO_URI;

  if (
    typeof uri !== 'string' ||
    !uri.trim()
  ) {
    throw new Error(
      'MongoDB connection URI is not configured.',
    );
  }

  return uri.trim();
};

const connectDatabase = async () => {
  const uri = getMongoUri();

  mongoose.set(
    'strictQuery',
    true,
  );

  await mongoose.connect(
    uri,
    {
      serverSelectionTimeoutMS:
        environment.database
          ?.serverSelectionTimeoutMs ??
        10000,

      maxPoolSize:
        environment.database
          ?.maxPoolSize ??
        20,

      minPoolSize:
        environment.database
          ?.minPoolSize ??
        2,
    },
  );

  return mongoose.connection;
};

const disconnectDatabase =
  async () => {
    if (
      mongoose.connection
        .readyState === 0
    ) {
      return;
    }

    await mongoose.disconnect();
  };

const getDatabaseStatus = () => {
  const states = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };

  return {
    state:
      states[
        mongoose.connection
          .readyState
      ] ?? 'unknown',

    readyState:
      mongoose.connection
        .readyState,

    name:
      mongoose.connection
        .name || null,

    host:
      mongoose.connection
        .host || null,
  };
};

const isDatabaseConnected =
  () => {
    return (
      mongoose.connection
        .readyState === 1
    );
  };

export {
  connectDatabase,
  disconnectDatabase,
  getDatabaseStatus,
  isDatabaseConnected,
};