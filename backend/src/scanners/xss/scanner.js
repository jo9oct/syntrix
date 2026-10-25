/*
 * STATUS: UPDATED
 * File: src/scanners/xss/scanner.js
 *
 * Comprehensive Cross-Site Scripting (XSS) Scanner
 * Tests:
 * 1. Reflected XSS (Query parameters, form inputs, headers)
 * 2. DOM-Based XSS (Script AST/flow analysis of DOM sources & execution sinks)
 * 3. Stored XSS (State-changing submission and retrieval verification)
 */

import { request as httpRequest } from "../../request/request.js";
import { getAuthenticatedRequestOptions } from "../../request/authenticatedRequestOptions.js";
import { createSecurityEvidence } from "../shared/evidenceBuilder.js";
import { normalizeFinding } from "../shared/findingNormalizer.js";
import {
  createSecurityScanner,
  getTargetUrl,
} from "../shared/scannerContract.js";
import { getParameters } from "../shared/parameterTester.js";
import { getSafeMarker } from "../shared/payloadManager.js";
import { assertSafeUrl } from "../../recon/shared/resolver.js";
import { createFindingFingerprint } from "../../analysis/fingerprint/fingerprint.js";
import { discoverAllInputs } from "../sqli/inputDiscovery.js";

import { testReflectedXss } from "./reflected.js";
import { testDomBasedXss } from "./domBased.js";
import { testStoredXss } from "./stored.js";

const MAX_TARGETS = 11;
const MAX_INPUTS_PER_TARGET = 8;
const MAX_REQUESTS = 120;
const REQUEST_TIMEOUT_MS = 8000;

const normalizeTargetForFingerprint = (value) => {
  try {
    const url = new URL(value);

    if (!["http:", "https:"].includes(url.protocol)) {
      return value;
    }

    url.username = "";
    url.password = "";

    for (const key of new Set(url.searchParams.keys())) {
      url.searchParams.set(key, "");
    }

    url.hash = "";

    return url.toString();
  } catch {
    return value;
  }
};

const getTargets = (context, rootUrl) =>
  [
    ...new Set([
      rootUrl,
      ...(Array.isArray(context?.discoveredUrls) ? context.discoveredUrls : []),
    ]),
  ].slice(0, MAX_TARGETS);

const createEmptyResult = (cancelled = false) => ({
  data: {
    testedParameters: [],
    reflectionDetected: false,
    reflectedXssDetected: false,
    domXssDetected: false,
    storedXssDetected: false,
  },
  findings: [],
  evidence: [],
  fingerprints: [],
  verificationRecords: [],
  metadata: {
    cancelled,
    parametersTested: 0,
    requestsTested: 0,
    targetsTested: 0,
    requestLimit: MAX_REQUESTS,
    techniques: {
      reflected: { tested: 0, failures: 0, detected: false },
      domBased: { tested: 0, failures: 0, detected: false },
      stored: { tested: 0, failures: 0, detected: false },
    },
  },
});

const isCancellationError = (error, signal) =>
  signal?.aborted === true ||
  error?.name === "AbortError" ||
  error?.code === "ERR_CANCELED";

const getFindingDetails = (technique, signal) => {
  switch (technique) {
    case "reflected":
      return {
        title:
          signal?.rawUnescaped === true
            ? "Reflected Cross-Site Scripting"
            : "Potential Reflected Input Injection",
        severity:
          signal?.severity || (signal?.rawUnescaped ? "high" : "medium"),
        remediation:
          "Apply context-aware output encoding (HTML, attribute, JavaScript) and validate untrusted input against an allowlist.",
      };

    case "domBased":
    case "dom-based":
      return {
        title: "Potential DOM-Based Cross-Site Scripting",
        severity: signal?.severity || "high",
        remediation:
          "Avoid passing untrusted DOM sources (e.g. location.search, location.hash) to execution sinks (innerHTML, document.write, eval). Use safe APIs like textContent or sanitize inputs with a hardened library like DOMPurify.",
      };

    case "stored":
      return {
        title: "Stored Cross-Site Scripting",
        severity: "high",
        remediation:
          "Sanitize and encode all persisted untrusted input before rendering it in HTML contexts, and enforce a strict Content Security Policy (CSP).",
      };

    default:
      return {
        title: "Cross-Site Scripting",
        severity: "medium",
        remediation:
          "Apply context-aware output encoding and validate untrusted input.",
      };
  }
};

const scanner = createSecurityScanner({
  id: "security.xss",
  name: "Cross-Site Scripting",
  description:
    "Performs bounded reflected, DOM-based, and stored cross-site scripting assessments across query parameters, form fields, and client-side execution sinks.",

  async run(context) {
    const rootUrl = getTargetUrl(context);
    await assertSafeUrl(rootUrl);

    if (context?.signal?.aborted) {
      return createEmptyResult(true);
    }

    const testedTargets = getTargets(context, rootUrl);
    const requestHeaders = context?.session?.getHeaders?.() ?? {};
    const authenticatedRequestOptions = getAuthenticatedRequestOptions(context);
    const marker = getSafeMarker();

    const findings = [];
    const evidence = [];
    const testedParameters = new Set();
    const findingKeys = new Set();

    const techniqueMetadata = {
      reflected: { tested: 0, failures: 0, detected: false },
      domBased: { tested: 0, failures: 0, detected: false },
      stored: { tested: 0, failures: 0, detected: false },
    };

    let requestsTested = 0;
    let requestFailures = 0;
    let cancelled = false;

    const request = async (target) => {
      if (context?.signal?.aborted) {
        const error = new Error("XSS scan was cancelled.");
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
        const requestOptions = {
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
        };

        const response = await client(requestOptions);

        return { response };
      } catch (error) {
        if (isCancellationError(error, context?.signal)) {
          throw error;
        }

        requestFailures += 1;
        return { error };
      }
    };

    const addFinding = ({ targetUrl, parameter, technique, signal }) => {
      if (!signal) return;

      const key = [
        technique,
        parameter,
        normalizeTargetForFingerprint(targetUrl),
      ].join(":");
      if (findingKeys.has(key)) return;
      findingKeys.add(key);

      const details = getFindingDetails(technique, signal);
      const findingFingerprint = createFindingFingerprint({
        scannerId: "security.xss",
        category: "xss",
        title: details.title,
        target: normalizeTargetForFingerprint(targetUrl),
        parameter,
        location: signal.context || signal.sink || "response",
        evidenceType: "http_exchange",
      });

      const finding = normalizeFinding({
        scannerId: "security.xss",
        title: details.title,
        description: signal.description,
        severity: details.severity,
        confidence: signal.confidence || "medium",
        category: "xss",
        remediation: details.remediation,
        metadata: {
          parameter,
          technique,
          reflectionContext: signal.evidence?.reflectionContext,
          detection: technique,
        },
      });

      findings.push({
        ...finding,
        fingerprint: findingFingerprint,
      });

      evidence.push(
        createSecurityEvidence({
          request: {
            method: signal.request?.method || "GET",
            url: signal.testUrl || targetUrl,
            headers: signal.request?.headers || requestHeaders,
            body: signal.request?.body || undefined,
          },
          response: {
            status: signal.response?.status ?? 200,
            contentType: signal.response?.headers?.["content-type"],
          },
          findingFingerprint,
          findingKey: findingFingerprint,
          parameter,
          payload:
            signal.payload ??
            signal.evidence?.payload ??
            signal.storedMarker ??
            true,
          description: signal.description,
          confidence: finding.confidence,
          type: "http_exchange",
          metadata: {
            parameter,
            technique,
            payload:
              signal.payload ?? signal.evidence?.payload ?? signal.storedMarker,
            context: signal.context,
            source: signal.source,
            sink: signal.sink,
            responseBodyRedacted: true,
          },
        }),
      );

      if (techniqueMetadata[technique]) {
        techniqueMetadata[technique].detected = true;
      }
    };

    try {
      for (const targetUrl of testedTargets) {
        if (context?.signal?.aborted || requestsTested >= MAX_REQUESTS) break;

        await assertSafeUrl(targetUrl);

        // Fetch initial baseline for input discovery and DOM script inspection
        const initialOutcome = await request(targetUrl);
        if (initialOutcome.skipped) break;
        if (!initialOutcome.response) continue;

        const baselineResponse = initialOutcome.response;

        // Discover input targets across queries, forms, and paths
        const discoveredInputs = discoverAllInputs({
          targetUrl,
          baselineResponse,
          requestHeaders,
        });

        // Also ensure direct URL query parameters are tested (preserving legacy getParameters contract)
        const legacyParams = getParameters(targetUrl);
        for (const p of legacyParams) {
          if (!discoveredInputs.some((i) => i.parameter === p)) {
            discoveredInputs.unshift({
              source: "query",
              targetUrl,
              parameter: p,
              method: "GET",
              originalValue: "1",
              createRequest: (payload) => {
                const u = new URL(targetUrl);
                u.searchParams.set(p, payload);
                return { url: u.toString(), method: "GET", headers: {} };
              },
            });
          }
        }

        const boundedInputs = discoveredInputs.slice(0, MAX_INPUTS_PER_TARGET);

        for (const inputTarget of boundedInputs) {
          if (context?.signal?.aborted || requestsTested >= MAX_REQUESTS) break;

          const {
            parameter,
            targetUrl: itemTargetUrl,
            createRequest: createTestRequest,
            method,
          } = inputTarget;
          testedParameters.add(parameter);

          // 1. Reflected XSS Check
          const reflectedResult = await testReflectedXss({
            targetUrl: itemTargetUrl,
            parameter,
            createTestRequest,
            baselineResponse,
            request,
            marker,
          });

          techniqueMetadata.reflected.tested += reflectedResult.tested;
          techniqueMetadata.reflected.failures += reflectedResult.failures;
          addFinding({
            targetUrl: itemTargetUrl,
            parameter,
            technique: "reflected",
            signal: reflectedResult.signal,
          });

          // 2. DOM-Based XSS Check (Analyze client-side scripts)
          const domResult = await testDomBasedXss({
            targetUrl: itemTargetUrl,
            parameter,
            baselineResponse,
            request,
          });

          techniqueMetadata.domBased.tested += domResult.tested;
          techniqueMetadata.domBased.failures += domResult.failures;
          addFinding({
            targetUrl: itemTargetUrl,
            parameter,
            technique: "domBased",
            signal: domResult.signal,
          });

          // 3. Stored XSS Check (State-changing form submission & retrieval)
          if (method === "POST" || inputTarget.source === "form") {
            const storedResult = await testStoredXss({
              targetUrl: itemTargetUrl,
              parameter,
              createTestRequest,
              method,
              baselineResponse,
              request,
            });

            techniqueMetadata.stored.tested += storedResult.tested;
            techniqueMetadata.stored.failures += storedResult.failures;
            addFinding({
              targetUrl: itemTargetUrl,
              parameter,
              technique: "stored",
              signal: storedResult.signal,
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
        reflectionDetected: findings.length > 0,
        reflectedXssDetected: techniqueMetadata.reflected.detected,
        domXssDetected: techniqueMetadata.domBased.detected,
        storedXssDetected: techniqueMetadata.stored.detected,
      },
      findings,
      evidence,
      fingerprints: [],
      verificationRecords: [],
      metadata: {
        cancelled,
        parametersTested: testedParameters.size,
        requestsTested,
        targetsTested: testedTargets.length,
        requestLimit: MAX_REQUESTS,
        techniques: techniqueMetadata,
      },
    };
  },
});

export default scanner;
