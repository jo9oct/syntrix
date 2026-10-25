// STATUS: UPDATED
// File: src/scanners/openRedirect/redirectValidation.js

import { createSecurityEvidence } from "../shared/evidenceBuilder.js";
import { calculateConfidence } from "../shared/confidence.js";
import { normalizeFinding } from "../shared/findingNormalizer.js";

const REDIRECT_STATUS_CODES = new Set([301, 302, 303, 307, 308]);

export const isValidRedirectResponse = (status) =>
  REDIRECT_STATUS_CODES.has(Number(status));

export const isTargetRedirect = (location, payload) => {
  if (typeof location !== "string") {
    return false;
  }
  const cleanLocation = location.trim();
  return (
    cleanLocation.startsWith(payload) ||
    cleanLocation.startsWith(`//${payload.replace(/^https?:\/\//, "")}`) ||
    cleanLocation === payload
  );
};

export const evaluateRedirectResponse = ({
  response,
  parameter,
  payload,
  testUrl,
  requestHeaders = {},
}) => {
  const location = response.headers?.location;
  const status = response.status;

  if (!isValidRedirectResponse(status) && typeof location !== "string") {
    return null;
  }

  if (isTargetRedirect(location, payload)) {
    const finding = normalizeFinding({
      scannerId: "security.open-redirect",
      title: "Potential Open Redirect",
      description: `The parameter "${parameter}" influenced a redirect toward the controlled external test domain.`,
      severity: "medium",
      confidence: calculateConfidence({
        confirmed: false,
      }),
      remediation:
        "Use allowlisted redirect destinations or server-side route identifiers. Validate redirect destinations after resolving relative URLs.",
      category: "open-redirect",
      metadata: {
        parameter,
        redirectLocationRedacted: true,
      },
    });

    const evidence = createSecurityEvidence({
      request: {
        method: "GET",
        url: testUrl,
        headers: {
          ...requestHeaders,
        },
      },
      response: {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
      },
      parameter,
      payload,
      confidence: "medium",
      description: `The parameter "${parameter}" influenced a redirect toward the controlled external test domain.`,
      metadata: {
        parameter,
        payload,
        redirectLocationRedacted: true,
      },
    });

    return { finding, evidence };
  }

  return null;
};

