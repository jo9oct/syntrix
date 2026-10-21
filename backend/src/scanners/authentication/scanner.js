// STATUS: UPDATED
// File: src/scanners/authentication/scanner.js

import puppeteer from "puppeteer-core";

import { createSecurityEvidence } from "../shared/evidenceBuilder.js";
import { calculateConfidence } from "../shared/confidence.js";
import { normalizeFinding } from "../shared/findingNormalizer.js";
import {
  createSecurityScanner,
  getTargetUrl,
} from "../shared/scannerContract.js";
import { assertSafeUrl } from "../../recon/shared/resolver.js";

const SCANNER_ID = "security.authentication";

const MAX_AUTH_PAGES = 6;
const NAVIGATION_TIMEOUT_MS = 15000;
const PAGE_RENDER_TIMEOUT_MS = 3000;
const MAX_FINDINGS = 50;

const LOGIN_PATTERN =
  /(?:login|log-in|signin|sign-in|authenticate|auth)(?:\/|$|[?#])/i;

const REGISTER_PATTERN =
  /(?:register|sign-up|signup|create-account|registration)(?:\/|$|[?#])/i;

const createCancellationError = () => {
  const error = new Error("Authentication scan cancelled.");
  error.code = "SCAN_CANCELLED";
  return error;
};

const throwIfCancelled = (signal) => {
  if (signal?.aborted) {
    throw createCancellationError();
  }
};

const getChromiumExecutablePath = () =>
  process.env.PUPPETEER_EXECUTABLE_PATH || "/usr/bin/chromium";

function safeUrl(rawUrl, baseUrl) {
  try {
    const parsed = new URL(rawUrl, baseUrl);

    if (
      !["http:", "https:"].includes(parsed.protocol) ||
      parsed.username ||
      parsed.password
    ) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

function classifyAuthUrl(rawUrl) {
  try {
    const url = new URL(rawUrl);
    const candidate = `${url.pathname} ${url.search}`;

    if (REGISTER_PATTERN.test(candidate)) {
      return "registration";
    }

    if (LOGIN_PATTERN.test(candidate)) {
      return "login";
    }

    return null;
  } catch {
    return null;
  }
}

function makeFinding({ title, description, severity, remediation }) {
  return normalizeFinding({
    scannerId: SCANNER_ID,
    title,
    description,
    severity,
    confidence: calculateConfidence({
      confirmed: false,
    }),
    remediation,
    category: "authentication",
  });
}

function addFinding(findings, finding) {
  if (findings.length >= MAX_FINDINGS) {
    return;
  }

  const key = `${finding.title}:${finding.description}`;

  if (
    findings.some(
      (existing) => `${existing.title}:${existing.description}` === key,
    )
  ) {
    return;
  }

  findings.push(finding);
}

async function inspectRenderedPage(page) {
  return page.evaluate(() => {
    const resolveUrl = (rawUrl, baseUrl) => {
      try {
        const url = new URL(rawUrl, baseUrl);

        if (
          !["http:", "https:"].includes(url.protocol) ||
          url.username ||
          url.password
        ) {
          return null;
        }

        return url.href;
      } catch {
        return null;
      }
    };

    const forms = [...document.querySelectorAll("form")].map((form) => {
      const action = resolveUrl(
        form.getAttribute("action") || document.URL,
        document.baseURI,
      );

      const passwordInputs = [
        ...form.querySelectorAll('input[type="password"]'),
      ].map((input) => ({
        autocomplete: (input.getAttribute("autocomplete") || "")
          .trim()
          .toLowerCase(),
      }));

      return {
        action,
        method: (form.getAttribute("method") || "get").trim().toLowerCase(),
        passwordInputs,
      };
    });

    const uncontainedPasswordInputs = [
      ...document.querySelectorAll('input[type="password"]'),
    ]
      .filter((input) => !input.closest("form"))
      .map((input) => ({
        autocomplete: (input.getAttribute("autocomplete") || "")
          .trim()
          .toLowerCase(),
      }));

    const links = [...document.querySelectorAll("a[href]")]
      .map((anchor) => ({
        url: resolveUrl(anchor.href, document.baseURI),
        text: (anchor.innerText || anchor.textContent || "")
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 120),
      }))
      .filter((link) => link.url);

    return {
      url: document.URL,
      forms,
      uncontainedPasswordInputs,
      links,
      passwordFieldCount: document.querySelectorAll('input[type="password"]')
        .length,
    };
  });
}

const scanner = createSecurityScanner({
  id: SCANNER_ID,
  name: "Authentication Security",
  description:
    "Inspects public login and registration pages using Chromium without submitting credentials or forms.",

  async run(context) {
    const signal = context?.signal;
    const rawTarget = getTargetUrl(context);
    const target = safeUrl(rawTarget, rawTarget);

    if (!target) {
      throw new Error("Authentication scanner received an invalid target URL.");
    }

    await assertSafeUrl(target.href);
    throwIfCancelled(signal);

    const findings = [];
    const evidence = [];
    const pages = [];
    const visited = new Set();
    const pending = new Map();

    pending.set(target.href, "target");

    let browser;

    try {
      browser = await puppeteer.launch({
        executablePath: getChromiumExecutablePath(),
        headless: true,
        timeout: NAVIGATION_TIMEOUT_MS,
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--disable-gpu",
        ],
      });

      throwIfCancelled(signal);

      const page = await browser.newPage();

      page.setDefaultNavigationTimeout(NAVIGATION_TIMEOUT_MS);
      page.setDefaultTimeout(NAVIGATION_TIMEOUT_MS);

      // Do not transfer scan-session credentials or cookies to Chromium.
      // Permit network requests only to the exact target origin.
      await page.setRequestInterception(true);

      page.on("request", (request) => {
        let allowed = false;

        try {
          const requestedUrl = new URL(request.url());

          allowed =
            ["http:", "https:"].includes(requestedUrl.protocol) &&
            requestedUrl.origin === target.origin;
        } catch {
          allowed = false;
        }

        if (allowed && !signal?.aborted) {
          void request.continue().catch(() => {});
        } else {
          void request.abort().catch(() => {});
        }
      });

      while (
        pending.size > 0 &&
        visited.size < MAX_AUTH_PAGES &&
        !signal?.aborted
      ) {
        const [pageUrl, discoveredType] = pending.entries().next().value;

        pending.delete(pageUrl);

        if (visited.has(pageUrl)) {
          continue;
        }

        const parsedPageUrl = safeUrl(pageUrl, target.href);

        if (!parsedPageUrl || parsedPageUrl.origin !== target.origin) {
          continue;
        }

        throwIfCancelled(signal);
        await assertSafeUrl(parsedPageUrl.href);
        throwIfCancelled(signal);

        visited.add(parsedPageUrl.href);

        let response;

        try {
          response = await page.goto(parsedPageUrl.href, {
            waitUntil: "domcontentloaded",
            timeout: NAVIGATION_TIMEOUT_MS,
          });
        } catch {
          if (signal?.aborted) {
            break;
          }

          continue;
        }

        if (signal?.aborted) {
          break;
        }

        const finalUrl = safeUrl(page.url(), target.href);

        if (!finalUrl || finalUrl.origin !== target.origin) {
          continue;
        }

        await page
          .waitForSelector('form, input[type="password"], a[href]', {
            timeout: PAGE_RENDER_TIMEOUT_MS,
          })
          .catch(() => {});

        if (signal?.aborted) {
          break;
        }

        let rendered;

        try {
          rendered = await inspectRenderedPage(page);
        } catch {
          if (signal?.aborted) {
            break;
          }

          continue;
        }

        const responseStatus = response?.status() ?? null;
        const pageType = classifyAuthUrl(parsedPageUrl.href) || discoveredType;

        pages.push({
          url: parsedPageUrl.href,
          type: pageType,
          status: responseStatus,
          renderedDomInspected: true,
          formCount: rendered.forms.length,
          passwordFieldCount: rendered.passwordFieldCount,
          uncontainedPasswordFieldCount:
            rendered.uncontainedPasswordInputs.length,
        });

        try {
          evidence.push(
            createSecurityEvidence({
              request: {
                method: "GET",
                url: parsedPageUrl.href,
                headers: {
                  accept: "text/html",
                },
              },
              response: {
                status: responseStatus,
                statusText: "",
                headers: {
                  "content-type": response?.headers()?.["content-type"] || "",
                },
              },
            }),
          );
        } catch {
          // Evidence failures must not stop the scan.
        }

        for (const link of rendered.links) {
          if (visited.size + pending.size >= MAX_AUTH_PAGES) {
            break;
          }

          const linkUrl = safeUrl(link.url, target.href);

          if (
            !linkUrl ||
            linkUrl.origin !== target.origin ||
            visited.has(linkUrl.href) ||
            pending.has(linkUrl.href)
          ) {
            continue;
          }

          const linkType = classifyAuthUrl(linkUrl.href);
          const labelType = classifyAuthUrl(
            `https://local.invalid/${link.text}`,
          );

          const authType = linkType || labelType;

          if (authType) {
            pending.set(linkUrl.href, authType);
          }
        }

        for (const form of rendered.forms) {
          if (form.passwordInputs.length === 0) {
            continue;
          }

          const formAction = form.action
            ? safeUrl(form.action, parsedPageUrl.href)
            : null;

          const transportIsInsecure =
            parsedPageUrl.protocol !== "https:" ||
            !formAction ||
            formAction.protocol !== "https:";

          if (transportIsInsecure) {
            addFinding(
              findings,
              makeFinding({
                title: "Password Form Uses Insecure HTTP",
                description:
                  "A rendered password form is served over HTTP, has an invalid action, or submits over HTTP. Verify the form's intended destination; the scanner did not submit it.",
                severity: "high",
                remediation:
                  "Serve authentication pages exclusively over HTTPS and ensure password forms submit only to trusted HTTPS endpoints. Configure HSTS where appropriate.",
              }),
            );
          }

          if (form.method === "get") {
            addFinding(
              findings,
              makeFinding({
                title: "Password Form Uses GET Method",
                description:
                  "A rendered password form uses GET, which may expose submitted values in URLs, browser history, or logs. The scanner did not submit the form.",
                severity: "high",
                remediation:
                  "Use POST for password forms and protect authentication traffic with HTTPS.",
              }),
            );
          }

          if (!formAction) {
            addFinding(
              findings,
              makeFinding({
                title: "Password Form Has an Invalid Action",
                description:
                  "A rendered password form has an invalid or unresolved action URL. Review the form configuration.",
                severity: "medium",
                remediation:
                  "Configure a valid, explicitly trusted HTTPS authentication destination.",
              }),
            );
          }

          for (const input of form.passwordInputs) {
            if (input.autocomplete) {
              continue;
            }

            addFinding(
              findings,
              makeFinding({
                title: "Password Field Missing Autocomplete Guidance",
                description:
                  "A rendered password field does not declare an autocomplete value. This is a configuration observation, not proof of an authentication bypass.",
                severity: "info",
                remediation:
                  'Set autocomplete="current-password" for login fields or autocomplete="new-password" for password-creation fields.',
              }),
            );
          }
        }

        for (const input of rendered.uncontainedPasswordInputs) {
          if (input.autocomplete) {
            continue;
          }

          addFinding(
            findings,
            makeFinding({
              title: "Password Field Missing Autocomplete Guidance",
              description:
                "A rendered password field outside a native form does not declare an autocomplete value. This is a configuration observation, not proof of an authentication bypass.",
              severity: "info",
              remediation:
                'Set autocomplete="current-password" for login fields or autocomplete="new-password" for password-creation fields.',
            }),
          );
        }
      }
    } finally {
      if (browser) {
        await browser.close().catch(() => {});
      }
    }

    const publicAuthPages = pages.filter(
      (page) => page.type === "login" || page.type === "registration",
    );

    return {
      data: {
        status: signal?.aborted ? "cancelled" : "completed",
        credentialRequired: false,
        credentialsSubmitted: false,
        pagesInspected: pages.length,
        publicAuthenticationPagesFound: publicAuthPages.length,
        pages,
        checksPerformed: [
          "javascript_rendered_public_page_inspection",
          "public_login_and_registration_page_discovery",
          "password_form_transport_security",
          "password_form_method",
          "password_form_destination",
          "password_field_autocomplete",
        ],
        checksNotProvenByThisScan: [
          "brute_force_protection",
          "account_enumeration",
          "password_policy_enforcement",
          "registration_completion",
          "email_verification",
          "authenticated_access_control",
        ],
      },
      findings,
      evidence,
    };
  },
});

export default scanner;
