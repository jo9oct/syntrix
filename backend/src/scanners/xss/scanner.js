// STATUS: UPDATED
// File: src/scanners/xss/scanner.js

import { get } from "../../request/request.js";
import { getAuthenticatedRequestOptions } from "../../request/authenticatedRequestOptions.js";
import { createSecurityEvidence } from "../shared/evidenceBuilder.js";
import { calculateConfidence } from "../shared/confidence.js";
import { normalizeFinding } from "../shared/findingNormalizer.js";
import { findReflection } from "../shared/reflectionDetector.js";
import {
  createSecurityScanner,
  getTargetUrl,
} from "../shared/scannerContract.js";
import { getParameters, setParameter } from "../shared/parameterTester.js";
import { getSafeMarker } from "../shared/payloadManager.js";
import { assertSafeUrl } from "../../recon/shared/resolver.js";
import { createFindingFingerprint } from "../../analysis/fingerprint/fingerprint.js";

const MAX_PARAMETERS = 5;
const MAX_TARGETS = 11;

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

const scanner = createSecurityScanner({
  id: "security.xss",
  name: "Cross-Site Scripting",
  description: "Performs a bounded reflected-input marker test.",

  async run(context) {
    const rootUrl = getTargetUrl(context);

    await assertSafeUrl(rootUrl);

    const emptyResult = (cancelled = false) => ({
      data: {
        testedParameters: [],
        reflectionDetected: false,
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
      },
    });

    if (context?.signal?.aborted) {
      return emptyResult(true);
    }

    const marker = getSafeMarker();
    const findings = [];
    const evidence = [];
    const testedParameters = new Set();
    const testedTargets = getTargets(context, rootUrl);

    let requestsTested = 0;

    const requestHeaders = context?.session?.getHeaders?.() ?? {};

    const authenticatedRequestOptions = getAuthenticatedRequestOptions(context);

    for (const targetUrl of testedTargets) {
      if (context?.signal?.aborted) break;

      await assertSafeUrl(targetUrl);

      const parameters = getParameters(targetUrl).slice(0, MAX_PARAMETERS);

      for (const parameter of parameters) {
        if (context?.signal?.aborted) break;

        const testUrl = setParameter(targetUrl, parameter, marker);

        await assertSafeUrl(testUrl);

        const response = await get(testUrl, {
          signal: context?.signal,
          headers: requestHeaders,
          ...authenticatedRequestOptions,
        });

        requestsTested += 1;

        if (context?.signal?.aborted) break;

        const reflection = findReflection(response.data, marker);

        testedParameters.add(parameter);

        if (!reflection) continue;

        const findingFingerprint = createFindingFingerprint({
          scannerId: "security.xss",
          category: "xss",
          title: "Potential Reflected Input Injection",
          target: normalizeTargetForFingerprint(targetUrl),
          parameter,
          location: reflection.context,
          evidenceType: "http_exchange",
        });

        const finding = normalizeFinding({
          scannerId: "security.xss",
          title: "Potential Reflected Input Injection",
          description: `The controlled marker was reflected in the response for parameter "${parameter}". Reflection alone does not confirm executable cross-site scripting.`,
          severity: "medium",
          confidence: calculateConfidence({
            confirmed: false,
          }),
          remediation:
            "Apply context-aware output encoding, validate untrusted input, and ensure reflected data cannot be interpreted as executable HTML or JavaScript.",
          category: "xss",
          metadata: {
            parameter,
            reflectionContext: reflection.context,
            detection: "reflected-marker",
          },
        });

        findings.push({
          ...finding,
          fingerprint: findingFingerprint,
        });

        evidence.push(
          createSecurityEvidence({
            request: {
              method: "GET",
              url: testUrl,
              headers: requestHeaders,
            },
            response: {
              status: response.status,
              contentType: response.headers?.["content-type"],
            },
            findingFingerprint,
            findingKey: findingFingerprint,
            metadata: {
              parameter,
              marker: "[REDACTED]",
              reflectionContext: reflection.context,
              responseBodyRedacted: true,
            },
          }),
        );
      }
    }

    return {
      data: {
        testedParameters: [...testedParameters],
        reflectionDetected: findings.length > 0,
      },
      findings,
      evidence,
      fingerprints: [],
      verificationRecords: [],
      metadata: {
        cancelled: context?.signal?.aborted === true,
        parametersTested: testedParameters.size,
        requestsTested,
        targetsTested: testedTargets.length,
      },
    };
  },
});

export default scanner;
