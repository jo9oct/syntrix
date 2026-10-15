/* STATUS: CREATED */
/* FILE: test/recon/shared/dnsRebinding.test.js */

import test from "node:test";
import assert from "node:assert/strict";

import { isBlockedAddress } from "../../../src/recon/shared/resolver.js";

test("blocks private addresses even when the hostname is public-looking", () => {
  const hostname = "public-looking.example";

  const addresses = [
    "127.0.0.1",
    "10.0.0.1",
    "172.16.0.1",
    "192.168.1.1",
    "169.254.169.254",
    "::1",
    "::ffff:127.0.0.1",
  ];

  assert.ok(hostname.includes("."));

  for (const address of addresses) {
    assert.equal(
      isBlockedAddress(address),
      true,
      `${hostname} resolving to ${address} must be blocked`,
    );
  }
});

test("does not classify a public IPv4 address as private", () => {
  assert.equal(isBlockedAddress("93.184.216.34"), false);
});

test("blocks private IPv4-mapped IPv6 destinations", () => {
  const addresses = [
    "::ffff:127.0.0.1",
    "::ffff:10.0.0.1",
    "::ffff:192.168.1.1",
    "0:0:0:0:0:ffff:7f00:1",
  ];

  for (const address of addresses) {
    assert.equal(isBlockedAddress(address), true, `${address} must be blocked`);
  }
});
