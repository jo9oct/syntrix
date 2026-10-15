// STATUS: UPDATED

const blockedProtocols = new Set([
  "file:",
  "ftp:",
  "gopher:",
  "data:",
  "javascript:",
]);

const blockedHostnames = new Set([
  "localhost",
  "localhost.localdomain",
  "metadata.google.internal",
  "metadata",
]);

const sensitiveHeaders = new Set([
  "authorization",
  "proxy-authorization",
  "cookie",
  "set-cookie",
  "x-api-key",
  "x-auth-token",
]);

const privateIpv4Ranges = Object.freeze([
  {
    name: "unspecified-and-current-network",
    start: "0.0.0.0",
    end: "0.255.255.255",
  },
  {
    name: "private-a",
    start: "10.0.0.0",
    end: "10.255.255.255",
  },
  {
    name: "shared-address-space",
    start: "100.64.0.0",
    end: "100.127.255.255",
  },
  {
    name: "loopback",
    start: "127.0.0.0",
    end: "127.255.255.255",
  },
  {
    name: "link-local",
    start: "169.254.0.0",
    end: "169.254.255.255",
  },
  {
    name: "private-b",
    start: "172.16.0.0",
    end: "172.31.255.255",
  },
  {
    name: "protocol-assignment",
    start: "192.0.0.0",
    end: "192.0.0.255",
  },
  {
    name: "documentation-1",
    start: "192.0.2.0",
    end: "192.0.2.255",
  },
  {
    name: "documentation-2",
    start: "198.51.100.0",
    end: "198.51.100.255",
  },
  {
    name: "documentation-3",
    start: "203.0.113.0",
    end: "203.0.113.255",
  },
  {
    name: "private-c",
    start: "192.168.0.0",
    end: "192.168.255.255",
  },
  {
    name: "benchmarking",
    start: "198.18.0.0",
    end: "198.19.255.255",
  },
  {
    name: "multicast",
    start: "224.0.0.0",
    end: "239.255.255.255",
  },
  {
    name: "reserved",
    start: "240.0.0.0",
    end: "255.255.255.255",
  },
]);

const securityLimits = Object.freeze({
  maxRequestBodyBytes: 1024 * 1024,
  maxUrlLength: 2048,
  maxHeaderValueLength: 8192,
  maxRedirects: 5,
});

const securityHeaders = Object.freeze({
  contentSecurityPolicy:
    "default-src 'none'; frame-ancestors 'none'; base-uri 'none'",
  frameOptions: "DENY",
  contentTypeOptions: "nosniff",
  referrerPolicy: "no-referrer",
  permissionsPolicy: "camera=(), microphone=(), geolocation=()",
  crossOriginOpenerPolicy: "same-origin",
  crossOriginResourcePolicy: "same-origin",
});

export {
  blockedProtocols,
  blockedHostnames,
  privateIpv4Ranges,
  sensitiveHeaders,
  securityLimits,
  securityHeaders,
};
