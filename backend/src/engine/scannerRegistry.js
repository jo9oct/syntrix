import * as portScanModule from "../recon/portScan/scanner.js";
import * as serviceDetectionModule from "../recon/serviceDetection/scanner.js";
import * as versionDetectionModule from "../recon/versionDetection/scanner.js";
import * as dnsModule from "../recon/dns/scanner.js";
import * as subdomainsModule from "../recon/subdomains/scanner.js";
import * as technologyModule from "../recon/technology/scanner.js";
import * as webServerModule from "../recon/webServer/scanner.js";
import * as sslModule from "../recon/ssl/scanner.js";
import * as robotsModule from "../recon/robots/scanner.js";
import * as sitemapModule from "../recon/sitemap/scanner.js";

import * as sqliModule from "../scanners/sqli/scanner.js";
import * as xssModule from "../scanners/xss/scanner.js";
import * as securityHeadersModule from "../scanners/securityHeaders/scanner.js";
import * as corsModule from "../scanners/cors/scanner.js";
import * as pathTraversalModule from "../scanners/pathTraversal/scanner.js";
import * as openRedirectModule from "../scanners/openRedirect/scanner.js";
import * as csrfModule from "../scanners/csrf/scanner.js";
import * as accessControlModule from "../scanners/accessControl/scanner.js";
import * as authenticationModule from "../scanners/authentication/scanner.js";
import * as sessionModule from "../scanners/session/scanner.js";
import * as ssrfModule from "../scanners/ssrf/scanner.js";
import * as commandInjectionModule from "../scanners/commandInjection/scanner.js";
import * as jwtModule from "../scanners/jwt/scanner.js";
import * as apiSecurityModule from "../scanners/apiSecurity/scanner.js";
import * as fileUploadModule from "../scanners/fileUpload/scanner.js";

const resolveScanner = (module, scannerId) => {
  if (
    module.default &&
    typeof module.default === "object" &&
    typeof module.default.run === "function"
  ) {
    return module.default;
  }

  if (typeof module.default === "function") {
    return {
      id: scannerId,
      run: module.default,
    };
  }

  const scannerObject = Object.values(module).find(
    (value) =>
      value && typeof value === "object" && typeof value.run === "function",
  );

  if (scannerObject) {
    return scannerObject;
  }

  const functionCandidates = [
    scannerId,
    `${scannerId}Scanner`,
    "scan",
    "scanner",
    "run",
  ];

  for (const candidate of functionCandidates) {
    if (typeof module[candidate] === "function") {
      return {
        id: scannerId,
        run: module[candidate],
      };
    }
  }

  const functions = Object.values(module).filter(
    (value) => typeof value === "function",
  );

  if (functions.length === 1) {
    return {
      id: scannerId,
      run: functions[0],
    };
  }

  throw new Error(
    `Scanner "${scannerId}" does not expose a supported scanner function or scanner object.`,
  );
};

const createScannerDefinition = (id, category, module) => {
  const scanner = resolveScanner(module, id);

  if (!scanner || typeof scanner.run !== "function") {
    throw new Error(`Scanner "${id}" must expose a run(context) function.`);
  }

  return Object.freeze({
    id,

    category,

    name: scanner.name ?? id,

    description: scanner.description ?? "",

    scanner,

    run: scanner.run,
  });
};

const reconScanners = Object.freeze([
  createScannerDefinition("portScan", "recon", portScanModule),

  createScannerDefinition("serviceDetection", "recon", serviceDetectionModule),

  createScannerDefinition("versionDetection", "recon", versionDetectionModule),

  createScannerDefinition("dns", "recon", dnsModule),

  createScannerDefinition("subdomains", "recon", subdomainsModule),

  createScannerDefinition("technology", "recon", technologyModule),

  createScannerDefinition("webServer", "recon", webServerModule),

  createScannerDefinition("ssl", "recon", sslModule),

  createScannerDefinition("robots", "recon", robotsModule),

  createScannerDefinition("sitemap", "recon", sitemapModule),
]);

const securityScanners = Object.freeze([
  createScannerDefinition("sqli", "security", sqliModule),

  createScannerDefinition("xss", "security", xssModule),

  createScannerDefinition("securityHeaders", "security", securityHeadersModule),

  createScannerDefinition("cors", "security", corsModule),

  createScannerDefinition("pathTraversal", "security", pathTraversalModule),

  createScannerDefinition("openRedirect", "security", openRedirectModule),

  createScannerDefinition("csrf", "security", csrfModule),

  createScannerDefinition("accessControl", "security", accessControlModule),

  createScannerDefinition("authentication", "security", authenticationModule),

  createScannerDefinition("session", "security", sessionModule),

  createScannerDefinition("ssrf", "security", ssrfModule),

  createScannerDefinition(
    "commandInjection",
    "security",
    commandInjectionModule,
  ),

  createScannerDefinition("jwt", "security", jwtModule),

  createScannerDefinition("apiSecurity", "security", apiSecurityModule),

  createScannerDefinition("fileUpload", "security", fileUploadModule),
]);

const allScanners = Object.freeze([...reconScanners, ...securityScanners]);

if (reconScanners.length !== 10) {
  throw new Error(
    `Scanner registry requires exactly 10 recon scanners. Found ${reconScanners.length}.`,
  );
}

if (securityScanners.length !== 15) {
  throw new Error(
    `Scanner registry requires exactly 15 security scanners. Found ${securityScanners.length}.`,
  );
}

if (allScanners.length !== 25) {
  throw new Error(
    `Scanner registry requires exactly 25 scanners. Found ${allScanners.length}.`,
  );
}

const scannerMap = new Map(allScanners.map((scanner) => [scanner.id, scanner]));

const getAllScanners = () => [...allScanners];

const getReconScanners = () => [...reconScanners];

const getSecurityScanners = () => [...securityScanners];

const getScanner = (scannerId) => scannerMap.get(scannerId) ?? null;

const resolveSelectedScanners = (selectedScannerIds = []) => {
  if (!Array.isArray(selectedScannerIds) || selectedScannerIds.length === 0) {
    throw new Error("At least one scanner must be selected.");
  }

  const uniqueIds = [...new Set(selectedScannerIds)];

  return uniqueIds.map((scannerId) => {
    const scanner = getScanner(scannerId);

    if (!scanner) {
      throw new Error(`Unknown scanner: ${scannerId}`);
    }

    return scanner;
  });
};

const hasScanner = (scannerId) => scannerMap.has(scannerId);

export {
  getAllScanners,
  getReconScanners,
  getSecurityScanners,
  getScanner,
  resolveSelectedScanners,
  hasScanner,
  reconScanners,
  securityScanners,
  allScanners,
};
