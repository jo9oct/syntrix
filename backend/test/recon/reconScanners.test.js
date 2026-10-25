import test from "node:test";
import assert from "node:assert/strict";

import portScanner from "../../src/recon/portScan/scanner.js";
import serviceScanner from "../../src/recon/serviceDetection/scanner.js";
import versionScanner from "../../src/recon/versionDetection/scanner.js";
import dnsScanner from "../../src/recon/dns/scanner.js";
import subdomainsScanner from "../../src/recon/subdomains/scanner.js";
import technologyScanner from "../../src/recon/technology/scanner.js";
import webServerScanner from "../../src/recon/webServer/scanner.js";
import sslScanner from "../../src/recon/ssl/scanner.js";
import robotsScanner from "../../src/recon/robots/scanner.js";
import sitemapScanner from "../../src/recon/sitemap/scanner.js";

import { createScanContext } from "../../src/engine/scanContext.js";

const RECON_SCANNERS = [
  { name: "portScan", scanner: portScanner },
  { name: "serviceDetection", scanner: serviceScanner },
  { name: "versionDetection", scanner: versionScanner },
  { name: "dns", scanner: dnsScanner },
  { name: "subdomains", scanner: subdomainsScanner },
  { name: "technology", scanner: technologyScanner },
  { name: "webServer", scanner: webServerScanner },
  { name: "ssl", scanner: sslScanner },
  { name: "robots", scanner: robotsScanner },
  { name: "sitemap", scanner: sitemapScanner },
];

test("recon scanners adhere to engine contract", () => {
  for (const { name, scanner } of RECON_SCANNERS) {
    assert.equal(typeof scanner.id, "string", `${name} has string id`);
    assert.equal(typeof scanner.name, "string", `${name} has string name`);
    assert.equal(typeof scanner.description, "string", `${name} has string description`);
    assert.equal(typeof scanner.run, "function", `${name} has run function`);
  }
});

test("recon scanners execute reliably on target without throwing uncaught errors", async () => {
  const target = { id: "target-recon-test", url: "https://example.com" };

  for (const { name, scanner } of RECON_SCANNERS) {
    const context = createScanContext({
      scan: { id: `recon-${name}-test` },
      target,
      selection: { selectedScannerIds: [scanner.id] },
      options: {
        portScan: { ports: [80, 443] },
        subdomains: { wordlist: false, certificateTransparency: false, publicSources: false, recursive: false },
      },
      ownerId: "recon-test-owner",
    });

    const result = await scanner.run(context);
    assert.ok(result, `${name} returned result`);
    assert.equal(result.status, "completed", `${name} returned completed status`);
    assert.ok(result.data !== undefined, `${name} returned data object`);
    assert.ok(Array.isArray(result.findings), `${name} returned findings array`);
    assert.ok(Array.isArray(result.evidence), `${name} returned evidence array`);
    assert.ok(Array.isArray(result.fingerprints), `${name} returned fingerprints array`);
  }
});

