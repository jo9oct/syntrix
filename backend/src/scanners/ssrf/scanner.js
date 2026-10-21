// STATUS: UPDATED
// File: src/scanners/ssrf/scanner.js

import { get } from "../../request/request.js";
import { getAuthenticatedRequestOptions } from "../../request/authenticatedRequestOptions.js";
import { createSecurityEvidence } from "../shared/evidenceBuilder.js";
import { calculateConfidence } from "../shared/confidence.js";
import { normalizeFinding } from "../shared/findingNormalizer.js";
import {
  createSecurityScanner,
  getTargetUrl,
} from "../shared/scannerContract.js";
import { getParameters, setParameter } from "../shared/parameterTester.js";
import { getPayloads } from "../shared/payloadManager.js";
import { assertSafeUrl } from "../../recon/shared/resolver.js";

const MAX_PARAMETERS = 5;

const scanner = createSecurityScanner({
  id: "security.ssrf",
  name: "SSRF Surface Detection",
  description:
    "Checks URL-like parameters for behavior suggesting server-side URL retrieval.",

  async run(context) {
    const targetUrl = getTargetUrl(context);

    await assertSafeUrl(targetUrl);

    const parameters = getParameters(targetUrl).slice(0, MAX_PARAMETERS);

    const payload = getPayloads("ssrf")[0];

    const requestHeaders = context?.session?.getHeaders?.() ?? {};

    const authenticatedRequestOptions = getAuthenticatedRequestOptions(context);

    const findings = [];
    const evidence = [];
    let requestsTested = 0;

    for (const parameter of parameters) {
      if (context?.signal?.aborted) {
        break;
      }

      const testUrl = setParameter(targetUrl, parameter, payload);

      await assertSafeUrl(testUrl);

      const response = await get(testUrl, {
        signal: context?.signal,
        headers: requestHeaders,
        maxRedirects: 0,
        validateStatus: () => true,
        ...authenticatedRequestOptions,
      });

      requestsTested += 1;

      const body = typeof response.data === "string" ? response.data : "";

      const reflectedTestDomain = /example\.invalid/i.test(body);

      const gatewayError = response.status === 502 || response.status === 504;

      if (!reflectedTestDomain && !gatewayError) {
        continue;
      }

      const findingKey = `security.ssrf:url-retrieval-surface:${parameter}`;

      findings.push(
        normalizeFinding({
          scannerId: "security.ssrf",
          title: "Potential Server-Side URL Retrieval Surface",
          description: `The parameter "${parameter}" produced behavior that may be consistent with server-side URL processing. A reflected marker or gateway error alone does not confirm SSRF.`,
          severity: "high",
          confidence: calculateConfidence({
            confirmed: false,
          }),
          remediation:
            "Use strict URL allowlists, validate destination addresses after DNS resolution, block private and reserved network ranges, and revalidate every redirect destination.",
          category: "ssrf",
          metadata: {
            parameter,
            status: response.status,
            signal: reflectedTestDomain
              ? "test-domain-marker"
              : "gateway-error",
            responseBodyRedacted: true,
          },
        }),
      );

      evidence.push(
        createSecurityEvidence({
          request: {
            method: "GET",
            url: testUrl,
            headers: requestHeaders,
          },
          response: {
            status: response.status,
            statusText: response.statusText,
            headers: response.headers,
            contentType: response.headers?.["content-type"],
          },
          description:
            "Potential URL-processing behavior observed. Raw response body omitted from stored evidence.",
          metadata: {
            parameter,
            responseBodyRedacted: true,
          },
          findingKey,
          type: "http_exchange",
        }),
      );
    }

    return {
      data: {
        testedParameters: parameters,
        possibleUrlRetrieval: findings.length > 0,
      },
      findings,
      evidence,
      fingerprints: [],
      verificationRecords: [],
      metadata: {
        cancelled: context?.signal?.aborted === true,
        requestsTested,
      },
    };
  },
});

export default scanner;
