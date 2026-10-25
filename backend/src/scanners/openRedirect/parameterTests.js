// STATUS: UPDATED
// File: src/scanners/openRedirect/parameterTests.js

import { get } from "../../request/request.js";
import { getAuthenticatedRequestOptions } from "../../request/authenticatedRequestOptions.js";
import { setParameter } from "../shared/parameterTester.js";
import { assertSafeUrl } from "../../recon/shared/resolver.js";
import { evaluateRedirectResponse } from "./redirectValidation.js";

export const testRedirectParameter = async ({
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

  const evaluation = evaluateRedirectResponse({
    response,
    parameter,
    payload,
    testUrl,
    requestHeaders,
  });

  return {
    tested: true,
    testUrl,
    response,
    finding: evaluation?.finding ?? null,
    evidence: evaluation?.evidence ?? null,
  };
};

