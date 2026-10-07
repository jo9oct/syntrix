import os from "node:os";
import process from "node:process";

const getSystemMetrics = () => {
  const memory = process.memoryUsage();

  return {
    process: {
      pid: process.pid,
      uptimeSeconds:
        Math.round(
          process.uptime()
        ),
      memory: {
        rss: memory.rss,
        heapTotal:
          memory.heapTotal,
        heapUsed:
          memory.heapUsed,
        external:
          memory.external,
        arrayBuffers:
          memory.arrayBuffers
      }
    },
    system: {
      platform:
        process.platform,
      architecture:
        process.arch,
      hostname:
        os.hostname(),
      cpuCount:
        os.cpus().length,
      loadAverage:
        os.loadavg()
    }
  };
};

export {
  getSystemMetrics
};