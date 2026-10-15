/* STATUS: UPDATED */

import { sensitiveHeaders } from "../config/security.js";

const isRedirectStatus = (status) => [301, 302, 303, 307, 308].includes(status);

const stripSensitiveHeaders = (headers = {}) => {
  const result = { ...headers };

  for (const key of Object.keys(result)) {
    const normalizedKey = key.toLowerCase();

    if (
      sensitiveHeaders.has(normalizedKey) ||
      ["host", "content-length"].includes(normalizedKey)
    ) {
      delete result[key];
    }
  }

  return result;
};

const prepareRedirectRequest = ({
  response,
  currentUrl,
  nextUrl,
  method,
  headers = {},
  data,
  params,
} = {}) => {
  let nextMethod = String(method || "GET").toUpperCase();
  let nextHeaders = { ...headers };
  let nextData = data;
  let nextParams = params;

  const previous = new URL(currentUrl);
  const next = new URL(nextUrl);

  // Never forward sensitive headers across origins.
  if (previous.origin !== next.origin) {
    nextHeaders = stripSensitiveHeaders(nextHeaders);
  }

  // Apply HTTP redirect method semantics.
  if (
    response?.status === 303 ||
    ([301, 302].includes(response?.status) && nextMethod === "POST")
  ) {
    nextMethod = "GET";
    nextData = undefined;
    nextParams = undefined;
    nextHeaders = stripSensitiveHeaders(nextHeaders);
  }

  // A redirected request must not reuse a stale body length.
  for (const key of Object.keys(nextHeaders)) {
    if (key.toLowerCase() === "content-length") {
      delete nextHeaders[key];
    }
  }

  return {
    method: nextMethod,
    headers: nextHeaders,
    data: nextData,
    params: nextParams,
  };
};

const followRedirects = async ({
  initialUrl,
  initialMethod = "GET",
  initialHeaders = {},
  initialData,
  initialParams,
  maxRedirects = 5,
  request,
  validateDestination,
  onRedirect,
}) => {
  if (typeof request !== "function") {
    throw new TypeError("A request function is required.");
  }

  if (typeof validateDestination !== "function") {
    throw new TypeError("A redirect validator is required.");
  }

  let currentUrl = initialUrl;
  let currentMethod = String(initialMethod).toUpperCase();
  let currentHeaders = { ...initialHeaders };
  let currentData = initialData;
  let currentParams = initialParams;
  let redirectCount = 0;

  while (true) {
    const response = await request({
      url: currentUrl,
      method: currentMethod,
      headers: currentHeaders,
      data: currentData,
      params: currentParams,
    });

    const location = response.headers?.location;

    if (
      !isRedirectStatus(response.status) ||
      typeof location !== "string" ||
      !location.trim()
    ) {
      return {
        response,
        url: currentUrl,
        redirectCount,
      };
    }

    if (redirectCount >= maxRedirects) {
      throw new Error("Maximum redirect count exceeded.");
    }

    // Validate the destination before any request to it.
    const nextUrl = await validateDestination({
      location,
      currentUrl,
    });

    if (typeof onRedirect === "function") {
      const nextState = await onRedirect({
        response,
        currentUrl,
        nextUrl,
        method: currentMethod,
        headers: currentHeaders,
        data: currentData,
        params: currentParams,
      });

      if (nextState) {
        currentMethod = nextState.method ?? currentMethod;
        currentHeaders = nextState.headers ?? currentHeaders;
        currentData = nextState.data;
        currentParams = nextState.params;
      }
    }

    currentUrl = nextUrl;
    redirectCount += 1;
  }
};

export { followRedirects, prepareRedirectRequest };
