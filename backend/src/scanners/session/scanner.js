// STATUS: UPDATED
// File: src/scanners/session/scanner.js

import { get } from "../../request/request.js";
import { getAuthenticatedRequestOptions } from "../../request/authenticatedRequestOptions.js";
import { createSecurityEvidence } from "../shared/evidenceBuilder.js";
import { calculateConfidence } from "../shared/confidence.js";
import { normalizeFinding } from "../shared/findingNormalizer.js";
import {
  createSecurityScanner,
  getTargetUrl,
} from "../shared/scannerContract.js";
import { assertSafeUrl } from "../../recon/shared/resolver.js";

const parseSetCookie = (headers) => {
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
    };
  });
};

const scanner = createSecurityScanner({
  id: "security.session",
  name: "Session Security",
  description:
    "Checks Set-Cookie security attributes and reports potential weaknesses.",

  async run(context) {
    const targetUrl = getTargetUrl(context);

    await assertSafeUrl(targetUrl);

    const requestHeaders = context?.session?.getHeaders?.() ?? {};

    const authenticatedRequestOptions = getAuthenticatedRequestOptions(context);

    const response = await get(targetUrl, {
      signal: context?.signal,
      headers: requestHeaders,
      ...authenticatedRequestOptions,
    });

    const cookies = parseSetCookie(response.headers);
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

    return {
      data: {
        cookies,
      },
      findings,
      evidence: [
        createSecurityEvidence({
          request: {
            method: "GET",
            url: targetUrl,
            headers: requestHeaders,
          },
          response: {
            status: response.status,
            statusText: response.statusText,
            headers: response.headers,
          },
          metadata: {
            cookieValuesRedacted: true,
          },
        }),
      ],
      fingerprints: [],
      verificationRecords: [],
      metadata: {
        cancelled: context?.signal?.aborted === true,
        cookiesInspected: cookies.length,
        requestsTested: 1,
      },
    };
  },
});

export default scanner;
