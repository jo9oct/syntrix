// STATUS: UPDATED
// File: src/scanners/commandInjection/errorBased.js

import { get } from "../../request/request.js";
import { getAuthenticatedRequestOptions } from "../../request/authenticatedRequestOptions.js";
import { createSecurityEvidence } from "../shared/evidenceBuilder.js";
import { calculateConfidence } from "../shared/confidence.js";
import { normalizeFinding } from "../shared/findingNormalizer.js";
import { setParameter } from "../shared/parameterTester.js";
import { getSafeMarker } from "../shared/payloadManager.js";
import { assertSafeUrl } from "../../recon/shared/resolver.js";

export const SHELL_ERROR_PATTERNS = [
  /sh:\s*\d*:\s*.*not found/i,
  /\/bin\/sh:\s*/i,
  /syntax error near unexpected token/i,
  /'[\w\s.-]+' is not recognized as an internal or external command/i,
  /The term '[\w\s.-]+' is not recognized/i,
  /WScript\.Shell/i,
  /command not found/i,
];

export const checkErrorBasedCommandInjection = async ({
  targetUrl,
  parameter,
  context,
  requestHeaders = {},
}) => {
  const marker = `${getSafeMarker()}-command`;
  const testUrl = setParameter(targetUrl, parameter, marker);

  await assertSafeUrl(testUrl);

  const authenticatedRequestOptions = getAuthenticatedRequestOptions(context);

  const response = await get(testUrl, {
    signal: context?.signal,
    headers: requestHeaders,
    ...authenticatedRequestOptions,
  });

  const body = typeof response.data === "string" ? response.data : "";
  const findings = [];
  const evidence = [];

  const matchedShellError = SHELL_ERROR_PATTERNS.find((pattern) =>
    pattern.test(body),
  );

  if (matchedShellError) {
    findings.push(
      normalizeFinding({
        scannerId: "security.command-injection",
        title: "Potential Command Injection Shell Error",
        description: `A response contained an operating-system shell syntax or execution error signature after submitting input to parameter "${parameter}".`,
        severity: "critical",
        confidence: calculateConfidence({
          confirmed: false,
        }),
        remediation:
          "Avoid passing user input to system shell interpreters. Use parameterized APIs and strict validation.",
        category: "command-injection",
        metadata: {
          parameter,
          technique: "error-based",
          pattern: String(matchedShellError),
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
          body,
        },
        parameter,
        payload: marker,
        confidence: "high",
        description: `Shell error signature identified in response for parameter "${parameter}".`,
        metadata: {
          parameter,
          technique: "error-based",
        },
      }),
    );
  } else if (body.includes(marker)) {
    findings.push(
      normalizeFinding({
        scannerId: "security.command-injection",
        title: "Potential Command Processing Input Surface",
        description: `A controlled marker was reflected in the response for parameter "${parameter}". Reflection alone does not confirm operating-system command execution or command injection.`,
        severity: "medium",
        confidence: calculateConfidence({
          confirmed: false,
        }),
        remediation:
          "Avoid shell interpretation of user input. Use safe process APIs, strict input validation, and allowlisted values where appropriate.",
        category: "command-injection",
        metadata: {
          parameter,
          detection: "reflected-marker",
          technique: "error-based",
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
          body,
        },
        parameter,
        payload: marker,
        confidence: "medium",
        metadata: {
          parameter,
          marker: "[REDACTED]",
          technique: "error-based",
        },
      }),
    );
  }

  return { findings, evidence };
};

