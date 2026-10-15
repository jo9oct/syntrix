/* STATUS: UPDATED
 * File: src/engine/scanEngine.js
 */

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

const assertSelection = (selection) => {
  if (
    !selection ||
    !Array.isArray(selection.selectedScannerIds) ||
    selection.selectedScannerIds.length === 0
  ) {
    throw new Error(
      "Scan selection is mandatory. At least one scanner must be selected.",
    );
  }

  return selection;
};

const executeScan = async ({
  scan,
  target,
  selection,
  ownerId,
  credentials = null,
  options = {},
  discoveredUrls = [],
  scopeSnapshot = null,
  signal,
  onScannerStart,
  onScannerComplete,
  onScannerError,
}) => {
  const normalizedSelection = assertSelection(selection);

  const scanners = resolveSelectedScanners(
    normalizedSelection.selectedScannerIds,
  );

  const context = createScanContext({
    scan,
    target,
    selection: normalizedSelection,
    signal,
    ownerId,
    credentials,
    options,
    discoveredUrls,
    scopeSnapshot,
  });

  const results = [];

  context.logger.info("Scan execution started.", {
    selectedScannerCount: scanners.length,
    selectedScannerIds: scanners.map((scanner) => scanner.id),
    discoveredQueryTargetCount: context.discoveredUrls.length,
    savedScopeId: scopeSnapshot?.scopeId ? String(scopeSnapshot.scopeId) : null,
  });

  for (const scanner of scanners) {
    if (signal?.aborted) {
      context.logger.warn("Scan execution cancelled.", {
        scannerId: scanner.id,
      });

      break;
    }

    context.progress.start(scanner.id);

    if (typeof onScannerStart === "function") {
      await onScannerStart({
        scanner,
        context,
      });
    }

    try {
      await context.rateLimiter.wait();

      const scannerResult = await scanner.run(context);

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

      context.logger.info("Scanner completed.", {
        scannerId: scanner.id,
        findingCount: processedResult.findings.length,
      });
    } catch (error) {
      context.progress.fail(scanner.id);

      context.logger.error("Scanner failed.", {
        scannerId: scanner.id,
        error: {
          name: error?.name,
          message: error?.message,
          code: error?.code,
        },
      });

      if (typeof onScannerError === "function") {
        await onScannerError({
          scanner,
          context,
          error,
        });
      }

      results.push({
        scannerId: scanner.id,
        category: scanner.category,
        status: "failed",
        data: {},
        findings: [],
        evidence: [],
        fingerprints: [],
        verificationRecords: [],
        metadata: {
          error: {
            name: error?.name,
            message: error?.message,
            code: error?.code,
          },
        },
      });
    }
  }

  const merged = mergeResults(results);

  const hasFailedScanner = results.some((result) => result.status === "failed");

  const status = signal?.aborted
    ? SCAN_STATUS.CANCELLED
    : hasFailedScanner
      ? SCAN_STATUS.FAILED
      : SCAN_STATUS.COMPLETED;

  context.logger.info("Scan execution completed.", {
    status,
    scannerCount: results.length,
    findingCount: merged.findings.length,
  });

  return {
    scanId: scan.id,
    ownerId,
    targetId: target.id,
    status,
    selection: normalizedSelection,
    ...merged,
    progress: context.progress.getState(),
  };
};

export { SCAN_STATUS, executeScan };
