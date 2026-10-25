// STATUS: UPDATED
// File: src/scanners/cors/credentials.js

import { calculateConfidence } from "../shared/confidence.js";
import { normalizeFinding } from "../shared/findingNormalizer.js";

export const evaluateCredentialHandling = ({
  testOrigin,
  allowOrigin,
  allowCredentials,
  response,
}) => {
  const findings = [];

  const isCredentialsAllowed =
    String(allowCredentials ?? "").toLowerCase() === "true";

  if (allowOrigin === testOrigin && isCredentialsAllowed) {
    findings.push(
      normalizeFinding({
        scannerId: "security.cors",
        title: "Potentially Unsafe CORS Origin and Credential Configuration",
        description:
          "The application reflected a controlled external origin while allowing credentials. Verify whether an untrusted website can actually read sensitive responses in a browser.",
        severity: "high",
        confidence: calculateConfidence({
          confirmed: false,
        }),
        remediation:
          "Allow only explicitly trusted origins and enable credentials only when required.",
        category: "cors",
        metadata: {
          detection: "reflected-origin-with-credentials",
          allowOrigin,
          allowCredentials: true,
        },
      }),
    );
  } else if (allowOrigin === "*" && isCredentialsAllowed) {
    findings.push(
      normalizeFinding({
        scannerId: "security.cors",
        title: "Invalid CORS Configuration: Wildcard Origin With Credentials",
        description:
          "The application specifies Access-Control-Allow-Origin: * alongside Access-Control-Allow-Credentials: true. Browsers reject this combination, but it reveals an insecure configuration attempt.",
        severity: "medium",
        confidence: calculateConfidence({
          confirmed: true,
        }),
        remediation:
          "Do not combine wildcard Access-Control-Allow-Origin with Access-Control-Allow-Credentials: true.",
        category: "cors",
        metadata: {
          detection: "wildcard-origin-with-credentials",
        },
      }),
    );
  }

  return {
    allowCredentials: isCredentialsAllowed,
    findings,
  };
};

