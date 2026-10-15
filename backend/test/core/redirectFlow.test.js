/* STATUS: UPDATED */

import test from "node:test";
import assert from "node:assert/strict";

import {
  followRedirects,
  prepareRedirectRequest,
} from "../../src/core/redirectFlow.js";

const redirectResponse = (location, status = 302) => ({
  status,
  headers: { location },
  data: "",
});

const successfulResponse = () => ({
  status: 200,
  headers: {},
  data: "OK",
});

const validateRelativeDestination = async ({ location, currentUrl }) =>
  new URL(location, currentUrl).href;

test("does not make a second request after a loopback redirect is rejected", async () => {
  let requestCount = 0;

  await assert.rejects(
    followRedirects({
      initialUrl: "https://public.example/",
      request: async () => {
        requestCount += 1;

        return redirectResponse("http://127.0.0.1/private");
      },
      validateDestination: async () => {
        throw new Error("Redirect destination is not permitted.");
      },
    }),
    /not permitted/,
  );

  assert.equal(requestCount, 1);
});

test("does not make a second request after a private-IP redirect is rejected", async () => {
  let requestCount = 0;

  await assert.rejects(
    followRedirects({
      initialUrl: "https://public.example/",
      request: async () => {
        requestCount += 1;

        return redirectResponse("http://192.168.1.1/private");
      },
      validateDestination: async () => {
        throw new Error("Redirect destination is not permitted.");
      },
    }),
    /not permitted/,
  );

  assert.equal(requestCount, 1);
});

test("follows a redirect only after destination validation succeeds", async () => {
  const requestedUrls = [];

  const result = await followRedirects({
    initialUrl: "https://public.example/old",

    request: async ({ url }) => {
      requestedUrls.push(url);

      if (url === "https://public.example/old") {
        return redirectResponse("/new");
      }

      return successfulResponse();
    },

    validateDestination: validateRelativeDestination,
  });

  assert.deepEqual(requestedUrls, [
    "https://public.example/old",
    "https://public.example/new",
  ]);

  assert.equal(result.response.status, 200);
  assert.equal(result.redirectCount, 1);
});

test("stops when the configured redirect limit is reached", async () => {
  let requestCount = 0;

  await assert.rejects(
    followRedirects({
      initialUrl: "https://public.example/",
      maxRedirects: 1,

      request: async () => {
        requestCount += 1;
        return redirectResponse("/next");
      },

      validateDestination: validateRelativeDestination,
    }),
    /Maximum redirect count exceeded/,
  );

  assert.equal(requestCount, 2);
});

test("does not follow redirects when the limit is zero", async () => {
  let requestCount = 0;

  await assert.rejects(
    followRedirects({
      initialUrl: "https://public.example/",
      maxRedirects: 0,

      request: async () => {
        requestCount += 1;
        return redirectResponse("/next");
      },

      validateDestination: validateRelativeDestination,
    }),
    /Maximum redirect count exceeded/,
  );

  assert.equal(requestCount, 1);
});

test("removes sensitive headers when redirecting across origins", async () => {
  const requests = [];

  const result = await followRedirects({
    initialUrl: "https://first.example/start",

    initialHeaders: {
      Authorization: "Bearer secret",
      Cookie: "session=secret",
      "X-Api-Key": "secret-key",
      "Content-Type": "application/json",
    },

    request: async (options) => {
      requests.push(options);

      if (requests.length === 1) {
        return redirectResponse("https://second.example/next");
      }

      return successfulResponse();
    },

    validateDestination: validateRelativeDestination,

    onRedirect: (redirect) => prepareRedirectRequest(redirect),
  });

  assert.equal(result.response.status, 200);

  assert.equal("Authorization" in requests[1].headers, false);

  assert.equal("Cookie" in requests[1].headers, false);

  assert.equal("X-Api-Key" in requests[1].headers, false);

  assert.equal(requests[1].headers["Content-Type"], "application/json");
});

test("converts POST to GET for 303 and clears its body and params", async () => {
  const requests = [];

  await followRedirects({
    initialUrl: "https://first.example/submit",
    initialMethod: "POST",
    initialHeaders: {
      "Content-Type": "application/json",
      "Content-Length": "7",
    },
    initialData: "payload",
    initialParams: { page: 2 },

    request: async (options) => {
      requests.push(options);

      if (requests.length === 1) {
        return redirectResponse("/result", 303);
      }

      return successfulResponse();
    },

    validateDestination: validateRelativeDestination,

    onRedirect: (redirect) => prepareRedirectRequest(redirect),
  });

  assert.equal(requests[1].method, "GET");
  assert.equal(requests[1].data, undefined);
  assert.equal(requests[1].params, undefined);

  assert.equal("Content-Length" in requests[1].headers, false);
});

test("preserves method and body for a 307 redirect", async () => {
  const requests = [];

  await followRedirects({
    initialUrl: "https://first.example/submit",
    initialMethod: "POST",
    initialData: "payload",
    initialParams: { page: 2 },

    request: async (options) => {
      requests.push(options);

      if (requests.length === 1) {
        return redirectResponse("/continue", 307);
      }

      return successfulResponse();
    },

    validateDestination: validateRelativeDestination,

    onRedirect: (redirect) => prepareRedirectRequest(redirect),
  });

  assert.equal(requests[1].method, "POST");
  assert.equal(requests[1].data, "payload");

  assert.deepEqual(requests[1].params, {
    page: 2,
  });
});

// Tests below call the production redirect policy directly.

test("production policy removes sensitive and stale headers across origins", () => {
  const result = prepareRedirectRequest({
    response: { status: 302 },
    currentUrl: "https://first.example/start",
    nextUrl: "https://second.example/next",
    method: "GET",

    headers: {
      Authorization: "Bearer secret",
      Cookie: "session=secret",
      "X-Api-Key": "secret-key",
      "Proxy-Authorization": "Basic secret",
      "X-Auth-Token": "secret-token",
      "Content-Type": "application/json",
      "Content-Length": "12",
      Host: "first.example",
    },
  });

  for (const header of [
    "Authorization",
    "Cookie",
    "X-Api-Key",
    "Proxy-Authorization",
    "X-Auth-Token",
    "Content-Length",
    "Host",
  ]) {
    assert.equal(
      Object.keys(result.headers).some(
        (key) => key.toLowerCase() === header.toLowerCase(),
      ),
      false,
      `${header} should be removed`,
    );
  }

  assert.equal(result.headers["Content-Type"], "application/json");
});

test("production policy converts POST to GET for 303", () => {
  const result = prepareRedirectRequest({
    response: { status: 303 },
    currentUrl: "https://first.example/submit",
    nextUrl: "https://first.example/result",
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Content-Length": "7",
    },
    data: "payload",
    params: { page: 2 },
  });

  assert.equal(result.method, "GET");
  assert.equal(result.data, undefined);
  assert.equal(result.params, undefined);

  assert.equal("Content-Length" in result.headers, false);
});

test("production policy converts POST to GET for 301 and 302", () => {
  for (const status of [301, 302]) {
    const result = prepareRedirectRequest({
      response: { status },
      currentUrl: "https://first.example/submit",
      nextUrl: "https://first.example/result",
      method: "POST",
      data: "payload",
      params: { page: 2 },
    });

    assert.equal(result.method, "GET");
    assert.equal(result.data, undefined);
    assert.equal(result.params, undefined);
  }
});

test("production policy preserves method and body for 307 and 308", () => {
  for (const status of [307, 308]) {
    const result = prepareRedirectRequest({
      response: { status },
      currentUrl: "https://first.example/submit",
      nextUrl: "https://first.example/continue",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": "7",
      },
      data: "payload",
      params: { page: 2 },
    });

    assert.equal(result.method, "POST");
    assert.equal(result.data, "payload");

    assert.deepEqual(result.params, {
      page: 2,
    });

    assert.equal(result.headers["Content-Type"], "application/json");

    assert.equal("Content-Length" in result.headers, false);
  }
});

test("production policy preserves headers for same-origin redirects", () => {
  const result = prepareRedirectRequest({
    response: { status: 302 },
    currentUrl: "https://first.example/start",
    nextUrl: "https://first.example/next",
    method: "GET",
    headers: {
      Authorization: "Bearer secret",
      "Content-Type": "application/json",
    },
  });

  assert.equal(result.headers.Authorization, "Bearer secret");

  assert.equal(result.headers["Content-Type"], "application/json");
});
