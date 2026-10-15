/* STATUS: UPDATED */
/* FILE: test/core/httpClient.integration.test.js */

import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import dns from "node:dns/promises";
import axios from "axios";

import { createHttpClient, executeRequest } from "../../src/core/httpClient.js";

const closeClient = ({ httpAgent, httpsAgent }) => {
  httpAgent.destroy();
  httpsAgent.destroy();
};

const listen = (server) =>
  new Promise((resolve, reject) => {
    server.once("error", reject);

    server.listen(0, "127.0.0.1", () => {
      server.removeListener("error", reject);
      resolve(server.address().port);
    });
  });

const closeServer = (server) =>
  new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    });
  });

const installTestLookup = (agent) => {
  agent.options.lookup = (_hostname, options, callback) => {
    if (options?.all) {
      callback(null, [{ address: "127.0.0.1", family: 4 }]);
      return;
    }

    callback(null, "127.0.0.1", 4);
  };
};

const assertSsrfBlocked = (error) => {
  assert.equal(
    error?.code,
    "SSRF_TARGET_BLOCKED",
    `Expected SSRF_TARGET_BLOCKED, received ${error?.code}: ${error?.message}`,
  );

  return true;
};

const assertLookupBlocked = (lookup, hostname, options = {}) =>
  assert.rejects(
    new Promise((resolve, reject) => {
      lookup(hostname, options, (error, address) => {
        if (error) {
          reject(error);
        } else {
          resolve(address);
        }
      });
    }),
    assertSsrfBlocked,
  );

/*
 * Simulate a public initial DNS result and an HTTP 302 response.
 * Production request and redirect validation remain active.
 * Only Axios's transport adapter is simulated.
 *
 * No request is sent to a private destination.
 */
const testRedirectRejection = async (t, destination) => {
  const initialUrl = "http://public.example/redirect";
  const requests = [];

  t.mock.method(dns, "lookup", async (hostname) => {
    if (hostname === "public.example") {
      return [
        {
          address: "93.184.216.34",
          family: 4,
        },
      ];
    }

    throw new Error(`Unexpected DNS lookup: ${hostname}`);
  });

  const originalAxiosCreate = axios.create.bind(axios);

  t.mock.method(axios, "create", (config) => {
    const client = originalAxiosCreate(config);

    client.defaults.adapter = async (requestConfig) => {
      requests.push(requestConfig.url);

      return {
        data: "",
        status: 302,
        statusText: "Found",
        headers: {
          location: destination,
        },
        config: requestConfig,
        request: {},
      };
    };

    return client;
  });

  await assert.rejects(
    executeRequest({
      url: initialUrl,
    }),
    assertSsrfBlocked,
  );

  assert.deepEqual(
    requests,
    [initialUrl],
    "Only the initial request should be executed",
  );
};

test("production Axios client disables proxy handling and automatic redirects", () => {
  const resources = createHttpClient();

  try {
    assert.equal(resources.client.defaults.proxy, false);
    assert.equal(resources.client.defaults.maxRedirects, 0);

    assert.equal(resources.client.defaults.validateStatus(404), true);
  } finally {
    closeClient(resources);
  }
});

test("HTTP and HTTPS agents are attached to the Axios client", () => {
  const resources = createHttpClient();

  try {
    assert.equal(resources.client.defaults.httpAgent, resources.httpAgent);

    assert.equal(resources.client.defaults.httpsAgent, resources.httpsAgent);

    assert.equal(typeof resources.httpAgent.options.lookup, "function");

    assert.equal(typeof resources.httpsAgent.options.lookup, "function");
  } finally {
    closeClient(resources);
  }
});

test("connection-time DNS lookup rejects loopback and private addresses", async () => {
  const resources = createHttpClient();

  try {
    const lookup = resources.httpAgent.options.lookup;

    for (const hostname of [
      "127.0.0.1",
      "10.0.0.1",
      "192.168.1.1",
      "169.254.169.254",
    ]) {
      await assertLookupBlocked(lookup, hostname);
    }
  } finally {
    closeClient(resources);
  }
});

test("connection-time DNS lookup rejects prohibited IPv6 addresses", async () => {
  const resources = createHttpClient();

  const blockedAddresses = [
    "::",
    "::1",
    "fc00::1",
    "fd12:3456::1",
    "fe80::1",
    "ff02::1",
    "2001:db8::1",
    "::ffff:127.0.0.1",
    "::ffff:10.0.0.1",
    "::ffff:169.254.169.254",
    "::ffff:192.168.1.1",
  ];

  try {
    const lookup = resources.httpAgent.options.lookup;

    for (const address of blockedAddresses) {
      await assertLookupBlocked(lookup, address, { family: 6 });
    }
  } finally {
    closeClient(resources);
  }
});

test("pre-aborted outbound request is rejected", async () => {
  const controller = new AbortController();
  controller.abort();

  await assert.rejects(
    executeRequest({
      url: "https://8.8.8.8/",
      signal: controller.signal,
    }),
    (error) => {
      assert.equal(error.code, "ERR_CANCELED");
      return true;
    },
  );
});

test("Axios timeout interrupts a slow local HTTP response", async () => {
  let requestReceived = false;

  const server = http.createServer((_request, response) => {
    requestReceived = true;

    response.writeHead(200, {
      "Content-Type": "text/plain",
    });

    response.write("waiting");
  });

  const port = await listen(server);
  const resources = createHttpClient({ timeout: 100 });

  installTestLookup(resources.httpAgent);

  try {
    await assert.rejects(
      resources.client.get(`http://timeout-test.invalid:${port}/slow`),
      (error) => {
        assert.equal(error.code, "ECONNABORTED");
        return true;
      },
    );

    assert.equal(
      requestReceived,
      true,
      "Local server should receive the request",
    );
  } finally {
    closeClient(resources);
    await closeServer(server);
  }
});

test("HTTP agents can be destroyed after success or failure", () => {
  const resources = createHttpClient();

  closeClient(resources);

  assert.equal(Object.keys(resources.httpAgent.sockets).length, 0);

  assert.equal(Object.keys(resources.httpsAgent.sockets).length, 0);
});

test("executeRequest rejects prohibited loopback before connecting", async () => {
  await assert.rejects(
    executeRequest({
      url: "http://127.0.0.1:3000/",
    }),
    assertSsrfBlocked,
  );
});

test("executeRequest rejects cloud metadata before connecting", async () => {
  await assert.rejects(
    executeRequest({
      url: "http://169.254.169.254/latest/meta-data/",
    }),
    assertSsrfBlocked,
  );
});

test("executeRequest rejects a redirect to loopback after the initial response", async (t) => {
  await testRedirectRejection(t, "http://127.0.0.1:3000/private");
});

test("executeRequest rejects a redirect to private IPv4 after the initial response", async (t) => {
  await testRedirectRejection(t, "http://192.168.1.1/private");
});

test("executeRequest rejects a redirect to cloud metadata after the initial response", async (t) => {
  await testRedirectRejection(t, "http://169.254.169.254/latest/meta-data/");
});

test("executeRequest blocks DNS rebinding from public to private IP", async (t) => {
  let requestReceived = false;
  let dnsLookupCount = 0;

  const server = http.createServer((_request, response) => {
    requestReceived = true;
    response.writeHead(200);
    response.end("Unexpected request");
  });

  const port = await listen(server);

  t.mock.method(dns, "lookup", async (hostname) => {
    assert.equal(hostname, "rebind.example");

    dnsLookupCount += 1;

    if (dnsLookupCount === 1) {
      return [
        {
          address: "93.184.216.34",
          family: 4,
        },
      ];
    }

    return [
      {
        address: "127.0.0.1",
        family: 4,
      },
    ];
  });

  try {
    await assert.rejects(
      executeRequest({
        url: `http://rebind.example:${port}/`,
      }),
      assertSsrfBlocked,
    );

    assert.equal(
      dnsLookupCount,
      2,
      "DNS should be checked before the request and again at connection time",
    );

    assert.equal(
      requestReceived,
      false,
      "The local server must not receive the request",
    );
  } finally {
    await closeServer(server);
  }
});

test("executeRequest destroys both agents after a transport failure", async (t) => {
  let httpAgentDestroyed = false;
  let httpsAgentDestroyed = false;

  const originalAxiosCreate = axios.create.bind(axios);

  t.mock.method(dns, "lookup", async (hostname) => {
    assert.equal(hostname, "cleanup-test.example");

    return [
      {
        address: "93.184.216.34",
        family: 4,
      },
    ];
  });

  t.mock.method(axios, "create", (config) => {
    const client = originalAxiosCreate(config);

    t.mock.method(config.httpAgent, "destroy", () => {
      httpAgentDestroyed = true;
    });

    t.mock.method(config.httpsAgent, "destroy", () => {
      httpsAgentDestroyed = true;
    });

    client.defaults.adapter = async () => {
      throw new Error("Simulated transport failure");
    };

    return client;
  });

  await assert.rejects(
    executeRequest({
      url: "http://cleanup-test.example/",
    }),
    /Simulated transport failure/,
  );

  assert.equal(
    httpAgentDestroyed,
    true,
    "HTTP agent should be destroyed after failure",
  );

  assert.equal(
    httpsAgentDestroyed,
    true,
    "HTTPS agent should be destroyed after failure",
  );
});

test("executeRequest rejects DNS failures without sending a request", async (t) => {
  let requestAttempted = false;

  t.mock.method(dns, "lookup", async (hostname) => {
    assert.equal(hostname, "dns-failure.example");

    const error = new Error("Simulated DNS failure");
    error.code = "ENOTFOUND";

    throw error;
  });

  const originalAxiosCreate = axios.create.bind(axios);

  t.mock.method(axios, "create", (config) => {
    const client = originalAxiosCreate(config);

    client.defaults.adapter = async () => {
      requestAttempted = true;
      throw new Error("Request must not reach the transport");
    };

    return client;
  });

  await assert.rejects(
    executeRequest({
      url: "http://dns-failure.example/",
    }),
  );

  assert.equal(
    requestAttempted,
    false,
    "Transport must not be called after DNS resolution fails",
  );
});

test("executeRequest destroys both agents after cancellation", async (t) => {
  let httpAgentDestroyed = false;
  let httpsAgentDestroyed = false;

  const originalAxiosCreate = axios.create.bind(axios);

  t.mock.method(dns, "lookup", async (hostname) => {
    assert.equal(hostname, "cancel-test.example");

    return [
      {
        address: "93.184.216.34",
        family: 4,
      },
    ];
  });

  t.mock.method(axios, "create", (config) => {
    const client = originalAxiosCreate(config);

    t.mock.method(config.httpAgent, "destroy", () => {
      httpAgentDestroyed = true;
    });

    t.mock.method(config.httpsAgent, "destroy", () => {
      httpsAgentDestroyed = true;
    });

    client.defaults.adapter = async (requestConfig) =>
      new Promise((_resolve, reject) => {
        requestConfig.signal.addEventListener(
          "abort",
          () => {
            const error = new Error("Request cancelled");
            error.code = "ERR_CANCELED";
            reject(error);
          },
          { once: true },
        );
      });

    return client;
  });

  const controller = new AbortController();

  const request = executeRequest({
    url: "http://cancel-test.example/",
    signal: controller.signal,
  });

  controller.abort();

  await assert.rejects(request, (error) => {
    assert.equal(error.code, "ERR_CANCELED");
    return true;
  });

  assert.equal(
    httpAgentDestroyed,
    true,
    "HTTP agent should be destroyed after cancellation",
  );

  assert.equal(
    httpsAgentDestroyed,
    true,
    "HTTPS agent should be destroyed after cancellation",
  );
});

test("executeRequest destroys both agents after a timeout error", async (t) => {
  let httpAgentDestroyed = false;
  let httpsAgentDestroyed = false;

  const originalAxiosCreate = axios.create.bind(axios);
  const timeoutHandles = new Set();

  t.after(() => {
    for (const handle of timeoutHandles) {
      clearTimeout(handle);
    }
  });

  t.mock.method(dns, "lookup", async (hostname) => {
    assert.equal(hostname, "timeout-cleanup.example");

    return [
      {
        address: "93.184.216.34",
        family: 4,
      },
    ];
  });

  t.mock.method(axios, "create", (config) => {
    const client = originalAxiosCreate(config);

    t.mock.method(config.httpAgent, "destroy", () => {
      httpAgentDestroyed = true;
    });

    t.mock.method(config.httpsAgent, "destroy", () => {
      httpsAgentDestroyed = true;
    });

    client.defaults.adapter = async (requestConfig) =>
      new Promise((_resolve, reject) => {
        const handle = setTimeout(() => {
          timeoutHandles.delete(handle);

          const error = new Error(
            `timeout of ${requestConfig.timeout}ms exceeded`,
          );

          error.code = "ECONNABORTED";
          reject(error);
        }, requestConfig.timeout);

        timeoutHandles.add(handle);
      });

    return client;
  });

  await assert.rejects(
    executeRequest({
      url: "http://timeout-cleanup.example/",
      timeout: 100,
    }),
    (error) => {
      assert.equal(error.code, "ECONNABORTED");
      return true;
    },
  );

  assert.equal(
    httpAgentDestroyed,
    true,
    "HTTP agent should be destroyed after a timeout error",
  );

  assert.equal(
    httpsAgentDestroyed,
    true,
    "HTTPS agent should be destroyed after a timeout error",
  );
});
