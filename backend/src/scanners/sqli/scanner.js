/*
 * STATUS: UPDATED
 * File: src/scanners/sqli/scanner.js
 */

import { get } from "../../request/request.js";
import { getAuthenticatedRequestOptions } from "../../request/authenticatedRequestOptions.js";
import { createSecurityEvidence } from "../shared/evidenceBuilder.js";
import { normalizeFinding } from "../shared/findingNormalizer.js";
import {
  createSecurityScanner,
  getTargetUrl,
} from "../shared/scannerContract.js";
import { getParameters, setParameter } from "../shared/parameterTester.js";
import { assertSafeUrl } from "../../recon/shared/resolver.js";

import { testErrorBased } from "./errorBased.js";
import { testBooleanBased } from "./booleanBased.js";
import { testTimeBased } from "./timeBased.js";
import { testUnionBased } from "./unionBased.js";

const MAX_TARGETS = 3;
const MAX_PARAMETERS_PER_TARGET = 3;
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
    ...(Array.isArray(context?.discoveredUrls)
      ? context.discoveredUrls
      : []),
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
    "Performs bounded error-based, Boolean-based, time-based, and UNION-based SQL injection checks against URL query parameters.",

  async run(context) {
    const rootUrl = getTargetUrl(context);
    await assertSafeUrl(rootUrl);

    if (context?.signal?.aborted) {
      return createEmptyResult(true);
    }

    const targets = normalizeTargets(context, rootUrl);
    const requestHeaders = context?.session?.getHeaders?.() ?? {};
    const authenticatedRequestOptions =
      getAuthenticatedRequestOptions(context);

    const findings = [];
    const evidence = [];
    const testedParameters = new Set();
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

    const request = async (url) => {
      if (context?.signal?.aborted) {
        const error = new Error("SQL injection scan was cancelled.");
        error.name = "AbortError";
        error.code = "ERR_CANCELED";
        throw error;
      }

      if (requestsTested >= MAX_REQUESTS) {
        return { skipped: true };
      }

      await assertSafeUrl(url);

      requestsTested += 1;

      try {
        const response = await get(url, {
          signal: context?.signal,
          timeoutMs: REQUEST_TIMEOUT_MS,
          headers: requestHeaders,
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

    const addFinding = ({ targetUrl, parameter, result }) => {
      if (!result?.signal) {
        return;
      }

      const technique = result.technique;
      const key = [
        technique,
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

      const finding = normalizeFinding({
        scannerId: "security.sqli",
        title: details.title,
        description: signal.description,
        severity: details.severity,
        confidence: signal.confidence || "low",
        category: "sqli",
        remediation: details.remediation,
        metadata: {
          parameter,
          technique,
          responseBodyRedacted: true,
          requiresManualVerification: true,
        },
      });

      findings.push(finding);

      evidence.push(
        createSecurityEvidence({
          request: {
            method: "GET",
            url: signal.testUrl,
            headers: requestHeaders,
          },
          response: {
            status:
              signal.response?.status ??
              signal.response?.statusCode ??
              null,
            statusText: signal.response?.statusText ?? null,
            headers: signal.response?.headers ?? {},
            contentType:
              signal.response?.headers?.["content-type"] ??
              signal.response?.contentType ??
              null,
          },
          parameter,
          payload: true,
          description: signal.description,
          confidence: finding.confidence,
          findingKey: key,
          type: "http_exchange",
          metadata: {
            parameter,
            technique,
            requiresManualVerification: true,
            responseBodyRedacted: true,
          },
        }),
      );

      const metadataKey = getTechniqueMetadataKey(technique);

      if (metadataKey) {
        techniqueMetadata[metadataKey].detected = true;
      }
    };

    try {
      for (const targetUrl of targets) {
        if (
          context?.signal?.aborted ||
          requestsTested >= MAX_REQUESTS
        ) {
          break;
        }

        await assertSafeUrl(targetUrl);

        const parameters = getParameters(targetUrl).slice(
          0,
          MAX_PARAMETERS_PER_TARGET,
        );

        for (const parameter of parameters) {
          if (
            context?.signal?.aborted ||
            requestsTested >= MAX_REQUESTS
          ) {
            break;
          }

          testedParameters.add(parameter);

          /*
           * A baseline request is shared by error-based, Boolean-based,
           * and timing checks for this parameter.
           */
          const baselineUrl = setParameter(targetUrl, parameter,
            new URL(targetUrl).searchParams.get(parameter) ?? "");

          const baselineOutcome = await request(baselineUrl);

          if (baselineOutcome.skipped) {
            break;
          }

          if (!baselineOutcome.response) {
            continue;
          }

          for (const [technique, testTechnique] of TECHNIQUES) {
            if (
              context?.signal?.aborted ||
              requestsTested >= MAX_REQUESTS
            ) {
              break;
            }

            const result = await testTechnique({
              targetUrl,
              parameter,
              baselineResponse: baselineOutcome.response,
              request,
            });

            const metadataKey = getTechniqueMetadataKey(technique);

            techniqueMetadata[metadataKey].tested += result.tested;
            techniqueMetadata[metadataKey].failures += result.failures;

            addFinding({
              targetUrl,
              parameter,
              result,
            });
          }
        }
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