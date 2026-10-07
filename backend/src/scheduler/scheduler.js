import {
  listScheduledScans,
  enqueueScheduledScan
} from "./scheduledScan.service.js";

let timer = null;
let running = false;

const executeDueSchedules = async () => {
  if (running) {
    return;
  }

  running = true;

  try {
    const schedules =
      listScheduledScans();

    const now = Date.now();

    for (const schedule of schedules) {
      if (!schedule.enabled) {
        continue;
      }

      const nextRun =
        schedule.nextRunAt?.getTime();

      if (
        !nextRun ||
        nextRun > now
      ) {
        continue;
      }

      try {
        await enqueueScheduledScan(
          schedule
        );
      } catch (error) {
        console.error(
          JSON.stringify({
            event:
              "scheduled_scan.enqueue_failed",
            scheduleId:
              schedule.scheduleId,
            error:
              error.message
          })
        );
      }
    }
  } finally {
    running = false;
  }
};

const startScheduler = ({
  intervalMs = 30_000
} = {}) => {
  if (timer) {
    return;
  }

  timer = setInterval(
    () => {
      void executeDueSchedules();
    },
    intervalMs
  );

  timer.unref?.();

  void executeDueSchedules();
};

const stopScheduler = () => {
  if (!timer) {
    return;
  }

  clearInterval(timer);
  timer = null;
};

export {
  startScheduler,
  stopScheduler,
  executeDueSchedules
};