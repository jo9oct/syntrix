const NOTIFICATION_TYPES = Object.freeze({
  SCAN_STARTED: "scan.started",
  SCAN_COMPLETED: "scan.completed",
  SCAN_FAILED: "scan.failed",
  REPORT_COMPLETED: "report.completed",
  REPORT_FAILED: "report.failed",
  SCHEDULED_SCAN_STARTED: "scheduled_scan.started",
  SCHEDULED_SCAN_FAILED: "scheduled_scan.failed"
});

const NOTIFICATION_CHANNELS = Object.freeze({
  EMAIL: "email"
});

export {
  NOTIFICATION_TYPES,
  NOTIFICATION_CHANNELS
};