import { get } from "../../request/request.js";
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
    const lower = String(cookie).toLowerCase();

    return {
      secure: lower.includes("; secure"),
      httpOnly: lower.includes("; httponly"),
      sameSite: lower.includes("; samesite=strict")
        ? "strict"
        : lower.includes("; samesite=lax")
          ? "lax"
          : lower.includes("; samesite=none")
            ? "none"
            : null,
      name: String(cookie).split(";")[0]?.split("=")[0]?.trim() ?? null,
    };
  });
};

const scanner = createSecurityScanner({
  id: "security.session",
  name: "Session Security",
  description: "Checks session-cookie security attributes.",

  async run(context) {
    const targetUrl = getTargetUrl(context);

    await assertSafeUrl(targetUrl);

    const response = await get(targetUrl, {
      signal: context?.signal,
      headers: context?.session?.getHeaders?.() ?? {},
    });

    const cookies = parseSetCookie(response.headers);

    const findings = [];

    for (const cookie of cookies) {
      if (!cookie.secure) {
        findings.push(
          normalizeFinding({
            scannerId: "security.session",
            title: "Session Cookie Missing Secure Attribute",
            description: `Cookie "${cookie.name}" does not expose the Secure attribute.`,
            severity: "medium",
            confidence: calculateConfidence({
              confirmed: true,
            }),
            remediation:
              "Set Secure on cookies carrying session or authentication state.",
            category: "session",
          }),
        );
      }

      if (!cookie.httpOnly) {
        findings.push(
          normalizeFinding({
            scannerId: "security.session",
            title: "Session Cookie Missing HttpOnly Attribute",
            description: `Cookie "${cookie.name}" does not expose the HttpOnly attribute.`,
            severity: "medium",
            confidence: calculateConfidence({
              confirmed: true,
            }),
            remediation:
              "Set HttpOnly on cookies carrying session or authentication state.",
            category: "session",
          }),
        );
      }

      if (!cookie.sameSite) {
        findings.push(
          normalizeFinding({
            scannerId: "security.session",
            title: "Session Cookie Missing SameSite Attribute",
            description: `Cookie "${cookie.name}" does not explicitly define SameSite.`,
            severity: "low",
            confidence: calculateConfidence({
              confirmed: true,
            }),
            remediation:
              "Configure an appropriate SameSite policy for session cookies.",
            category: "session",
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
            headers: context?.session?.getHeaders?.() ?? {},
          },
          response: {
            status: response.status,
            statusText: response.statusText,
            headers: response.headers,
          },
        }),
      ],
    };
  },
});

export default scanner;
