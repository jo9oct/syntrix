import {
  checkDatabaseHealth
} from "./database.health.js";
import {
  checkScannerHealth
} from "./scanner.health.js";

const getHealth = async () => {
  const [
    database,
    scanners
  ] = await Promise.all([
    checkDatabaseHealth(),
    checkScannerHealth()
  ]);

  const healthy =
    database.healthy &&
    scanners.healthy;

  return {
    status:
      healthy
        ? "healthy"
        : "degraded",

    timestamp:
      new Date().toISOString(),

    checks: {
      database,
      scanners
    }
  };
};

export {
  getHealth
};