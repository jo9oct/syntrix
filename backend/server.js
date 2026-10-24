// STATUS: UPDATED
// FILE: backend/server.js
// PURPOSE: Unified Web Security Assessment + Sentrix Core API

import http from "node:http";
import express from "express";
import crypto from "node:crypto";
import cors from "cors";

import environment from "./src/config/environment.js";
import { connectDatabase } from "./src/config/database.js";
import { securityHeaders } from "./src/config/security.js";
import { createRateLimiter } from "./src/middleware/rateLimit.middleware.js";
import { notFoundMiddleware } from "./src/middleware/notFound.middleware.js";
import { errorMiddleware } from "./src/middleware/error.middleware.js";

//auth
import authRoutes from "./src/routes/auth.routes.js";
import adminRoutes from "./src/routes/admin.routes.js";
import dashboardRoutes from "./src/routes/dashboard.routes.js";
import serviceOrderRoutes from "./src/routes/serviceOrder.routes.js";
import serviceProjectRoutes from "./src/routes/serviceProject.routes.js";
import projectTaskRoutes from "./src/routes/projectTask.routes.js";

// Existing Web Security Assessment routes.
import healthRoutes from "./src/routes/health.routes.js";
import scanRoutes from "./src/routes/scan.routes.js";
import scannerRoutes from "./src/routes/scanner.routes.js";
import findingRoutes from "./src/routes/finding.routes.js";
import evidenceRoutes from "./src/routes/evidence.routes.js";
import companyRuleRoutes from "./src/routes/companyRule.routes.js";
import crawlRoutes from "./src/routes/crawl.routes.js";
import targetRoutes from "./src/routes/target.routes.js";
import scopeRoutes from "./src/routes/scope.routes.js";
import reportRoutes from "./src/routes/report.routes.js";

import paymentRoutes from "./src/routes/payment.routes.js";

// Sentrix Core routes.
import sentrixRoutes from "./src/routes/index.js";

const app = express();

app.disable("x-powered-by");

app.set("trust proxy", environment.isProduction ? 1 : false);

// Request ID middleware.
app.use((request, response, next) => {
  const requestId = request.headers["x-request-id"] || crypto.randomUUID();

  request.id = String(requestId).slice(0, 128);

  response.setHeader("X-Request-ID", request.id);

  next();
});

// Enable CORS for all API routes
app.use(cors());

// Security headers from the existing Web Security Assessment server.
app.use((request, response, next) => {
  response.setHeader(
    "X-Content-Type-Options",
    securityHeaders.contentTypeOptions,
  );

  response.setHeader("X-Frame-Options", securityHeaders.frameOptions);

  response.setHeader("Referrer-Policy", securityHeaders.referrerPolicy);

  response.setHeader("Permissions-Policy", securityHeaders.permissionsPolicy);

  response.setHeader(
    "Cross-Origin-Opener-Policy",
    securityHeaders.crossOriginOpenerPolicy,
  );

  response.setHeader(
    "Cross-Origin-Resource-Policy",
    securityHeaders.crossOriginResourcePolicy,
  );

  response.setHeader(
    "Content-Security-Policy",
    securityHeaders.contentSecurityPolicy,
  );

  if (environment.isProduction) {
    response.setHeader(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains",
    );
  }

  next();
});

// Preserve the existing global rate-limiting policy.
app.use(
  createRateLimiter({
    windowMs: 60_000,
    maxRequests:
      environment.userTier === "enterprise"
        ? 300
        : environment.userTier === "pro"
          ? 120
          : 60,
  }),
);

// Shared request-body parsing.
app.use(
  express.json({
    limit: "1mb",
    strict: true,
  }),
);

app.use(
  express.urlencoded({
    extended: false,
    limit: "1mb",
  }),
);

// Preserve the first server's root response.
app.get("/", (request, response) => {
  response.status(200).json({
    name: environment.appName,
    status: "running",
    framework: "Express.js",
    apiVersion: "v1",
  });
});

// Existing Web Security Assessment API routes.
// These routes retain priority and their existing paths.
app.use("/api/v1/health", healthRoutes);
app.use("/api/v1/scans", scanRoutes);
app.use("/api/v1/scanners", scannerRoutes);
app.use("/api/v1/findings", findingRoutes);
app.use("/api/v1/evidence", evidenceRoutes);
app.use("/api/v1/company-rules", companyRuleRoutes);
app.use("/api/v1/crawls", crawlRoutes);
app.use("/api/v1/targets", targetRoutes);
app.use("/api/v1/scopes", scopeRoutes);
app.use("/api/v1/payment", paymentRoutes);
app.use("/api/v1/reports", reportRoutes);

// Authentication routes
app.use("/api/v1/auth", authRoutes);

// Dashboard routes (User Dashboard /dashboard/user and adaptive /dashboard)
app.use("/api/v1/dashboard", dashboardRoutes);

// Service Order & Project Management routes
app.use("/api/v1/service-orders", serviceOrderRoutes);
app.use("/api/v1/service-projects", serviceProjectRoutes);
app.use("/api/v1/project-tasks", projectTaskRoutes);

app.use("/api/v1", adminRoutes);
app.use("/api/v1/admin", adminRoutes);

// Sentrix health endpoint.
// The existing server's / root and /api/v1/health remain unchanged.
app.get("/api/health", (request, response) => {
  response.status(200).json({
    status: "ok",
    service: "sentrix-api",
  });
});

app.use(notFoundMiddleware);
app.use(errorMiddleware);

// Sentrix Core API.
// Mount only at /api to avoid collisions with the existing /api/v1 routes.
app.use("/api", cors(), sentrixRoutes);

// Keep the existing error handling and not-found middleware.
app.use(notFoundMiddleware);
app.use(errorMiddleware);

const server = http.createServer(app);

let shuttingDown = false;

const shutdown = async (signal) => {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;

  console.info(
    JSON.stringify({
      event: "server.shutdown.started",
      signal,
    }),
  );

  server.close(async () => {
    try {
      const mongoose = await import("mongoose");

      if (mongoose.default.connection.readyState !== 0) {
        await mongoose.default.connection.close();
      }

      console.info(
        JSON.stringify({
          event: "server.shutdown.completed",
        }),
      );

      process.exit(0);
    } catch (error) {
      console.error(
        JSON.stringify({
          event: "server.shutdown.failed",
          error: error.message,
        }),
      );

      process.exit(1);
    }
  });
};

const start = async () => {
  // One MongoDB connection shared by both sets of Mongoose models.
  await connectDatabase();

  // One HTTP server and one listening port.
  server.listen(environment.port, () => {
    console.info(
      JSON.stringify({
        event: "server.started",
        app: environment.appName,
        framework: "Express.js",
        environment: environment.nodeEnv,
        port: environment.port,
      }),
    );
  });
};

process.on("SIGTERM", () => {
  void shutdown("SIGTERM");
});

process.on("SIGINT", () => {
  void shutdown("SIGINT");
});

process.on("uncaughtException", (error) => {
  console.error(
    JSON.stringify({
      event: "process.uncaughtException",
      error: error.message,
      stack: error.stack,
    }),
  );

  void shutdown("uncaughtException");
});

process.on("unhandledRejection", (reason) => {
  const message = reason instanceof Error ? reason.message : String(reason);

  console.error(
    JSON.stringify({
      event: "process.unhandledRejection",
      error: message,
    }),
  );

  void shutdown("unhandledRejection");
});

start().catch((error) => {
  console.error(
    JSON.stringify({
      event: "server.start.failed",
      error: error.message,
      stack: error.stack,
    }),
  );

  process.exit(1);
});

export { app, server };
