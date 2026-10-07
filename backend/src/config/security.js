const blockedProtocols =
  new Set([
    "file:",
    "ftp:",
    "gopher:",
    "data:",
    "javascript:"
  ]);

const blockedHostnames =
  new Set([
    "localhost",
    "localhost.localdomain",
    "metadata.google.internal",
    "metadata"
  ]);

const sensitiveHeaders =
  new Set([
    "authorization",
    "proxy-authorization",
    "cookie",
    "set-cookie",
    "x-api-key",
    "x-auth-token"
  ]);

const privateIpv4Ranges = Object.freeze([
  {
    name: "loopback",
    start: "127.0.0.0",
    end: "127.255.255.255"
  },
  {
    name: "private-a",
    start: "10.0.0.0",
    end: "10.255.255.255"
  },
  {
    name: "private-b",
    start: "172.16.0.0",
    end: "172.31.255.255"
  },
  {
    name: "private-c",
    start: "192.168.0.0",
    end: "192.168.255.255"
  },
  {
    name: "link-local",
    start: "169.254.0.0",
    end: "169.254.255.255"
  }
]);

const securityLimits = Object.freeze({
  maxRequestBodyBytes:
    1024 * 1024,

  maxUrlLength:
    2048,

  maxHeaderValueLength:
    8192,

  maxRedirects:
    5
});

const securityHeaders = Object.freeze({
  contentSecurityPolicy:
    "default-src 'none'; frame-ancestors 'none'; base-uri 'none'",

  frameOptions:
    "DENY",

  contentTypeOptions:
    "nosniff",

  referrerPolicy:
    "no-referrer",

  permissionsPolicy:
    "camera=(), microphone=(), geolocation=()",

  crossOriginOpenerPolicy:
    "same-origin",

  crossOriginResourcePolicy:
    "same-origin"
});

export {
  blockedProtocols,
  blockedHostnames,
  privateIpv4Ranges,
  sensitiveHeaders,
  securityLimits,
  securityHeaders
};