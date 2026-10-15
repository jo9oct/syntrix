const SCAN_STATUSES = Object.freeze([
  "pending",
  "running",
  "completed",
  "failed",
  "cancelled",
]);

const FINDING_SEVERITIES = Object.freeze([
  "critical",
  "high",
  "medium",
  "low",
  "info",
]);

const FINDING_CONFIDENCE = Object.freeze(["low", "medium", "high"]);

const FINDING_STATUSES = Object.freeze([
  "detected",
  "verified",
  "false_positive",
  "accepted",
  "resolved",
]);

const VERIFICATION_STATUSES = Object.freeze([
  "pending",
  "verified",
  "rejected",
  "inconclusive",
]);

const REPORT_FORMATS = Object.freeze(["json", "html", "pdf"]);

const REPORT_STATUSES = Object.freeze([
  "pending",
  "generating",
  "completed",
  "failed",
]);

const HTTP_METHODS = Object.freeze([
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "HEAD",
  "OPTIONS",
]);

const SCANNER_TYPES = Object.freeze(["recon", "security"]);

export {
  SCAN_STATUSES,
  FINDING_SEVERITIES,
  FINDING_CONFIDENCE,
  FINDING_STATUSES,
  VERIFICATION_STATUSES,
  REPORT_FORMATS,
  REPORT_STATUSES,
  HTTP_METHODS,
  SCANNER_TYPES,
};
