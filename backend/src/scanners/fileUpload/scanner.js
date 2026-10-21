// STATUS: UPDATED
// File: src/scanners/fileUpload/scanner.js

import { get } from "../../request/request.js";
import { getAuthenticatedRequestOptions } from "../../request/authenticatedRequestOptions.js";
import { createSecurityEvidence } from "../shared/evidenceBuilder.js";
import { calculateConfidence } from "../shared/confidence.js";
import { normalizeFinding } from "../shared/findingNormalizer.js";
import {
  createSecurityScanner,
  getTargetUrl,
} from "../shared/scannerContract.js";
import { assertSafeUrl } from "../../recon/shared/resolver.js";

const FILE_INPUT_PATTERN = /<input\b[^>]*type\s*=\s*["']?file["']?[^>]*>/gi;

const scanner = createSecurityScanner({
  id: "security.file-upload",
  name: "File Upload Security",
  description:
    "Detects file-upload forms and checks for client-visible restrictions without submitting files.",

  async run(context) {
    const targetUrl = getTargetUrl(context);

    await assertSafeUrl(targetUrl);

    const requestHeaders = context?.session?.getHeaders?.() ?? {};

    const authenticatedRequestOptions = getAuthenticatedRequestOptions(context);

    const response = await get(targetUrl, {
      signal: context?.signal,
      headers: requestHeaders,
      ...authenticatedRequestOptions,
    });

    const body = typeof response.data === "string" ? response.data : "";

    const inputs = body.match(FILE_INPUT_PATTERN) ?? [];

    const unrestricted = inputs.filter((input) => !/\baccept\s*=/i.test(input));

    const findings = [];

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
          },
        }),
      );
    }

    return {
      data: {
        uploadInputs: inputs.length,
        inputsWithoutAccept: unrestricted.length,
      },
      findings,
      evidence:
        inputs.length > 0
          ? [
              createSecurityEvidence({
                request: {
                  method: "GET",
                  url: targetUrl,
                  headers: {
                    ...requestHeaders,
                  },
                },
                response: {
                  status: response.status,
                  statusText: response.statusText,
                  headers: response.headers,
                  contentType: response.headers?.["content-type"],
                },
              }),
            ]
          : [],
      fingerprints: [],
      verificationRecords: [],
      metadata: {
        cancelled: context?.signal?.aborted === true,
        requestsTested: 1,
      },
    };
  },
});

export default scanner;
