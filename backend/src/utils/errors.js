class ApplicationError extends Error {
  constructor(
    message,
    {
      code = "APPLICATION_ERROR",
      statusCode = 500,
      details = null,
      cause = null,
    } = {},
  ) {
    super(message);

    this.name = "ApplicationError";

    this.code = code;
    this.statusCode = statusCode;
    this.details = details;

    if (cause) {
      this.cause = cause;
    }

    Error.captureStackTrace?.(this, ApplicationError);
  }
}

class ScopeViolationError extends ApplicationError {
  constructor(message = "Target is outside the permitted scan scope.") {
    super(message, {
      code: "SCAN_SCOPE_VIOLATION",
      statusCode: 403,
    });

    this.name = "ScopeViolationError";
  }
}

class ScannerRequestError extends ApplicationError {
  constructor(message = "Scanner request failed.", cause = null) {
    super(message, {
      code: "SCANNER_REQUEST_FAILED",
      statusCode: 502,
      cause,
    });

    this.name = "ScannerRequestError";
  }
}

class ScannerTimeoutError extends ApplicationError {
  constructor(message = "Scanner request timed out.") {
    super(message, {
      code: "SCANNER_REQUEST_TIMEOUT",
      statusCode: 504,
    });

    this.name = "ScannerTimeoutError";
  }
}

class SsrfProtectionError extends ApplicationError {
  constructor(message = "The requested destination is not permitted.") {
    super(message, {
      code: "SSRF_TARGET_BLOCKED",
      statusCode: 403,
    });

    this.name = "SsrfProtectionError";
  }
}

export {
  ApplicationError,
  ScopeViolationError,
  ScannerRequestError,
  ScannerTimeoutError,
  SsrfProtectionError,
};
