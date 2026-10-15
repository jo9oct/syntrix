import test from "node:test";
import assert from "node:assert/strict";
import dns from "node:dns/promises";

import {
  isBlockedAddress,
  assertSafeUrl,
  resolveHostname,
} from "../../../src/recon/shared/resolver.js";

test("blocks private and special-use IPv4 addresses", () => {
  const blockedAddresses = [
    "0.0.0.0",
    "0.1.2.3",
    "10.0.0.1",
    "100.64.0.1",
    "127.0.0.1",
    "169.254.169.254",
    "172.16.0.1",
    "172.31.255.254",
    "192.0.0.1",
    "192.0.2.1",
    "192.168.1.1",
    "198.18.0.1",
    "198.51.100.1",
    "203.0.113.1",
    "224.0.0.1",
    "240.0.0.1",
    "255.255.255.255",
  ];

  for (const address of blockedAddresses) {
    assert.equal(
      isBlockedAddress(address),
      true,
      `${address} should be blocked`,
    );
  }
});

test("allows normal public IPv4 addresses", () => {
  const publicAddresses = ["1.1.1.1", "8.8.8.8", "93.184.216.34"];

  for (const address of publicAddresses) {
    assert.equal(
      isBlockedAddress(address),
      false,
      `${address} should not be blocked`,
    );
  }
});

test("blocks prohibited IPv6 addresses", () => {
  const blockedAddresses = [
    "::",
    "::1",
    "fc00::1",
    "fd12:3456::1",
    "fe80::1",
    "ff02::1",
    "2001:db8::1",
  ];

  for (const address of blockedAddresses) {
    assert.equal(
      isBlockedAddress(address),
      true,
      `${address} should be blocked`,
    );
  }
});

test("blocks IPv4-mapped IPv6 addresses with private IPv4 targets", () => {
  const blockedAddresses = [
    "::ffff:127.0.0.1",
    "::ffff:10.0.0.1",
    "::ffff:169.254.169.254",
    "::ffff:192.168.1.1",
    "0:0:0:0:0:ffff:7f00:1",
  ];

  for (const address of blockedAddresses) {
    assert.equal(
      isBlockedAddress(address),
      true,
      `${address} should be blocked`,
    );
  }
});

test("rejects a loopback URL", async () => {
  await assert.rejects(assertSafeUrl("http://127.0.0.1/"));
});

test("rejects a private IPv4 URL", async () => {
  await assert.rejects(assertSafeUrl("http://192.168.1.1/"));
});

test("rejects a prohibited URL protocol", async () => {
  await assert.rejects(assertSafeUrl("file:///etc/passwd"));
});

test("rejects URLs containing embedded credentials", async () => {
  await assert.rejects(assertSafeUrl("http://user:password@example.com/"));
});

test("rejects malformed URLs", async () => {
  await assert.rejects(assertSafeUrl("not-a-valid-url"));
});

test("rejects DNS results containing both public and private addresses", async (t) => {
  t.mock.method(dns, "lookup", async () => [
    { address: "93.184.216.34", family: 4 },
    { address: "127.0.0.1", family: 4 },
  ]);

  await assert.rejects(
    resolveHostname("mixed.example"),
    /Resolved address is not permitted/,
  );
});

test("accepts DNS results containing only public addresses", async (t) => {
  t.mock.method(dns, "lookup", async () => [
    { address: "93.184.216.34", family: 4 },
    { address: "1.1.1.1", family: 4 },
  ]);

  const result = await resolveHostname("public.example");

  assert.deepEqual(result, {
    hostname: "public.example",
    addresses: ["93.184.216.34", "1.1.1.1"],
  });
});

test("rejects DNS lookup failures safely", async (t) => {
  t.mock.method(dns, "lookup", async () => {
    const error = new Error("Simulated DNS failure");
    error.code = "ENOTFOUND";
    throw error;
  });

  await assert.rejects(
    resolveHostname("unresolvable.example"),
    /Hostname could not be resolved safely/,
  );
});

test("rejects empty DNS results", async (t) => {
  t.mock.method(dns, "lookup", async () => []);

  await assert.rejects(
    resolveHostname("empty.example"),
    /Hostname did not resolve to an address/,
  );
});
