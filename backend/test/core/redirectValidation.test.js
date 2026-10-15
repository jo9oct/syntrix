import test from "node:test";
import assert from "node:assert/strict";

import { validateRedirectDestination } from "../../src/core/httpClient.js";

test("rejects redirect to loopback IPv4", async () => {
  await assert.rejects(
    validateRedirectDestination({
      currentUrl: "https://example.com/",
      location: "http://127.0.0.1/private",
    }),
  );
});

test("rejects redirect to a private IPv4 address", async () => {
  await assert.rejects(
    validateRedirectDestination({
      currentUrl: "https://example.com/",
      location: "http://192.168.1.1/",
    }),
  );
});

test("rejects redirect to cloud metadata", async () => {
  await assert.rejects(
    validateRedirectDestination({
      currentUrl: "https://example.com/",
      location: "http://169.254.169.254/latest/meta-data/",
    }),
  );
});

test("rejects redirect using a prohibited protocol", async () => {
  await assert.rejects(
    validateRedirectDestination({
      currentUrl: "https://example.com/",
      location: "file:///etc/passwd",
    }),
  );
});

test("rejects redirect with embedded credentials", async () => {
  await assert.rejects(
    validateRedirectDestination({
      currentUrl: "https://example.com/",
      location: "http://user:password@example.com/",
    }),
  );
});

test("resolves a relative redirect against the current URL", async () => {
  const result = await validateRedirectDestination({
    currentUrl: "https://example.com/old/page",
    location: "../new-page",
  });

  assert.equal(result, "https://example.com/new-page");
});
