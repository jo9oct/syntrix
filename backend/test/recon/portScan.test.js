// STATUS: CREATED
// File: backend/test/recon/portScan.test.js

import test from "node:test";
import assert from "node:assert/strict";
import scanner, {
  scan,
  normalizePorts,
  DEFAULT_PORTS,
} from "../../src/recon/portScan/scanner.js";
import { createScanContext } from "../../src/engine/scanContext.js";

test("portScan - normalizePorts handles defaults and duplicates", () => {
  const defaults = normalizePorts();
  assert.equal(defaults.length, DEFAULT_PORTS.length);

  const custom = normalizePorts([80, 443, "8080", 443, 99999, -5, "invalid"]);
  assert.deepEqual(custom, [80, 443, 8080]);
});

test("portScan - scanner contract has id, name, description, run", () => {
  assert.equal(scanner.id, "portScan");
  assert.equal(typeof scanner.name, "string");
  assert.equal(typeof scanner.description, "string");
  assert.equal(typeof scanner.run, "function");
});

test("portScan - scan executes within scope and returns valid structure", async () => {
  const context = createScanContext({
    scan: { id: "test-scan" },
    target: { id: "test-target", url: "https://example.com" },
    selection: { selectedScannerIds: ["portScan"] },
    options: { portScan: { ports: [80, 443] } },
    ownerId: "test-owner",
  });

  const result = await scan(context);
  assert.equal(result.scannerId, "portScan");
  assert.equal(result.status, "completed");
  assert.equal(typeof result.data, "object");
  assert.ok(Array.isArray(result.findings));
  assert.ok(Array.isArray(result.evidence));
  assert.ok(Array.isArray(result.fingerprints));
});

