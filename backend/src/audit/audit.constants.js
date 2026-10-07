const AUDIT_ACTIONS = Object.freeze({
  SCAN_CREATED: "scan.created",
  SCAN_STARTED: "scan.started",
  SCAN_COMPLETED: "scan.completed",
  SCAN_FAILED: "scan.failed",
  SCAN_CANCELLED: "scan.cancelled",

  FINDING_VIEWED: "finding.viewed",
  FINDING_UPDATED: "finding.updated",

  REPORT_CREATED: "report.created",
  REPORT_GENERATED: "report.generated",
  REPORT_FAILED: "report.failed",

  SCHEDULE_CREATED:
    "schedule.created",
  SCHEDULE_EXECUTED:
    "schedule.executed"
});

const AUDIT_ACTOR_TYPES = Object.freeze({
  USER: "user",
  SYSTEM: "system",
  WORKER: "worker"
});

export {
  AUDIT_ACTIONS,
  AUDIT_ACTOR_TYPES
};