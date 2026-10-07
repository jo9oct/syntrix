// STATUS: UPDATED

import http from "node:http";
import express from "express";
import crypto from "node:crypto";

import environment from "./src/config/environment.js";
import {
  connectDatabase
} from "./src/config/database.js";
import {
  securityHeaders
} from "./src/config/security.js";
import {
  createRateLimiter
} from "./src/middleware/rateLimit.middleware.js";
import {
  notFoundMiddleware
} from "./src/middleware/notFound.middleware.js";
import {
  errorMiddleware
} from "./src/middleware/error.middleware.js";
import healthRoutes from "./src/routes/health.routes.js";
import scanRoutes from "./src/routes/scan.routes.js";
import scannerRoutes from "./src/routes/scanner.routes.js";
import findingRoutes from "./src/routes/finding.routes.js";
import evidenceRoutes from "./src/routes/evidence.routes.js";
import reportRoutes from "./src/routes/report.routes.js";
import companyRuleRoutes from "./src/routes/companyRule.routes.js";

const app =
  express();

app.disable("x-powered-by");

app.set(
  "trust proxy",
  environment.isProduction
    ? 1
    : false
);

app.use(
  (
    request,
    response,
    next
  ) => {
    const requestId =
      request.headers[
        "x-request-id"
      ] ||
      crypto.randomUUID();

    request.id =
      String(
        requestId
      ).slice(0, 128);

    response.setHeader(
      "X-Request-ID",
      request.id
    );

    next();
  }
);

app.use(
  (
    request,
    response,
    next
  ) => {
    response.setHeader(
      "X-Content-Type-Options",
      securityHeaders
        .contentTypeOptions
    );

    response.setHeader(
      "X-Frame-Options",
      securityHeaders
        .frameOptions
    );

    response.setHeader(
      "Referrer-Policy",
      securityHeaders
        .referrerPolicy
    );

    response.setHeader(
      "Permissions-Policy",
      securityHeaders
        .permissionsPolicy
    );

    response.setHeader(
      "Cross-Origin-Opener-Policy",
      securityHeaders
        .crossOriginOpenerPolicy
    );

    response.setHeader(
      "Cross-Origin-Resource-Policy",
      securityHeaders
        .crossOriginResourcePolicy
    );

    response.setHeader(
      "Content-Security-Policy",
      securityHeaders
        .contentSecurityPolicy
    );

    if (
      environment.isProduction
    ) {
      response.setHeader(
        "Strict-Transport-Security",
        "max-age=31536000; includeSubDomains"
      );
    }

    next();
  }
);

app.use(
  createRateLimiter({
    windowMs:
      60_000,
    maxRequests:
      environment.userTier ===
      "enterprise"
        ? 300
        : environment.userTier ===
            "pro"
          ? 120
          : 60
  })
);

app.use(
  express.json({
    limit:
      "1mb",
    strict: true
  })
);

app.use(
  express.urlencoded({
    extended: false,
    limit:
      "1mb"
  })
);

app.get(
  "/",
  (
    request,
    response
  ) => {
    response.status(200).json({
      name:
        environment.appName,
      status:
        "running",
      framework:
        "Express.js",
      apiVersion:
        "v1"
    });
  }
);

app.use(
  "/api/v1/health",
  healthRoutes
);

app.use(
  "/api/v1/scans",
  scanRoutes
);

app.use(
  "/api/v1/scanners",
  scannerRoutes
);

app.use(
  "/api/v1/findings",
  findingRoutes
);

app.use(
  "/api/v1/evidence",
  evidenceRoutes
);

app.use(
  "/api/v1/reports",
  reportRoutes
);

app.use(
  "/api/v1/company-rules",
  companyRuleRoutes
);

app.use(
  notFoundMiddleware
);

app.use(
  errorMiddleware
);

const server =
  http.createServer(
    app
  );

let shuttingDown =
  false;

const shutdown =
  async (
    signal
  ) => {
    if (
      shuttingDown
    ) {
      return;
    }

    shuttingDown = true;

    console.info(
      JSON.stringify({
        event:
          "server.shutdown.started",
        signal
      })
    );

    server.close(
      async () => {
        try {
          const mongoose =
            await import(
              "mongoose"
            );

          if (
            mongoose.default
              .connection
              .readyState !== 0
          ) {
            await mongoose.default
              .connection
              .close();
          }

          console.info(
            JSON.stringify({
              event:
                "server.shutdown.completed"
            })
          );

          process.exit(0);
        } catch (error) {
          console.error(
            JSON.stringify({
              event:
                "server.shutdown.failed",
              error:
                error.message
            })
          );

          process.exit(1);
        }
      }
    );
  };

const start =
  async () => {
    await connectDatabase();

    server.listen(
      environment.port,
      () => {
        console.info(
          JSON.stringify({
            event:
              "server.started",
            app:
              environment.appName,
            framework:
              "Express.js",
            environment:
              environment.nodeEnv,
            port:
              environment.port
          })
        );
      }
    );
  };

process.on(
  "SIGTERM",
  () => {
    void shutdown(
      "SIGTERM"
    );
  }
);

process.on(
  "SIGINT",
  () => {
    void shutdown(
      "SIGINT"
    );
  }
);

process.on(
  "uncaughtException",
  (error) => {
    console.error(
      JSON.stringify({
        event:
          "process.uncaughtException",
        error:
          error.message,
        stack:
          error.stack
      })
    );

    void shutdown(
      "uncaughtException"
    );
  }
);

process.on(
  "unhandledRejection",
  (reason) => {
    const message =
      reason instanceof Error
        ? reason.message
        : String(reason);

    console.error(
      JSON.stringify({
        event:
          "process.unhandledRejection",
        error:
          message
      })
    );

    void shutdown(
      "unhandledRejection"
    );
  }
);

start().catch(
  (error) => {
    console.error(
      JSON.stringify({
        event:
          "server.start.failed",
        error:
          error.message,
        stack:
          error.stack
      })
    );

    process.exit(1);
  }
);

export {
  app,
  server
};