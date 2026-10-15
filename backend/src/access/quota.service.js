// STATUS: UPDATED

import { getPlan, getPlanName } from "./plan.service.js";

const getQuotaPeriod = (planName) => {
  const plan = getPlan(planName);

  if (Number.isInteger(plan.dailyScanLimit)) {
    return "daily";
  }

  if (Number.isInteger(plan.monthlyScanLimit)) {
    return "monthly";
  }

  return "unlimited";
};

const getQuotaLimit = (planName) => {
  const plan = getPlan(planName);

  if (Number.isInteger(plan.dailyScanLimit)) {
    return plan.dailyScanLimit;
  }

  if (Number.isInteger(plan.monthlyScanLimit)) {
    return plan.monthlyScanLimit;
  }

  return null;
};

const getQuotaWindow = (planName, now = new Date()) => {
  const period = getQuotaPeriod(planName);

  if (period === "daily") {
    const start = new Date(now);

    start.setUTCHours(0, 0, 0, 0);

    const end = new Date(start);

    end.setUTCDate(end.getUTCDate() + 1);

    return {
      period,
      start,
      end,
    };
  }

  if (period === "monthly") {
    const start = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
    );

    const end = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1),
    );

    return {
      period,
      start,
      end,
    };
  }

  return {
    period: "unlimited",
    start: null,
    end: null,
  };
};

const getQuotaStatus = ({ planName, used = 0 }) => {
  const normalizedPlanName = getPlanName(planName);

  const limit = getQuotaLimit(normalizedPlanName);

  const period = getQuotaPeriod(normalizedPlanName);

  if (limit === null) {
    return {
      plan: normalizedPlanName,
      period,
      used,
      limit: null,
      remaining: null,
      exceeded: false,
    };
  }

  const safeUsed = Number.isInteger(used) && used >= 0 ? used : 0;

  const remaining = Math.max(limit - safeUsed, 0);

  return {
    plan: normalizedPlanName,
    period,
    used: safeUsed,
    limit,
    remaining,
    exceeded: safeUsed >= limit,
  };
};

const assertQuotaAvailable = ({ planName, used = 0 }) => {
  const status = getQuotaStatus({
    planName,
    used,
  });

  if (status.exceeded) {
    const error = new Error(`${status.period} scan quota has been exceeded.`);

    error.statusCode = 429;
    error.code = "SCAN_QUOTA_EXCEEDED";

    error.quota = {
      period: status.period,
      used: status.used,
      limit: status.limit,
      remaining: status.remaining,
    };

    throw error;
  }

  return status;
};

const assertConcurrentScanAvailable = ({ planName, activeScans = 0 }) => {
  const plan = getPlan(planName);

  const safeActiveScans =
    Number.isInteger(activeScans) && activeScans >= 0 ? activeScans : 0;

  const limit = plan.maxConcurrentScans;

  if (limit !== null && safeActiveScans >= limit) {
    const error = new Error(
      "The maximum number of concurrent scans has been reached.",
    );

    error.statusCode = 429;
    error.code = "CONCURRENT_SCAN_LIMIT_EXCEEDED";

    error.quota = {
      activeScans: safeActiveScans,
      limit,
    };

    throw error;
  }

  return {
    activeScans: safeActiveScans,
    limit,
    remaining: limit === null ? null : Math.max(limit - safeActiveScans, 0),
  };
};

export {
  getQuotaPeriod,
  getQuotaLimit,
  getQuotaWindow,
  getQuotaStatus,
  assertQuotaAvailable,
  assertConcurrentScanAvailable,
};
