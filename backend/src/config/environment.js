// STATUS: UPDATED
// FILE: src/config/environment.js

import dotenv from "dotenv";
import Joi from "joi";

dotenv.config();

const environmentSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid("development", "test", "production")
    .default("development"),

  PORT: Joi.number().integer().min(1).max(65535).default(5000),

  APP_NAME: Joi.string().trim().default("web-security-assessment-platform"),

  MONGODB_URI: Joi.string().uri().required(),

  REDIS_URL: Joi.string().uri().required(),

  USER_TIER: Joi.string().valid("free", "pro", "enterprise").default("free"),

  // Optional for public-only scans.
  // Required and validated by the credential vault when credentials are used.
  CREDENTIAL_ENCRYPTION_KEY: Joi.string()
    .pattern(/^(?:[a-fA-F0-9]{64})?$/)
    .default(""),

  GUEST_SESSION_TTL_MINUTES: Joi.number()
    .integer()
    .min(1)
    .max(1440)
    .default(30),

  AI_ENABLED: Joi.boolean().truthy("true").falsy("false").default(false),

  AI_PROVIDER: Joi.string().allow("").default(""),

  AI_API_KEY: Joi.string().allow("").default(""),

  AI_MODEL: Joi.string().allow("").default(""),

  CLOUDINARY_CLOUD_NAME: Joi.string().allow("").default(""),

  CLOUDINARY_API_KEY: Joi.string().allow("").default(""),

  CLOUDINARY_API_SECRET: Joi.string().allow("").default(""),

  CLOUDINARY_FOLDER: Joi.string()
    .trim()
    .default("web-security-assessment-platform/reports"),

  SCAN_QUEUE_NAME: Joi.string().trim().default("security-scan"),

  REPORT_QUEUE_NAME: Joi.string().trim().default("security-report"),

  CLEANUP_QUEUE_NAME: Joi.string().trim().default("security-cleanup"),

  NOTIFICATION_QUEUE_NAME: Joi.string().trim().default("security-notification"),

  SCAN_CONCURRENCY: Joi.number().integer().min(1).max(100).default(3),

  QUEUE_ATTEMPTS: Joi.number().integer().min(1).max(20).default(3),

  QUEUE_BACKOFF_MS: Joi.number().integer().min(100).max(300000).default(5000),

  HTTP_REQUEST_TIMEOUT_MS: Joi.number()
    .integer()
    .min(100)
    .max(120000)
    .default(10000),

  HTTP_RESPONSE_SIZE_LIMIT_BYTES: Joi.number()
    .integer()
    .min(1024)
    .max(52428800)
    .default(5242880),

  MAX_CRAWL_PATHS_FREE: Joi.number().integer().min(1).default(25),

  MAX_CRAWL_DEPTH_FREE: Joi.number().integer().min(0).default(2),

  MAX_CONCURRENT_SCANS_FREE: Joi.number().integer().min(1).default(1),

  DAILY_SCAN_LIMIT_FREE: Joi.number().integer().min(1).default(5),

  REQUEST_RATE_LIMIT_FREE: Joi.number().integer().min(1).default(2),

  MAX_CRAWL_PATHS_PRO: Joi.number().integer().min(1).default(250),

  MAX_CRAWL_DEPTH_PRO: Joi.number().integer().min(0).default(5),

  MAX_CONCURRENT_SCANS_PRO: Joi.number().integer().min(1).default(3),

  MONTHLY_SCAN_LIMIT_PRO: Joi.number().integer().min(1).default(200),

  REQUEST_RATE_LIMIT_PRO: Joi.number().integer().min(1).default(20),

  LOG_LEVEL: Joi.string()
    .valid("error", "warn", "info", "debug")
    .default("info"),
}).unknown(true);

const { value: validatedEnvironment, error } = environmentSchema.validate(
  process.env,
  {
    abortEarly: false,
    convert: true,
  },
);

if (error) {
  throw new Error(`Invalid environment configuration:\n${error.message}`);
}

const isProduction = validatedEnvironment.NODE_ENV === "production";

if (isProduction && !validatedEnvironment.MONGODB_URI) {
  throw new Error("MONGODB_URI is required in production.");
}

if (isProduction && !validatedEnvironment.REDIS_URL) {
  throw new Error("REDIS_URL is required in production.");
}

const environment = Object.freeze({
  nodeEnv: validatedEnvironment.NODE_ENV,

  isProduction,

  appName: validatedEnvironment.APP_NAME,

  port: validatedEnvironment.PORT,

  database: {
    uri: validatedEnvironment.MONGODB_URI,
  },

  redis: {
    url: validatedEnvironment.REDIS_URL,
  },

  userTier: validatedEnvironment.USER_TIER,

  credentialEncryptionKey: validatedEnvironment.CREDENTIAL_ENCRYPTION_KEY,

  guest: {
    sessionTtlMinutes: validatedEnvironment.GUEST_SESSION_TTL_MINUTES,
  },

  ai: {
    enabled: validatedEnvironment.AI_ENABLED,
    provider: validatedEnvironment.AI_PROVIDER,
    apiKey: validatedEnvironment.AI_API_KEY,
    model: validatedEnvironment.AI_MODEL,
  },

  cloudinary: {
    cloudName: validatedEnvironment.CLOUDINARY_CLOUD_NAME,

    apiKey: validatedEnvironment.CLOUDINARY_API_KEY,

    apiSecret: validatedEnvironment.CLOUDINARY_API_SECRET,

    folder: validatedEnvironment.CLOUDINARY_FOLDER,
  },

  queue: {
    scanName: validatedEnvironment.SCAN_QUEUE_NAME,
    reportName: validatedEnvironment.REPORT_QUEUE_NAME,
    cleanupName: validatedEnvironment.CLEANUP_QUEUE_NAME,
    notificationName: validatedEnvironment.NOTIFICATION_QUEUE_NAME,

    scanConcurrency: validatedEnvironment.SCAN_CONCURRENCY,

    attempts: validatedEnvironment.QUEUE_ATTEMPTS,

    backoffMs: validatedEnvironment.QUEUE_BACKOFF_MS,
  },

  http: {
    timeoutMs: validatedEnvironment.HTTP_REQUEST_TIMEOUT_MS,

    responseSizeLimitBytes: validatedEnvironment.HTTP_RESPONSE_SIZE_LIMIT_BYTES,
  },

  plans: {
    free: {
      maxCrawlPaths: validatedEnvironment.MAX_CRAWL_PATHS_FREE,

      maxCrawlDepth: validatedEnvironment.MAX_CRAWL_DEPTH_FREE,

      maxConcurrentScans: validatedEnvironment.MAX_CONCURRENT_SCANS_FREE,

      dailyScanLimit: validatedEnvironment.DAILY_SCAN_LIMIT_FREE,

      requestRateLimit: validatedEnvironment.REQUEST_RATE_LIMIT_FREE,
    },

    pro: {
      maxCrawlPaths: validatedEnvironment.MAX_CRAWL_PATHS_PRO,

      maxCrawlDepth: validatedEnvironment.MAX_CRAWL_DEPTH_PRO,

      maxConcurrentScans: validatedEnvironment.MAX_CONCURRENT_SCANS_PRO,

      monthlyScanLimit: validatedEnvironment.MONTHLY_SCAN_LIMIT_PRO,

      requestRateLimit: validatedEnvironment.REQUEST_RATE_LIMIT_PRO,
    },
  },

  logging: {
    level: validatedEnvironment.LOG_LEVEL,
  },
});

export default environment;
