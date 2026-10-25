// STATUS: UPDATED
// File: src/scanners/fileUpload/filenameChecks.js

import { calculateConfidence } from "../shared/confidence.js";
import { normalizeFinding } from "../shared/findingNormalizer.js";

export const evaluateFilenameHandling = (body = "") => {
  const findings = [];
  const formMatches = [...body.matchAll(/<form\b[\s\S]*?<\/form>/gi)].map(
    (m) => m[0],
  );

  for (const form of formMatches) {
    const hasFileInput = /type\s*=\s*["']?file["']?/i.test(form);
    if (!hasFileInput) {
      continue;
    }

    const hasMultipart = /enctype\s*=\s*["']?multipart\/form-data["']?/i.test(
      form,
    );
    if (!hasMultipart) {
      findings.push(
        normalizeFinding({
          scannerId: "security.file-upload",
          title: "File Upload Form Missing multipart/form-data Encoding",
          description:
            'A form with a file input does not specify enctype="multipart/form-data", which will cause filename and binary payload corruption upon submission.',
          severity: "low",
          confidence: calculateConfidence({ confirmed: true }),
          remediation:
            'Specify enctype="multipart/form-data" on all forms accepting file uploads.',
          category: "file-upload",
          metadata: {
            check: "filename-enctype",
          },
        }),
      );
      break;
    }
  }

  return { findings };
};
