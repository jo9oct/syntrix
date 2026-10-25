// STATUS: UPDATED
// File: src/scanners/session/fixationChecks.js

import { calculateConfidence } from "../shared/confidence.js";
import { normalizeFinding } from "../shared/findingNormalizer.js";

const URL_SESSION_PATTERN =
  /(?:jsessionid|phpsessid|aspsessionid|sid)=([a-zA-Z0-9_\-]+)/i;

export const checkSessionFixation = ({ targetUrl, responseBody = "" }) => {
  const findings = [];

  // 1. Check if the current URL or query contains a session token
  const urlMatch = targetUrl.match(URL_SESSION_PATTERN);
  if (urlMatch) {
    findings.push(
      normalizeFinding({
        scannerId: "security.session",
        title: "Session Identifier Exposed in URL",
        description: `A session identifier (${urlMatch[0].split("=")[0]}) was detected in the URL, making sessions vulnerable to fixation, shoulder surfing, and referrer leakage.`,
        severity: "high",
        confidence: calculateConfidence({ confirmed: true }),
        remediation:
          "Store session identifiers exclusively in secure HTTP-only cookies instead of URL query parameters.",
        category: "session",
        metadata: {
          tokenName: urlMatch[0].split("=")[0],
          check: "session-fixation",
        },
      }),
    );
  }

  // 2. Check if the HTML response body exposes session IDs in hyperlinks
  if (typeof responseBody === "string") {
    const bodyMatch = responseBody.match(URL_SESSION_PATTERN);
    if (bodyMatch && !urlMatch) {
      findings.push(
        normalizeFinding({
          scannerId: "security.session",
          title: "Session Identifier In Links in Response Body",
          description: `Links in the response body contain URL-based session parameters (${bodyMatch[0].split("=")[0]}), which can lead to session fixation.`,
          severity: "medium",
          confidence: calculateConfidence({ confirmed: true }),
          remediation:
            "Avoid rewriting URLs to append session parameters. Use HTTP-only cookies.",
          category: "session",
          metadata: {
            tokenName: bodyMatch[0].split("=")[0],
            check: "session-fixation",
          },
        }),
      );
    }
  }

  return { findings };
};
