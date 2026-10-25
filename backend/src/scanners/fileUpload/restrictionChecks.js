// STATUS: UPDATED
// File: src/scanners/fileUpload/restrictionChecks.js

import { calculateConfidence } from "../shared/confidence.js";
import { normalizeFinding } from "../shared/findingNormalizer.js";

export const evaluateUploadRestrictions = (body = "") => {
  const findings = [];
  const formMatches = [...body.matchAll(/<form\b[\s\S]*?<\/form>/gi)].map(
    (m) => m[0],
  );

  for (const form of formMatches) {
    const hasFileInput = /type\s*=\s*["']?file["']?/i.test(form);
    if (!hasFileInput) {
      continue;
    }

    const isGet = /\bmethod\s*=\s*["']?get/i.test(form);
    if (isGet) {
      findings.push(
        normalizeFinding({
          scannerId: "security.file-upload",
          title: "File Upload Form Configured With HTTP GET",
          description:
            'A form containing a file upload input specifies method="get". File uploads must be sent via POST with binary encoding.',
          severity: "medium",
          confidence: calculateConfidence({ confirmed: true }),
          remediation:
            'Configure the upload form to use method="post" and enctype="multipart/form-data".',
          category: "file-upload",
          metadata: {
            check: "upload-restrictions",
          },
        }),
      );
      break;
    }
  }

  return { findings };
};
