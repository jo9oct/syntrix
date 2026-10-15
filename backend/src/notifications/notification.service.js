import { enqueueNotificationJob } from "../jobs/notification.job.js";
import {
  NOTIFICATION_TYPES,
  NOTIFICATION_CHANNELS,
} from "./notification.constants.js";

const notify = async ({
  ownerId,
  type,
  channel = NOTIFICATION_CHANNELS.EMAIL,
  recipient = null,
  data = {},
}) => {
  if (!ownerId) {
    throw new Error("ownerId is required.");
  }

  if (!Object.values(NOTIFICATION_TYPES).includes(type)) {
    throw new Error(`Unsupported notification type: ${type}`);
  }

  if (!Object.values(NOTIFICATION_CHANNELS).includes(channel)) {
    throw new Error(`Unsupported notification channel: ${channel}`);
  }

  return enqueueNotificationJob({
    ownerId,
    type,
    payload: {
      channel,
      recipient,
      data,
    },
  });
};

const notifyScanStarted = ({ ownerId, scanId, recipient = null }) =>
  notify({
    ownerId,
    type: NOTIFICATION_TYPES.SCAN_STARTED,
    recipient,
    data: {
      scanId,
    },
  });

const notifyScanCompleted = ({
  ownerId,
  scanId,
  riskScore,
  recipient = null,
}) =>
  notify({
    ownerId,
    type: NOTIFICATION_TYPES.SCAN_COMPLETED,
    recipient,
    data: {
      scanId,
      riskScore,
    },
  });

const notifyScanFailed = ({ ownerId, scanId, error, recipient = null }) =>
  notify({
    ownerId,
    type: NOTIFICATION_TYPES.SCAN_FAILED,
    recipient,
    data: {
      scanId,
      error,
    },
  });

const notifyReportCompleted = ({
  ownerId,
  reportId,
  scanId,
  recipient = null,
}) =>
  notify({
    ownerId,
    type: NOTIFICATION_TYPES.REPORT_COMPLETED,
    recipient,
    data: {
      reportId,
      scanId,
    },
  });

const notifyReportFailed = ({
  ownerId,
  reportId,
  scanId,
  error,
  recipient = null,
}) =>
  notify({
    ownerId,
    type: NOTIFICATION_TYPES.REPORT_FAILED,
    recipient,
    data: {
      reportId,
      scanId,
      error,
    },
  });

export {
  notify,
  notifyScanStarted,
  notifyScanCompleted,
  notifyScanFailed,
  notifyReportCompleted,
  notifyReportFailed,
};
