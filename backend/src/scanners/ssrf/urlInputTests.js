// STATUS: UPDATED
// File: src/scanners/ssrf/urlInputTests.js

import { get } from "../../request/request.js";
import { getAuthenticatedRequestOptions } from "../../request/authenticatedRequestOptions.js";
import { setParameter } from "../shared/parameterTester.js";
import { assertSafeUrl } from "../../recon/shared/resolver.js";
import { evaluateSsrfResponse } from "./responseVerification.js";

export const testUrlInput = async ({
  targetUrl,
  parameter,
  payload,
  context,
  requestHeaders = {},
}) => {
  const testUrl = setParameter(targetUrl, parameter, payload);

  await assertSafeUrl(testUrl);

  const authenticatedRequestOptions = getAuthenticatedRequestOptions(context);

  const response = await get(testUrl, {
    signal: context?.signal,
    headers: requestHeaders,
    maxRedirects: 0,
    validateStatus: () => true,
    ...authenticatedRequestOptions,
  });

  const evaluation = evaluateSsrfResponse({
    response,
    parameter,
    payload,
    testUrl,
    requestHeaders,
  });

  return {
    testUrl,
    response,
    finding: evaluation?.finding ?? null,
    evidence: evaluation?.evidence ?? null,
  };
};

