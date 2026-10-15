import mongoose from "mongoose";

const checkDatabaseHealth = async () => {
  const readyState = mongoose.connection.readyState;

  if (readyState !== 1) {
    return {
      healthy: false,
      state: readyState,
    };
  }

  try {
    await mongoose.connection.db.admin().ping();

    return {
      healthy: true,
      state: readyState,
    };
  } catch (error) {
    return {
      healthy: false,
      state: readyState,
      error: error.message,
    };
  }
};

export { checkDatabaseHealth };
