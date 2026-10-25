/*
 * STATUS: UPDATED
 * File: src/scanners/sqli/scanner.js
 */

import { request as httpRequest } from "../../request/request.js";
import { getAuthenticatedRequestOptions } from "../../request/authenticatedRequestOptions.js";
import { createSecurityEvidence } from "../shared/evidenceBuilder.js";
import { normalizeFinding } from "../shared/findingNormalizer.js";
import {
  createSecurityScanner,
  getTargetUrl,
} from "../shared/scannerContract.js";
import { assertSafeUrl } from "../../recon/shared/resolver.js";

import { testErrorBased } from "./errorBased.js";
import { testBooleanBased } from "./booleanBased.js";
import { testTimeBased } from "./timeBased.js";
import { testUnionBased } from "./unionBased.js";
import { discoverAllInputs } from "./inputDiscovery.js";
import { runConcurrent } from "../../utils/concurrency.js";

const MAX_TARGETS = 3;
const MAX_INPUTS_PER_TARGET = 8;
const MAX_REQUESTS = 120;
const REQUEST_TIMEOUT_MS = 8000;

const TECHNIQUES = [
  ["error-based", testErrorBased],
  ["boolean-based", testBooleanBased],
  ["time-based", testTimeBased],
  ["union-based", testUnionBased],
];

const createEmptyResult = (cancelled = false) => ({
  data: {
    testedParameters: [],
    testedInputSources: [],
    errorSignatureDetected: false,
    booleanDifferentialDetected: false,
    timeDifferentialDetected: false,
    unionMarkerDetected: false,
  },
  findings: [],
  evidence: [],
  fingerprints: [],
  verificationRecords: [],
  metadata: {
    cancelled,
    parametersTested: 0,
    inputSourcesTested: [],
    requestsTested: 0,
    requestFailures: 0,
    targetsTested: 0,
    requestLimit: MAX_REQUESTS,
    techniques: {
      errorBased: { tested: 0, failures: 0, detected: false },
      booleanBased: { tested: 0, failures: 0, detected: false },
      timeBased: { tested: 0, failures: 0, detected: false },
      unionBased: { tested: 0, failures: 0, detected: false },
    },
  },
});

const isCancellationError = (error, signal) =>
  signal?.aborted === true ||
  error?.name === "AbortError" ||
  error?.code === "ERR_CANCELED";

const normalizeTargets = (context, rootUrl) => {
  const candidates = [
    rootUrl,
    ...(Array.isArray(context?.discoveredUrls) ? context.discoveredUrls : []),
  ];

  const result = [];
  const seen = new Set();

  for (const candidate of candidates) {
    if (typeof candidate !== "string") {
      continue;
    }

    try {
      const url = new URL(candidate);
      url.hash = "";
      const normalized = url.toString();

      if (!seen.has(normalized)) {
        seen.add(normalized);
        result.push(normalized);
      }
    } catch {
      // Ignore malformed discovered URLs.
    }

    if (result.length >= MAX_TARGETS) {
      break;
    }
  }

  return result;
};

const getFindingDetails = (technique) => {
  switch (technique) {
    case "error-based":
      return {
        title: "Potential SQL Error Disclosure",
        severity: "low",
        remediation:
          "Use parameterized queries or prepared statements and avoid exposing database diagnostics to clients.",
      };

    case "boolean-based":
      return {
        title: "Potential Boolean-Based SQL Injection",
        severity: "medium",
        remediation:
          "Use parameterized queries or prepared statements so user-controlled input cannot alter SQL query structure.",
      };

    case "time-based":
      return {
        title: "Potential Time-Based SQL Injection",
        severity: "medium",
        remediation:
          "Use parameterized queries or prepared statements. Validate timing behavior under stable conditions before confirming this finding.",
      };

    case "union-based":
      return {
        title: "Potential UNION-Based SQL Injection",
        severity: "medium",
        remediation:
          "Use parameterized queries or prepared statements. Confirm that the marker originates from query execution rather than input reflection.",
      };

    default:
      return {
        title: "Potential SQL Injection",
        severity: "low",
        remediation: "Use parameterized queries or prepared statements.",
      };
  }
};

const getTechniqueMetadataKey = (technique) => {
  switch (technique) {
    case "error-based":
      return "errorBased";
    case "boolean-based":
      return "booleanBased";
    case "time-based":
      return "timeBased";
    case "union-based":
      return "unionBased";
    default:
      return null;
  }
};

const scanner = createSecurityScanner({
  id: "security.sqli",
  name: "SQL Injection Detection",
  description:
    "Performs bounded error-based, Boolean-based, time-based, and UNION-based SQL injection checks across URL queries, HTML forms, JSON bodies, cookies, path parameters, and HTTP headers.",

  async run(context) {
    const rootUrl = getTargetUrl(context);
    await assertSafeUrl(rootUrl);

    if (context?.signal?.aborted) {
      return createEmptyResult(true);
    }

    const targets = normalizeTargets(context, rootUrl);
    const requestHeaders = context?.session?.getHeaders?.() ?? {};
    const authenticatedRequestOptions = getAuthenticatedRequestOptions(context);

    const findings = [];
    const evidence = [];
    const testedParameters = new Set();
    const testedInputSources = new Set();
    const findingKeys = new Set();

    const techniqueMetadata = {
      errorBased: { tested: 0, failures: 0, detected: false },
      booleanBased: { tested: 0, failures: 0, detected: false },
      timeBased: { tested: 0, failures: 0, detected: false },
      unionBased: { tested: 0, failures: 0, detected: false },
    };

    let requestsTested = 0;
    let requestFailures = 0;
    let cancelled = false;

    const request = async (target) => {
      if (context?.signal?.aborted) {
        const error = new Error("SQL injection scan was cancelled.");
        error.name = "AbortError";
        error.code = "ERR_CANCELED";
        throw error;
      }

      if (requestsTested >= MAX_REQUESTS) {
        return { skipped: true };
      }

      const isString = typeof target === "string";
      const targetUrl = isString ? target : target.url;
      const targetMethod = isString
        ? "GET"
        : (target.method || "GET").toUpperCase();
      const targetHeaders = isString ? {} : target.headers || {};
      const targetBody = isString ? undefined : target.body;

      await assertSafeUrl(targetUrl);

      requestsTested += 1;

      try {
        const client = context?.requestClient ?? httpRequest;
        const response = await client({
          url: targetUrl,
          method: targetMethod,
          body: targetBody,
          data: targetBody,
          signal: context?.signal,
          timeoutMs: REQUEST_TIMEOUT_MS,
          headers: {
            ...requestHeaders,
            ...targetHeaders,
          },
          ...authenticatedRequestOptions,
        });

        return { response };
      } catch (error) {
        if (isCancellationError(error, context?.signal)) {
          throw error;
        }

        requestFailures += 1;
        return { error };
      }
    };

    const addFinding = ({
      targetUrl,
      inputSource = "query",
      parameter,
      result,
    }) => {
      if (!result?.signal) {
        return;
      }

      const technique = result.technique;
      const key = [
        technique,
        inputSource,
        new URL(targetUrl).origin,
        new URL(targetUrl).pathname,
        parameter,
      ].join(":");

      if (findingKeys.has(key)) {
        return;
      }

      findingKeys.add(key);

      const details = getFindingDetails(technique);
      const signal = result.signal;
      const sourceLabel = inputSource.toUpperCase();
      const severity = signal.confidence === "high" ? "high" : details.severity;
      const title =
        signal.confidence === "high"
          ? `${details.title.replace("Potential ", "")} with Data Reflection via ${sourceLabel} (${parameter})`
          : `${details.title} via ${sourceLabel} (${parameter})`;

      const finding = normalizeFinding({
        scannerId: "security.sqli",
        title,
        description: `[${sourceLabel} input: "${parameter}"] ${signal.description}`,
        severity,
        confidence: signal.confidence || "low",
        category: "sqli",
        remediation: details.remediation,
        metadata: {
          parameter,
          inputSource,
          technique,
          responseBodyRedacted: true,
          requiresManualVerification: signal.confidence !== "high",
        },
      });

      findings.push(finding);

      const securityEvidence = createSecurityEvidence({
        request: {
          method: signal.request?.method || "GET",
          url: signal.testUrl || targetUrl,
          headers: signal.request?.headers || requestHeaders,
          body: signal.request?.body || undefined,
        },
        response: {
          status:
            signal.response?.status ?? signal.response?.statusCode ?? null,
          statusText: signal.response?.statusText ?? null,
          headers: signal.response?.headers ?? {},
          contentType:
            signal.response?.headers?.["content-type"] ??
            signal.response?.contentType ??
            null,
        },
        parameter,
        inputSource,
        payload:
          signal.payload ??
          signal.evidence?.payload ??
          signal.evidence?.truePayload ??
          true,
        description: signal.description,
        confidence: finding.confidence,
        findingKey: key,
        type: "http_exchange",
        metadata: {
          parameter,
          inputSource,
          technique,
          payload:
            signal.payload ??
            signal.evidence?.payload ??
            signal.evidence?.truePayload,
          requiresManualVerification: true,
          responseBodyRedacted: true,
        },
      });

      securityEvidence.inputSource = inputSource;
      securityEvidence.parameter = parameter;
      evidence.push(securityEvidence);

      const metadataKey = getTechniqueMetadataKey(technique);

      if (metadataKey) {
        techniqueMetadata[metadataKey].detected = true;
      }
    };

    try {
      for (const targetUrl of targets) {
        if (context?.signal?.aborted || requestsTested >= MAX_REQUESTS) {
          break;
        }

        await assertSafeUrl(targetUrl);

        // Initial baseline request for this target to support input discovery
        const initialBaselineOutcome = await request(targetUrl);

        if (initialBaselineOutcome.skipped) {
          break;
        }

        const initialBaselineResponse = initialBaselineOutcome.response;

        // Discover input targets across all 6 input sources
        const discoveredInputTargets = discoverAllInputs({
          targetUrl,
          baselineResponse: initialBaselineResponse,
          requestHeaders,
        });

        const boundedInputTargets = discoveredInputTargets.slice(
          0,
          MAX_INPUTS_PER_TARGET,
        );

        await runConcurrent(
          boundedInputTargets,
          10,
          async (inputTarget) => {
            if (context?.signal?.aborted || requestsTested >= MAX_REQUESTS) {
              return;
            }

            const {
              source,
              parameter,
              method,
              originalValue,
              createRequest: createTestRequest,
            } = inputTarget;

            const paramKey = `${source}:${parameter}`;
            testedParameters.add(paramKey);
            testedInputSources.add(source);

            /*
             * Determine baseline response for this input target.
             * For standard GET query/path/header without custom body, reuse initial baseline.
             * For POST/form/json/cookie, establish target-specific baseline with originalValue.
             */
            let baselineResponse = initialBaselineResponse;
            const isDifferentUrl =
              Boolean(inputTarget.targetUrl) &&
              inputTarget.targetUrl !== targetUrl;

            if (
              isDifferentUrl ||
              method === "POST" ||
              source === "json" ||
              source === "form" ||
              source === "cookie"
            ) {
              const baselineOutcome = await request(
                createTestRequest(originalValue),
              );

              if (baselineOutcome.skipped || !baselineOutcome.response) {
                return;
              }

              baselineResponse = baselineOutcome.response;
            }

            if (!baselineResponse) {
              return;
            }

            for (const [technique, testTechnique] of TECHNIQUES) {
              if (context?.signal?.aborted || requestsTested >= MAX_REQUESTS) {
                break;
              }

              const result = await testTechnique({
                targetUrl: inputTarget.targetUrl,
                parameter,
                inputSource: source,
                createTestRequest,
                originalValue,
                baselineResponse,
                request,
              });

              const metadataKey = getTechniqueMetadataKey(technique);

              if (metadataKey) {
                techniqueMetadata[metadataKey].tested += result.tested;
                techniqueMetadata[metadataKey].failures += result.failures;
              }

              addFinding({
                targetUrl: inputTarget.targetUrl,
                inputSource: source,
                parameter,
                result,
              });
            }
          },
          context?.signal,
        );
      }
    } catch (error) {
      if (isCancellationError(error, context?.signal)) {
        cancelled = true;
      } else {
        throw error;
      }
    }

    cancelled ||= context?.signal?.aborted === true;

    return {
      data: {
        testedParameters: [...testedParameters],
        testedInputSources: [...testedInputSources],
        errorSignatureDetected: techniqueMetadata.errorBased.detected,
        booleanDifferentialDetected: techniqueMetadata.booleanBased.detected,
        timeDifferentialDetected: techniqueMetadata.timeBased.detected,
        unionMarkerDetected: techniqueMetadata.unionBased.detected,
      },
      findings,
      evidence,
      fingerprints: [],
      verificationRecords: [],
      metadata: {
        cancelled,
        parametersTested: testedParameters.size,
        inputSourcesTested: [...testedInputSources],
        requestsTested,
        requestFailures,
        targetsTested: targets.length,
        requestLimit: MAX_REQUESTS,
        techniques: techniqueMetadata,
      },
    };
  },
});

export default scanner;
