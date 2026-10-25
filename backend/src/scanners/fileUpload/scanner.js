// STATUS: UPDATED
// File: src/scanners/fileUpload/scanner.js

import { get } from "../../request/request.js";
import { getAuthenticatedRequestOptions } from "../../request/authenticatedRequestOptions.js";
import { createSecurityEvidence } from "../shared/evidenceBuilder.js";
import {
  createSecurityScanner,
  getTargetUrl,
} from "../shared/scannerContract.js";
import { assertSafeUrl } from "../../recon/shared/resolver.js";
import {
  FILE_INPUT_PATTERN,
  evaluateFileTypeValidation,
} from "./fileTypeChecks.js";
import { evaluateFilenameHandling } from "./filenameChecks.js";
import { evaluateUploadRestrictions } from "./restrictionChecks.js";

const scanner = createSecurityScanner({
  id: "security.file-upload",
  name: "File Upload Security",
  description:
    "Detects file-upload forms and evaluates file-type validation, filename handling, and upload restrictions without submitting files.",

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

    // 1. File type validation checks
    const fileTypeRes = evaluateFileTypeValidation(inputs);

    // 2. Filename handling checks
    const filenameRes = evaluateFilenameHandling(body);

    // 3. Upload restrictions checks
    const restrictionRes = evaluateUploadRestrictions(body);

    const findings = [
      ...fileTypeRes.findings,
      ...filenameRes.findings,
      ...restrictionRes.findings,
    ];

    return {
      data: {
        uploadInputs: inputs.length,
        inputsWithoutAccept: fileTypeRes.unrestricted.length,
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
