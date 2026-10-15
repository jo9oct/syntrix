import mongoose from "mongoose";

import { getDatabaseConfig } from "../config/database.js";

let connectionPromise = null;

const connectDatabase = async () => {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (connectionPromise) {
    return connectionPromise;
  }

  const config = getDatabaseConfig();

  connectionPromise = mongoose
    .connect(config.uri, config.options)
    .then(() => mongoose.connection)
    .catch((error) => {
      connectionPromise = null;
      throw error;
    });

  return connectionPromise;
};

const disconnectDatabase = async () => {
  connectionPromise = null;

  if (mongoose.connection.readyState === 0) {
    return;
  }

  await mongoose.disconnect();
};

const getDatabaseState = () => ({
  readyState: mongoose.connection.readyState,
  connected: mongoose.connection.readyState === 1,
  connecting: mongoose.connection.readyState === 2,
  disconnecting: mongoose.connection.readyState === 3,
});

export { connectDatabase, disconnectDatabase, getDatabaseState };
