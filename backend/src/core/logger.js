import environment from "../config/environment.js";
import {
  sensitiveHeaders
} from "../config/security.js";

const redactHeaders = (
  headers = {}
) => {
  const output = {};

  for (
    const [
      key,
      value
    ] of Object.entries(
      headers
    )
  ) {
    if (
      sensitiveHeaders.has(
        key.toLowerCase()
      )
    ) {
      output[key] =
        "[REDACTED]";
      continue;
    }

    output[key] = value;
  }

  return output;
};

const normalizeError = (
  error
) => ({
  message:
    error?.message ||
    String(error),
  name:
    error?.name ||
    "Error",
  stack:
    error?.stack || null,
  code:
    error?.code || null
});

const writeLog = (
  level,
  message,
  metadata = {}
) => {
  const entry = {
    timestamp:
      new Date().toISOString(),
    level,
    message,
    ...metadata
  };

  if (
    metadata.request?.headers
  ) {
    entry.request = {
      ...metadata.request,
      headers:
        redactHeaders(
          metadata.request
            .headers
        )
    };
  }

  const serialized =
    JSON.stringify(entry);

  if (level === "error") {
    console.error(
      serialized
    );
    return;
  }

  if (level === "warn") {
    console.warn(
      serialized
    );
    return;
  }

  console.log(
    serialized
  );
};

const createLogger = (
  baseMetadata = {}
) => {
  const withMetadata = (
    metadata = {}
  ) => ({
    ...baseMetadata,
    ...metadata
  });

  return Object.freeze({
    debug(
      message,
      metadata = {}
    ) {
      if (
        environment.logging
          .level === "debug"
      ) {
        writeLog(
          "debug",
          message,
          withMetadata(
            metadata
          )
        );
      }
    },

    info(
      message,
      metadata = {}
    ) {
      writeLog(
        "info",
        message,
        withMetadata(
          metadata
        )
      );
    },

    warn(
      message,
      metadata = {}
    ) {
      writeLog(
        "warn",
        message,
        withMetadata(
          metadata
        )
      );
    },

    error(
      message,
      metadata = {}
    ) {
      writeLog(
        "error",
        message,
        withMetadata(
          metadata
        )
      );
    },

    errorObject(
      error,
      metadata = {}
    ) {
      writeLog(
        "error",
        error?.message ||
          "Application error",
        withMetadata({
          ...metadata,
          error:
            normalizeError(
              error
            )
        })
      );
    }
  });
};

const logger = createLogger();

export {
  redactHeaders,
  normalizeError,
  createLogger,
  logger
};