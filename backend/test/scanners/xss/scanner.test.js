/*
 * STATUS: CREATED
 * File: test/scanners/xss/scanner.test.js
 */

process.env.NODE_ENV ??= "test";
process.env.MONGODB_URI ??= "mongodb://localhost:27017/test";
process.env.REDIS_URL ??= "redis://localhost:6379";

import test from "node:test";
import assert from "node:assert/strict";

const { default: scanner } =
  await import("../../../src/scanners/xss/scanner.js");

const BASE_TARGET = "https://93.184.216.34";

test("scanner metadata and contract id", () => {
  assert.equal(scanner.id, "security.xss");
  assert.equal(scanner.name, "Cross-Site Scripting");
  assert.equal(typeof scanner.run, "function");
});

test("scanner detects reflected XSS via mock requestClient", async () => {
  const rootUrl = `${BASE_TARGET}/search?q=hello`;

  const requestClient = async (options) => {
    const url = typeof options === "string" ? options : options.url;
    const decodedUrl = decodeURIComponent(url);

    // Check if query parameter q contains the safe assessment marker
    if (decodedUrl.includes("assessment-marker")) {
      return {
        status: 200,
        headers: { "content-type": "text/html" },
        data: "<html><body>Search: <assessment-marker></body></html>",
      };
    }

    return {
      status: 200,
      headers: { "content-type": "text/html" },
      data: "<html><body>Search: hello</body></html>",
    };
  };

  const result = await scanner.run({
    targetUrl: rootUrl,
    requestClient,
  });

  assert.ok(result);
  assert.equal(result.data.reflectionDetected, true);
  assert.equal(result.data.reflectedXssDetected, true);
  assert.ok(result.findings.length > 0);
  assert.equal(result.findings[0].category, "xss");
  assert.ok(result.evidence.length > 0);
  assert.equal(result.metadata.techniques.reflected.detected, true);
});

test("scanner detects DOM-based XSS in script tags", async () => {
  const rootUrl = `${BASE_TARGET}/dashboard?view=user`;

  const requestClient = async () => ({
    status: 200,
    headers: { "content-type": "text/html" },
    data: `
      <html>
        <head>
          <script>
            const searchParams = new URLSearchParams(window.location.search);
            const view = searchParams.get('view');
            document.getElementById('display').innerHTML = view;
          </script>
        </head>
        <body><div id="display"></div></body>
      </html>
    `,
  });

  const result = await scanner.run({
    targetUrl: rootUrl,
    requestClient,
  });

  assert.ok(result);
  assert.equal(result.data.domXssDetected, true);
  const domFinding = result.findings.find((f) => f.title.includes("DOM"));
  assert.ok(domFinding);
  assert.equal(result.metadata.techniques.domBased.detected, true);
});

test("scanner detects stored XSS on HTML form submission and retrieval", async () => {
  const rootUrl = `${BASE_TARGET}/guestbook`;
  let storedComment = null;

  const requestClient = async (options) => {
    const isString = typeof options === "string";
    const method = isString ? "GET" : options.method || "GET";
    const body = isString ? "" : options.body || options.data || "";

    if (method === "POST") {
      const match =
        typeof body === "string" ? body.match(/sentrix_stored_[^&%]+/i) : null;
      if (match) {
        storedComment = match[0];
      }
      return {
        status: 200,
        headers: { "content-type": "text/html" },
        data: "<html><body>Comment received.</body></html>",
      };
    }

    if (storedComment) {
      return {
        status: 200,
        headers: { "content-type": "text/html" },
        data: `<html><body><div id="comments"><p><${storedComment}></p></div></body></html>`,
      };
    }

    // Initial baseline with form
    return {
      status: 200,
      headers: { "content-type": "text/html" },
      data: `
        <html>
          <body>
            <form action="/guestbook" method="POST">
              <input type="text" name="message" value="" />
              <button type="submit">Post</button>
            </form>
          </body>
        </html>
      `,
    };
  };

  const result = await scanner.run({
    targetUrl: rootUrl,
    requestClient,
  });

  assert.ok(result);
  assert.equal(result.data.storedXssDetected, true);
  const storedFinding = result.findings.find((f) => f.title.includes("Stored"));
  assert.ok(storedFinding);
  assert.equal(result.metadata.techniques.stored.detected, true);
});

test("scanner handles abort signal cleanly", async () => {
  const controller = new AbortController();
  controller.abort();

  const result = await scanner.run({
    targetUrl: BASE_TARGET,
    signal: controller.signal,
  });

  assert.ok(result);
  assert.equal(result.metadata.cancelled, true);
  assert.equal(result.findings.length, 0);
});
