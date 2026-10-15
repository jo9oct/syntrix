const scanMetrics = {
  started: 0,
  completed: 0,
  failed: 0,
  cancelled: 0,
  findings: 0,
  durationMs: 0,
};

const recordScanStarted = () => {
  scanMetrics.started += 1;
};

const recordScanCompleted = ({ durationMs = 0, findingCount = 0 } = {}) => {
  scanMetrics.completed += 1;
  scanMetrics.durationMs += Number(durationMs) || 0;
  scanMetrics.findings += Number(findingCount) || 0;
};

const recordScanFailed = () => {
  scanMetrics.failed += 1;
};

const recordScanCancelled = () => {
  scanMetrics.cancelled += 1;
};

const getScanMetrics = () => ({
  ...scanMetrics,
  averageDurationMs:
    scanMetrics.completed > 0
      ? Math.round(scanMetrics.durationMs / scanMetrics.completed)
      : 0,
});

const resetScanMetrics = () => {
  scanMetrics.started = 0;
  scanMetrics.completed = 0;
  scanMetrics.failed = 0;
  scanMetrics.cancelled = 0;
  scanMetrics.findings = 0;
  scanMetrics.durationMs = 0;
};

export {
  recordScanStarted,
  recordScanCompleted,
  recordScanFailed,
  recordScanCancelled,
  getScanMetrics,
  resetScanMetrics,
};
