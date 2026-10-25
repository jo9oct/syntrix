// STATUS: UPDATED
// File: src/scanners/session/cookieAttributes.js

import { calculateConfidence } from "../shared/confidence.js";
import { normalizeFinding } from "../shared/findingNormalizer.js";

export const parseSetCookie = (headers) => {
  const raw = headers?.["set-cookie"] ?? headers?.["Set-Cookie"];

  if (!raw) {
    return [];
  }

  const values = Array.isArray(raw) ? raw : [raw];

  return values.map((cookie) => {
    const parts = String(cookie).split(";");
    const nameValue = parts[0] ?? "";
    const separatorIndex = nameValue.indexOf("=");

    const name =
      separatorIndex >= 0 ? nameValue.slice(0, separatorIndex).trim() : null;

    const attributes = new Map();

    for (const part of parts.slice(1)) {
      const [rawName, ...rawValue] = part.trim().split("=");
      if (!rawName) continue;

      attributes.set(
        rawName.toLowerCase(),
        rawValue.join("=").trim().toLowerCase(),
      );
    }

    const sameSiteValue = attributes.get("samesite");
    const maxAgeRaw = attributes.get("max-age");
    const maxAge = maxAgeRaw ? parseInt(maxAgeRaw, 10) : null;

    return {
      name,
      secure: attributes.has("secure"),
      httpOnly: attributes.has("httponly"),
      sameSite:
        sameSiteValue === "strict" ||
        sameSiteValue === "lax" ||
        sameSiteValue === "none"
          ? sameSiteValue
          : null,
      maxAge: !isNaN(maxAge) ? maxAge : null,
      expires: attributes.get("expires") ?? null,
      path: attributes.get("path") ?? null,
      domain: attributes.get("domain") ?? null,
    };
  });
};

export const checkCookieAttributes = (cookies = []) => {
  const findings = [];

  for (const cookie of cookies) {
    const cookieName = cookie.name || "(unnamed cookie)";

    if (!cookie.secure) {
      findings.push(
        normalizeFinding({
          scannerId: "security.session",
          title: "Cookie Missing Secure Attribute",
          description: `Cookie "${cookieName}" does not expose the Secure attribute. Verify whether it carries session or authentication state.`,
          severity: "medium",
          confidence: calculateConfidence({
            confirmed: false,
          }),
          remediation:
            "Set Secure on cookies carrying session or authentication state and serve them over HTTPS.",
          category: "session",
          metadata: {
            cookieName,
            attribute: "Secure",
          },
        }),
      );
    }

    if (!cookie.httpOnly) {
      findings.push(
        normalizeFinding({
          scannerId: "security.session",
          title: "Cookie Missing HttpOnly Attribute",
          description: `Cookie "${cookieName}" does not expose the HttpOnly attribute. Verify whether client-side JavaScript needs access to it.`,
          severity: "medium",
          confidence: calculateConfidence({
            confirmed: false,
          }),
          remediation:
            "Set HttpOnly on cookies carrying session or authentication state unless client-side access is explicitly required.",
          category: "session",
          metadata: {
            cookieName,
            attribute: "HttpOnly",
          },
        }),
      );
    }

    if (!cookie.sameSite) {
      findings.push(
        normalizeFinding({
          scannerId: "security.session",
          title: "Cookie Missing Explicit SameSite Attribute",
          description: `Cookie "${cookieName}" does not explicitly define a recognized SameSite value.`,
          severity: "low",
          confidence: calculateConfidence({
            confirmed: false,
          }),
          remediation:
            "Configure an appropriate SameSite policy for session cookies based on the application's cross-site requirements.",
          category: "session",
          metadata: {
            cookieName,
            attribute: "SameSite",
          },
        }),
      );
    }
  }

  return { findings };
};

