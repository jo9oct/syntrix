
import { spawn } from "node:child_process";

const processes = new Map();

let shuttingDown = false;
let exitCode = 0;
let forceShutdownTimer;

function shutdown(signal, code = 0) {
  if (shuttingDown) return;

  shuttingDown = true;
  exitCode = code;

  console.log(`[STARTUP] Shutting down processes: ${signal}`);

  forceShutdownTimer = setTimeout(() => {
    for (const child of processes.values()) {
      child.kill("SIGKILL");
    }
  }, 10_000);

  forceShutdownTimer.unref();

  for (const child of processes.values()) {
    child.kill(signal);
  }

  if (processes.size === 0) {
    clearTimeout(forceShutdownTimer);
    process.exit(exitCode);
  }
}

function startProcess(name, args) {
  const child = spawn(process.execPath, args, {
    cwd: process.cwd(),
    env: process.env,
    stdio: "inherit",
  });

  processes.set(name, child);

  child.on("error", (error) => {
    console.error(`[STARTUP] Failed to start ${name}:`, error);
    shutdown("SIGTERM", 1);
  });

  child.on("exit", (code, signal) => {
    processes.delete(name);

    console.log(
      `[STARTUP] ${name} exited with code=${code}, signal=${signal}`,
    );

    if (!shuttingDown) {
      console.error(`[STARTUP] ${name} exited unexpectedly.`);
      shutdown("SIGTERM", code ?? 1);
    }

    if (shuttingDown && processes.size === 0) {
      clearTimeout(forceShutdownTimer);
      process.exit(exitCode);
    }
  });
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

console.log("[STARTUP] Starting Sentrix API and worker...");

startProcess("api", ["server.js"]);
startProcess("worker", ["worker.js"]);
