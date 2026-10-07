import {
  getScanMetrics
} from "./scan.metrics.js";
import {
  getSystemMetrics
} from "./system.metrics.js";

const getMetrics = () => ({
  timestamp:
    new Date().toISOString(),
  scan:
    getScanMetrics(),
  system:
    getSystemMetrics()
});

export {
  getMetrics
};