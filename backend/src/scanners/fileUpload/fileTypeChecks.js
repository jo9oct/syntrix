// STATUS: UPDATED
// File: src/scanners/fileUpload/fileTypeChecks.js

import { calculateConfidence } from "../shared/confidence.js";
import { normalizeFinding } from "../shared/findingNormalizer.js";

export const FILE_INPUT_PATTERN =
  /<input\b[^>]*type\s*=\s*["']?file["']?[^>]*>/gi;

export const evaluateFileTypeValidation = (inputs = []) => {
  const findings = [];
  const unrestricted = inputs.filter((input) => !/\baccept\s*=/i.test(input));

  if (unrestricted.length > 0) {
    findings.push(
      normalizeFinding({
        scannerId: "security.file-upload",
        title: "File Upload Input Without Client-Side Type Restriction",
        description:
          "A file upload input was identified without an HTML accept attribute. This is an informational observation only; it does not establish a server-side upload vulnerability.",
        severity: "info",
        confidence: calculateConfidence({
          confirmed: false,
        }),
        remediation:
          "Use an appropriate accept attribute for user experience, but enforce file type, size, content validation, storage isolation, and execution restrictions on the server.",
        category: "file-upload",
        metadata: {
          uploadInputs: inputs.length,
          inputsWithoutAccept: unrestricted.length,
          check: "file-type-validation",
        },
      }),
    );
  }

  return {
    unrestricted,
    findings,
  };
};
