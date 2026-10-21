
 // STATUS: UPDATED

import dns from "node:dns/promises";
import net from "node:net";

import {
  blockedHostnames,
  privateIpv4Ranges,
} from "../../config/security.js";

import { SsrfProtectionError } from "../../utils/errors.js";

const ipv4ToNumber = (address) => {
  if (net.isIP(address) !== 4) {
    return null;
  }

  return address
    .split(".")
    .reduce((result, part) => result * 256 + Number(part), 0);
};

const isIpv4InRange = (address, range) => {
  const value = ipv4ToNumber(address);
  const start = ipv4ToNumber(range?.start);
  const end = ipv4ToNumber(range?.end);

  return (
    value !== null &&
    start !== null &&
    end !== null &&
    value >= start &&
    value <= end
  );
};

const normalizeIpv6 = (address) => {
  if (typeof address !== "string") {
    return null;
  }

  let value = address.toLowerCase();

  // Remove an IPv6 zone identifier.
  const zoneIndex = value.indexOf("%");

  if (zoneIndex !== -1) {
    value = value.slice(0, zoneIndex);
  }

  // Convert embedded IPv4 notation into two IPv6 groups.
  if (value.includes(".")) {
    const lastColon = value.lastIndexOf(":");

    if (lastColon === -1) {
      return null;
    }

    const ipv4 = value.slice(lastColon + 1);

    if (net.isIP(ipv4) !== 4) {
      return null;
    }

    const octets = ipv4.split(".").map(Number);
    const high = ((octets[0] << 8) | octets[1]).toString(16);
    const low = ((octets[2] << 8) | octets[3]).toString(16);

    value = `${value.slice(0, lastColon + 1)}${high}:${low}`;
  }

  if (net.isIP(value) !== 6) {
    return null;
  }

  const halves = value.split("::");

  if (halves.length > 2) {
    return null;
  }

  const parseGroups = (part) => (part ? part.split(":") : []);
  const left = parseGroups(halves[0]);
  const right = halves.length === 2 ? parseGroups(halves[1]) : [];
  const missing = 8 - left.length - right.length;

  if (
    (halves.length === 1 && missing !== 0) ||
    (halves.length === 2 && missing < 1)
  ) {
    return null;
  }

  const groups = [...left, ...Array(missing).fill("0"), ...right];

  if (
    groups.length !== 8 ||
    groups.some((group) => !/^[0-9a-f]{1,4}$/.test(group))
  ) {
    return null;
  }

  return groups.map((group) => group.padStart(4, "0")).join("");
};

const ipv6ToBigInt = (address) => {
  const normalized = normalizeIpv6(address);

  return normalized ? BigInt(`0x${normalized}`) : null;
};

const isIpv6InPrefix = (address, prefix, prefixLength) => {
  const value = ipv6ToBigInt(address);
  const prefixValue = ipv6ToBigInt(prefix);

  if (
    value === null ||
    prefixValue === null ||
    !Number.isInteger(prefixLength) ||
    prefixLength < 0 ||
    prefixLength > 128
  ) {
    return false;
  }

  if (prefixLength === 0) {
    return true;
  }

  const shift = 128n - BigInt(prefixLength);
  const mask = ((1n << BigInt(prefixLength)) - 1n) << shift;

  return (value & mask) === (prefixValue & mask);
};

const isIpv4MappedIpv6 = (address) => {
  const normalized = normalizeIpv6(address);

  return Boolean(
    normalized && normalized.startsWith("00000000000000000000ffff"),
  );
};

const getMappedIpv4 = (address) => {
  const normalized = normalizeIpv6(address);

  if (
    !normalized ||
    !normalized.startsWith("00000000000000000000ffff")
  ) {
    return null;
  }

  const hex = normalized.slice(-8);

  return [
    Number.parseInt(hex.slice(0, 2), 16),
    Number.parseInt(hex.slice(2, 4), 16),
    Number.parseInt(hex.slice(4, 6), 16),
    Number.parseInt(hex.slice(6, 8), 16),
  ].join(".");
};

const isBlockedIpv4 = (address) =>
  privateIpv4Ranges.some((range) => isIpv4InRange(address, range));

const isBlockedIpv6 = (address) => {
  const blockedPrefixes = [
    ["::", 128], // Unspecified
    ["::1", 128], // Loopback
    ["fc00::", 7], // Unique-local
    ["fe80::", 10], // Link-local
    ["ff00::", 8], // Multicast
    ["2001:db8::", 32], // Documentation
    ["2001::", 23], // Special-purpose range
    ["2002::", 16], // 6to4 transition addresses
    ["64:ff9b:1::", 48], // Local-use translation
  ];

  return blockedPrefixes.some(([prefix, length]) =>
    isIpv6InPrefix(address, prefix, length),
  );
};

const isBlockedAddress = (address) => {
  const version = net.isIP(address);

  if (version === 4) {
    return isBlockedIpv4(address);
  }

  if (version !== 6) {
    return true;
  }

  if (isBlockedIpv6(address)) {
    return true;
  }

  if (isIpv4MappedIpv6(address)) {
    const mappedIpv4 = getMappedIpv4(address);

    return mappedIpv4 === null || isBlockedIpv4(mappedIpv4);
  }

  return false;
};

const assertSafeAddress = (address) => {
  if (
    typeof address !== "string" ||
    net.isIP(address) === 0 ||
    isBlockedAddress(address)
  ) {
    throw new SsrfProtectionError(
      "Resolved address is not permitted for security assessment.",
    );
  }

  return address;
};

const assertSafeHostname = (hostname) => {
  if (typeof hostname !== "string" || !hostname.trim()) {
    throw new SsrfProtectionError("Hostname is required.");
  }

  const normalized = hostname.trim().toLowerCase().replace(/\.$/, "");

  if (!normalized || blockedHostnames.has(normalized)) {
    throw new SsrfProtectionError(
      "Hostname is not permitted for security assessment.",
    );
  }

  // IP literals must be validated as addresses, not DNS names.
  if (net.isIP(normalized)) {
    assertSafeAddress(normalized);
    return normalized;
  }

  // Reject ambiguous hostnames, URL syntax, and malformed DNS labels.
  if (
    normalized.length > 253 ||
    normalized.includes("://") ||
    normalized.includes("/") ||
    normalized.includes("@") ||
    normalized.includes(":") ||
    /\s/.test(normalized)
  ) {
    throw new SsrfProtectionError("Hostname format is not permitted.");
  }

  const labels = normalized.split(".");

  if (
    labels.some(
      (label) =>
        !label ||
        label.length > 63 ||
        !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(label),
    )
  ) {
    throw new SsrfProtectionError("Hostname format is not permitted.");
  }

  return normalized;
};

const resolveHostname = async (hostname) => {
  const normalizedHostname = assertSafeHostname(hostname);

  if (net.isIP(normalizedHostname)) {
    return {
      hostname: normalizedHostname,
      addresses: [assertSafeAddress(normalizedHostname)],
    };
  }

  let records;

  try {
    records = await dns.lookup(normalizedHostname, {
      all: true,
      verbatim: true,
    });
  } catch {
    // Do not expose underlying DNS errors to callers.
    throw new SsrfProtectionError(
      "Hostname could not be resolved safely.",
    );
  }

    if (!Array.isArray(records) || records.length === 0) {
    throw new SsrfProtectionError(
      "Hostname did not resolve to an address.",
    );
  }

  const addresses = [
    ...new Set(records.map((record) => record.address)),
  ];

  // Fail closed if even one returned address is prohibited.
  for (const address of addresses) {
    assertSafeAddress(address);
  }

  return {
    hostname: normalizedHostname,
    addresses,
  };
};

const resolveAndValidateHostname = async (hostname) =>
  resolveHostname(hostname);

const resolveDnsRecords = async (hostname) => {
  const normalizedHostname = assertSafeHostname(hostname);

  const resolveRecord = async (resolver) => {
    try {
      return await resolver();
    } catch (error) {
      if (["ENODATA", "ENOTFOUND", "ENODEV"].includes(error?.code)) {
        return [];
      }

      throw error;
    }
  };

  const [a, aaaa, cname, mx, ns, txt] = await Promise.all([
    resolveRecord(() => dns.resolve4(normalizedHostname)),
    resolveRecord(() => dns.resolve6(normalizedHostname)),
    resolveRecord(() => dns.resolveCname(normalizedHostname)),
    resolveRecord(() => dns.resolveMx(normalizedHostname)),
    resolveRecord(() => dns.resolveNs(normalizedHostname)),
    resolveRecord(() => dns.resolveTxt(normalizedHostname)),
  ]);

  // Informational DNS records do not authorize outbound connections.
  // Outbound requests must still use resolveHostname() and connection-time
  // address validation.
  return {
    hostname: normalizedHostname,
    A: a.filter((address) => !isBlockedAddress(address)),
    AAAA: aaaa.filter((address) => !isBlockedAddress(address)),
    CNAME: cname,
    MX: mx,
    NS: ns,
    TXT: txt,
  };
};

const assertSafeUrl = async (value) => {
  let parsedUrl;

  try {
    parsedUrl = new URL(value);
  } catch {
    throw new SsrfProtectionError("Invalid target URL.");
  }

  if (!["http:", "https:"].includes(parsedUrl.protocol)) {
    throw new SsrfProtectionError(
      "Only HTTP and HTTPS URLs are permitted.",
    );
  }

  if (parsedUrl.username || parsedUrl.password) {
    throw new SsrfProtectionError(
      "URLs containing embedded credentials are not permitted.",
    );
  }

  const resolved = await resolveHostname(parsedUrl.hostname);

  return {
    url: parsedUrl,
    hostname: resolved.hostname,
    addresses: resolved.addresses,
  };
};

export {
  assertSafeAddress,
  assertSafeHostname,
  assertSafeUrl,
  isBlockedAddress,
  resolveAndValidateHostname,
  resolveDnsRecords,
  resolveHostname,
};
