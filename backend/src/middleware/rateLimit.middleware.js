const buckets = new Map();

const DEFAULT_WINDOW_MS = 60_000;

const DEFAULT_MAX_REQUESTS = 60;

const cleanupExpiredBuckets = (now) => {
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) {
      buckets.delete(key);
    }
  }
};

const resolveClientKey = (request) =>
  request.ip || request.socket?.remoteAddress || "unknown";

const createRateLimiter = ({
  windowMs = DEFAULT_WINDOW_MS,
  maxRequests = DEFAULT_MAX_REQUESTS,
  keyGenerator = resolveClientKey,
} = {}) => {
  if (!Number.isInteger(windowMs) || windowMs <= 0) {
    throw new Error("windowMs must be a positive integer.");
  }

  if (!Number.isInteger(maxRequests) || maxRequests <= 0) {
    throw new Error("maxRequests must be a positive integer.");
  }

  return (request, response, next) => {
    const now = Date.now();

    cleanupExpiredBuckets(now);

    const key = String(keyGenerator(request));

    let bucket = buckets.get(key);

    if (!bucket || bucket.resetAt <= now) {
      bucket = {
        count: 0,
        resetAt: now + windowMs,
      };

      buckets.set(key, bucket);
    }

    bucket.count += 1;

    const remaining = Math.max(0, maxRequests - bucket.count);

    response.setHeader("X-RateLimit-Limit", String(maxRequests));

    response.setHeader("X-RateLimit-Remaining", String(remaining));

    response.setHeader(
      "X-RateLimit-Reset",
      String(Math.ceil(bucket.resetAt / 1000)),
    );

    if (bucket.count > maxRequests) {
      response.setHeader(
        "Retry-After",
        String(Math.ceil((bucket.resetAt - now) / 1000)),
      );

      return response.status(429).json({
        error: {
          code: "RATE_LIMIT_EXCEEDED",
          message: "Too many requests.",
        },
      });
    }

    return next();
  };
};

export { createRateLimiter };
