import { enqueueScanJob } from "../jobs/scan.job.js";

const scheduledScans = new Map();

const createScheduledScan = ({
  scheduleId,
  ownerId,
  targetId,
  target,
  selection,
  intervalMs,
  options = {},
}) => {
  if (!scheduleId) {
    throw new Error("scheduleId is required.");
  }

  if (!ownerId) {
    throw new Error("ownerId is required.");
  }

  if (!targetId) {
    throw new Error("targetId is required.");
  }

  if (!target?.url) {
    throw new Error("target.url is required.");
  }

  if (!selection) {
    throw new Error("scan selection is required.");
  }

  if (!Number.isInteger(intervalMs) || intervalMs < 60_000) {
    throw new Error("Scheduled scan interval must be at least 60 seconds.");
  }

  const schedule = {
    scheduleId,
    ownerId,
    targetId,
    target,
    selection,
    intervalMs,
    options,
    enabled: true,
    createdAt: new Date(),
    lastRunAt: null,
    nextRunAt: new Date(Date.now() + intervalMs),
  };

  scheduledScans.set(scheduleId, schedule);

  return schedule;
};

const getScheduledScan = (scheduleId) => scheduledScans.get(scheduleId) || null;

const removeScheduledScan = (scheduleId) => scheduledScans.delete(scheduleId);

const enqueueScheduledScan = async (schedule) => {
  if (!schedule?.enabled) {
    throw new Error("Scheduled scan is disabled.");
  }

  const scanId = `scheduled:${schedule.scheduleId}:${Date.now()}`;

  const job = await enqueueScanJob({
    ownerId: schedule.ownerId,
    scanId,
    targetId: schedule.targetId,
    target: schedule.target,
    selection: schedule.selection,
    options: schedule.options,
  });

  schedule.lastRunAt = new Date();

  schedule.nextRunAt = new Date(Date.now() + schedule.intervalMs);

  return job;
};

const listScheduledScans = () => Array.from(scheduledScans.values());

export {
  createScheduledScan,
  getScheduledScan,
  removeScheduledScan,
  enqueueScheduledScan,
  listScheduledScans,
};
