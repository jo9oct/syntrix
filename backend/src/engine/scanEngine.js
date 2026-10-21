
import { createScanContext } from "./scanContext.js";
import { resolveSelectedScanners } from "./scannerRegistry.js";
import { mergeResults, processScannerResult } from "./resultProcessor.js";

const SCAN_STATUS = Object.freeze({
  PENDING: "pending",
  RUNNING: "running",
  COMPLETED: "completed",
  FAILED: "failed",
  CANCELLED: "cancelled",
});

const AUTHENTICATION_ERROR_CODES = new Set([
  "AUTH_COOKIE_INVALID",
  "AUTH_SESSION_UNCONFIRMED",
  "AUTH_LOGIN_UNCONFIRMED",
  "AUTH_LOGIN_FORM_NOT_FOUND",
  "AUTH_FORM_FILL_FAILED",
  "AUTH_CROSS_ORIGIN_REDIRECT",
  "AUTH_CAPTCHA_REQUIRED",
  "AUTH_MFA_REQUIRED",
  "AUTHENTICATION_FAILED",
  "AUTHENTICATED_COOKIE_RESOLUTION_FAILED",
  "AUTHENTICATED_CRAWL_FAILED",
]);

const assertSelection = (selection) => {
  if (
    !selection ||
    !Array.isArray(selection.selectedScannerIds) ||
    selection.selectedScannerIds.length === 0
  ) {
    const error = new Error("At least one scanner must be selected.");
    error.code = "NO_SCANNERS_SELECTED";
    throw error;
  }

  const ids = selection.selectedScannerIds;

  if (
    ids.some(
      (id) => typeof id !== "string" || id.trim().length === 0,
    ) ||
    new Set(ids).size !== ids.length
  ) {
    const error = new Error("Scanner selection contains invalid IDs.");
    error.code = "INVALID_SCANNER_SELECTION";
    throw error;
  }

  return selection;
};

const normalizeScannerError = (error) => ({
  name:
    typeof error?.name === "string"
      ? error.name.slice(0, 100)
      : "Error",
  message: "Scanner execution failed.",
  code:
    typeof error?.code === "string"
      ? error.code.slice(0, 100)
      : "SCANNER_EXECUTION_FAILED",
});

const createFailedScannerResult = (scanner, error) => ({
  scannerId: scanner.id,
  category: scanner.category,
  status: "failed",
  data: {},
  findings: [],
  evidence: [],
  fingerprints: [],
  verificationRecords: [],
  metadata: {
    error: normalizeScannerError(error),
  },
});

const createAuthenticationLimitedResult = (scanner, error) => ({
  scannerId: scanner.id,
  category: scanner.category,
  status: "partial",
  data: {},
  findings: [],
  evidence: [],
  fingerprints: [],
  verificationRecords: [],
  metadata: {
    authentication: {
      status: "failed",
      error: normalizeScannerError(error),
      protectedCoverageConfirmed: false,
    },
    coverage: {
      status: "limited",
      reason: "AUTHENTICATION_NOT_CONFIRMED",
    },
  },
});

const isAuthenticationError = (error) =>
  typeof error?.code === "string" &&
  AUTHENTICATION_ERROR_CODES.has(error.code);

const createValidationError = (message, code) => {
  const error = new Error(message);
  error.code = code;
  return error;
};

const validateAuthenticatedRequest = (
  authenticatedRequest,
  target,
) => {
  if (authenticatedRequest == null) {
    return null;
  }

  if (
    typeof authenticatedRequest !== "object" ||
    Array.isArray(authenticatedRequest)
  ) {
    throw createValidationError(
      "Authenticated request configuration is invalid.",
      "INVALID_AUTHENTICATED_REQUEST",
    );
  }

  const { authOrigin, resolveHeaders } = authenticatedRequest;

  if (
    typeof authOrigin !== "string" ||
    typeof resolveHeaders !== "function"
  ) {
    throw createValidationError(
      "Authenticated request requires an origin and a header resolver.",
      "INVALID_AUTHENTICATED_REQUEST",
    );
  }

  let parsedAuthOrigin;
  let parsedTarget;

  try {
    parsedAuthOrigin = new URL(authOrigin);
    parsedTarget = new URL(target.url);
  } catch {
    throw createValidationError(
      "Authenticated request or target URL is invalid.",
      "INVALID_AUTHENTICATED_REQUEST",
    );
  }

  if (
    !["http:", "https:"].includes(parsedAuthOrigin.protocol) ||
    parsedAuthOrigin.username ||
    parsedAuthOrigin.password ||
    parsedAuthOrigin.origin !== authOrigin ||
    parsedTarget.username ||
    parsedTarget.password ||
    parsedAuthOrigin.origin !== parsedTarget.origin
  ) {
    throw createValidationError(
      "Authenticated requests must use the exact target origin.",
      "INVALID_AUTHENTICATED_REQUEST",
    );
  }

  return Object.freeze({
    authOrigin: parsedAuthOrigin.origin,
    resolveHeaders,
  });
};

const executeScan = async ({
  scan,
  target,
  selection,
  ownerId,
  options = {},
  discoveredUrls = [],
  scopeSnapshot = null,
  authenticatedRequest = null,
  signal,
  onScannerStart,
  onScannerComplete,
  onScannerError,
}) => {
  const normalizedSelection = assertSelection(selection);

  if (
    !scan?.id ||
    typeof target?.url !== "string" ||
    !ownerId
  ) {
    throw createValidationError(
      "Scan ID, target URL, and owner ID are required.",
      "INVALID_SCAN_CONTEXT",
    );
  }

  if (!Array.isArray(discoveredUrls)) {
    throw createValidationError(
      "Discovered URLs must be an array.",
      "INVALID_DISCOVERED_URLS",
    );
  }

  if (
    !options ||
    typeof options !== "object" ||
    Array.isArray(options)
  ) {
    throw createValidationError(
      "Scan options must be an object.",
      "INVALID_SCAN_OPTIONS",
    );
  }

  const safeAuthenticatedRequest = validateAuthenticatedRequest(
    authenticatedRequest,
    target,
  );

  const scanners = resolveSelectedScanners(
    normalizedSelection.selectedScannerIds,
  );

  if (!Array.isArray(scanners) || scanners.length === 0) {
    throw createValidationError(
      "No valid scanners were resolved for the selected scanner IDs.",
      "NO_SCANNERS_SELECTED",
    );
  }

  const resolvedIds = new Set(
    scanners.map((scanner) => scanner.id),
  );

  const unresolvedIds =
    normalizedSelection.selectedScannerIds.filter(
      (id) => !resolvedIds.has(id),
    );

  if (unresolvedIds.length > 0) {
    throw createValidationError(
      "One or more selected scanners could not be resolved.",
      "SCANNER_RESOLUTION_FAILED",
    );
  }

  const context = createScanContext({
    scan,
    target,
    selection: normalizedSelection,
    signal,
    ownerId,
    options,
    discoveredUrls,
    scopeSnapshot,
    authenticatedRequest: safeAuthenticatedRequest,
  });

  const results = [];
  let fatalExecutionError = null;

  context.logger.info("scan.engine.started", {
    scanId: scan.id,
    targetId: target.id,
    selectedScannerCount: scanners.length,
    authenticatedRequestAvailable: Boolean(
      safeAuthenticatedRequest,
    ),
  });

  try {
    for (const scanner of scanners) {
      if (signal?.aborted) {
        break;
      }

      context.progress.start(scanner.id);

      try {
        if (typeof onScannerStart === "function") {
          await onScannerStart({ scanner, context });
        }

        if (signal?.aborted) {
          context.progress.fail(scanner.id);
          break;
        }

        await context.rateLimiter.wait();

        if (signal?.aborted) {
          context.progress.fail(scanner.id);
          break;
        }

        const scannerResult = await scanner.run(context);

        if (signal?.aborted) {
          context.progress.fail(scanner.id);
          break;
        }

        const processedResult = processScannerResult({
          scanner,
          result: scannerResult,
        });

        results.push(processedResult);
        context.progress.complete(scanner.id);

        if (typeof onScannerComplete === "function") {
          await onScannerComplete({
            scanner,
            context,
            result: processedResult,
          });
        }

        context.logger.info("scan.scanner.completed", {
          scanId: scan.id,
          scannerId: scanner.id,
          status: processedResult?.status ?? "completed",
        });
      } catch (error) {
        context.progress.fail(scanner.id);

        const authenticationFailure =
          isAuthenticationError(error);

        context.logger.error(
          authenticationFailure
            ? "scan.scanner.authentication_limited"
            : "scan.scanner.failed",
          {
            scanId: scan.id,
            scannerId: scanner.id,
            errorCode:
              typeof error?.code === "string"
                ? error.code.slice(0, 100)
                : "SCANNER_EXECUTION_FAILED",
          },
        );

        if (typeof onScannerError === "function") {
          try {
            await onScannerError({
              scanner,
              context,
              error,
            });
          } catch (callbackError) {
            context.logger.error(
              "scan.scanner.error_callback_failed",
              {
                scanId: scan.id,
                scannerId: scanner.id,
                errorCode:
                  typeof callbackError?.code === "string"
                    ? callbackError.code.slice(0, 100)
                    : "SCANNER_ERROR_CALLBACK_FAILED",
              },
            );
          }
        }

        if (authenticationFailure) {
          results.push(
            createAuthenticationLimitedResult(scanner, error),
          );
        } else {
          results.push(
            createFailedScannerResult(scanner, error),
          );
        }
      }
    }

    const merged = mergeResults(results);

    const hasFailedScanner = results.some(
      (result) => result.status === "failed",
    );

    const hasPartialScanner = results.some(
      (result) => result.status === "partial",
    );

    const status = signal?.aborted
      ? SCAN_STATUS.CANCELLED
      : hasFailedScanner
        ? SCAN_STATUS.FAILED
        : SCAN_STATUS.COMPLETED;

    return {
      scanId: scan.id,
      ownerId,
      targetId: target.id,
      status,
      selection: normalizedSelection,
      ...merged,
      progress: context.progress.getState(),
      authentication: {
        status: !safeAuthenticatedRequest
          ? "not_used"
          : hasPartialScanner
            ? "limited"
            : "session_available",
        protectedCoverageConfirmed: false,
      },
    };
  } catch (error) {
    fatalExecutionError = error;
    throw error;
  } finally {
    /*
     * The worker owns and closes the authenticated browser session.
     * The engine must never close or share it between jobs.
     */
    context.logger.info("scan.engine.finished", {
      scanId: scan.id,
      status: signal?.aborted
        ? SCAN_STATUS.CANCELLED
        : fatalExecutionError
          ? SCAN_STATUS.FAILED
          : "finished",
    });
  }
};

export { SCAN_STATUS, executeScan };
