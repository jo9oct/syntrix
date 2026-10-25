const parsePositiveInteger = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
};

const scannerConfig = Object.freeze({
  requestTimeoutMs: parsePositiveInteger(
    process.env.HTTP_REQUEST_TIMEOUT_MS,
    10_000,
  ),

  responseSizeLimitBytes: parsePositiveInteger(
    process.env.HTTP_RESPONSE_SIZE_LIMIT_BYTES,
    5 * 1024 * 1024,
  ),

  maxRedirects: parsePositiveInteger(process.env.MAX_REDIRECTS, 5),

  maxResponseBodyCharacters: parsePositiveInteger(
    process.env.MAX_RESPONSE_BODY_CHARACTERS,
    1_000_000,
  ),

  defaultConcurrency: parsePositiveInteger(process.env.SCAN_CONCURRENCY, 10),

  defaultCrawlPaths: parsePositiveInteger(process.env.MAX_CRAWL_PATHS_FREE, 25),

  defaultCrawlDepth: parsePositiveInteger(process.env.MAX_CRAWL_DEPTH_FREE, 2),

  userAgent:
    process.env.SCANNER_USER_AGENT || "Web-Security-Assessment-Platform/1.0",
});

const getScannerConfig = () => scannerConfig;

export { getScannerConfig };
