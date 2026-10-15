/*
 * STATUS: UPDATED
 * File: src/scanners/authentication/scanner.js
 *
 * Public authentication inspection only.
 * Does not submit credentials or create accounts.
 */

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
const MAX_FINDINGS = 50;

const AUTH_PATH_PATTERN =
  /(?:login|log-in|signin|sign-in|authenticate|auth)(?:\/|$|[?#])/i;

const REGISTER_PATH_PATTERN =
  /(?:register|sign-up|signup|create-account|registration)(?:\/|$|[?#])/i;

const getChromiumExecutablePath = () =>
  process.env.PUPPETEER_EXECUTABLE_PATH || "/usr/bin/chromium";

const normalizeHttpUrl = (value) => {
  let parsed;

  try {
    parsed = new URL(value);
  } catch {
    throw new Error("Authentication scanner received an invalid target URL.");
  }

  if (
    !["http:", "https:"].includes(parsed.protocol) ||
    parsed.username ||
    parsed.password
  ) {
    throw new Error(
      "Authentication scanner requires a valid HTTP or HTTPS URL.",
    );
  }

  parsed.hash = "";

  return parsed;
};

const isSameOrigin = (candidate, origin) => {
  try {
    return new URL(candidate).origin === origin;
  } catch {
    return false;
  }
};

const classifyAuthPage = (url) => {
  if (REGISTER_PATH_PATTERN.test(url)) {
    return "registration";
  }

  if (AUTH_PATH_PATTERN.test(url)) {
    return "login";
  }

  return "authentication";
};

const makeFinding = ({
  title,
  description,
  severity,
  confidence,
  remediation,
  url,
}) =>
  normalizeFinding({
    scannerId: SCANNER_ID,
    title,
    description,
    severity,
    confidence: calculateConfidence({
      confirmed: confidence === "high",
    }),
    remediation,
    category: "authentication",
    evidence: {
      url,
    },
  });

const inspectRenderedPage = async (page) =>
  page.evaluate(() => {
    const forms = Array.from(document.forms).map((form) => {
      const method = (form.getAttribute("method") || "get")
        .trim()
        .toLowerCase();

      const rawAction = form.getAttribute("action");

      const action = rawAction
        ? new URL(rawAction, document.baseURI).href
        : window.location.href;

      const passwordFields = Array.from(
        form.querySelectorAll('input[type="password"]'),
      ).map((input) => ({
        autocomplete: (input.getAttribute("autocomplete") || "")
          .trim()
          .toLowerCase(),
        name: input.getAttribute("name") || "",
        id: input.id || "",
      }));

      return {
        method,
        action,
        hasPasswordField: passwordFields.length > 0,
        passwordFields,
        formType: passwordFields.length > 0 ? "password" : "other",
      };
    });

    const links = Array.from(document.querySelectorAll("a[href]"))
      .map((anchor) => {
        try {
          return new URL(anchor.getAttribute("href"), document.baseURI).href;
        } catch {
          return null;
        }
      })
      .filter(Boolean);

    return {
      url: window.location.href,
      title: document.title || "",
      forms,
      links,
      rendered: document.readyState,
    };
  });

const createSafeBrowser = async (targetOrigin) => {
  const browser = await puppeteer.launch({
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

  try {
    const page = await browser.newPage();

    page.setDefaultNavigationTimeout(NAVIGATION_TIMEOUT_MS);

    page.setDefaultTimeout(NAVIGATION_TIMEOUT_MS);

    await page.setRequestInterception(true);

    page.on("request", (request) => {
      let allowed = false;

      try {
        const url = new URL(request.url());

        allowed =
          ["http:", "https:"].includes(url.protocol) &&
          url.origin === targetOrigin;
      } catch {
        allowed = false;
      }

      if (allowed) {
        void request.continue().catch(() => {});
      } else {
        void request.abort().catch(() => {});
      }
    });

    return {
      browser,
      page,
    };
  } catch (error) {
    await browser.close().catch(() => {});
    throw error;
  }
};

const scanner = createSecurityScanner({
  id: SCANNER_ID,
  name: "Authentication Security",
  description:
    "Inspects publicly accessible, JavaScript-rendered login and registration forms without submitting credentials.",

  async run(context) {
    const target = normalizeHttpUrl(getTargetUrl(context));

    await assertSafeUrl(target.href);

    const targetOrigin = target.origin;
    const pendingUrls = [target.href];
    const queuedUrls = new Set(pendingUrls);
    const inspectedPages = [];
    const findings = [];
    const evidence = [];
    const findingKeys = new Set();

    let browser;
    let page;

    const addFinding = (finding) => {
      if (findings.length >= MAX_FINDINGS) {
        return;
      }

      const key = [finding.title, finding.evidence?.url ?? ""].join("|");

      if (findingKeys.has(key)) {
        return;
      }

      findingKeys.add(key);
      findings.push(finding);
    };

    try {
      const browserContext = await createSafeBrowser(targetOrigin);

      browser = browserContext.browser;
      page = browserContext.page;

      while (pendingUrls.length > 0 && inspectedPages.length < MAX_AUTH_PAGES) {
        if (context?.signal?.aborted) {
          break;
        }

        const currentUrl = pendingUrls.shift();

        if (!isSameOrigin(currentUrl, targetOrigin)) {
          continue;
        }

        await assertSafeUrl(currentUrl);

        let response;

        try {
          response = await page.goto(currentUrl, {
            waitUntil: "domcontentloaded",
            timeout: NAVIGATION_TIMEOUT_MS,
          });
        } catch {
          inspectedPages.push({
            url: currentUrl,
            status: "navigation_failed",
          });

          continue;
        }

        if (!response) {
          inspectedPages.push({
            url: currentUrl,
            status: "no_response",
          });

          continue;
        }

        const finalUrl = page.url();

        if (!isSameOrigin(finalUrl, targetOrigin)) {
          inspectedPages.push({
            url: currentUrl,
            status: "cross_origin_navigation_blocked",
          });

          continue;
        }

        // Allow a short period for client-rendered forms.
        await page
          .waitForSelector('form, input[type="password"], a[href]', {
            timeout: 1500,
          })
          .catch(() => {});

        if (context?.signal?.aborted) {
          break;
        }

        let inspection;

        try {
          inspection = await inspectRenderedPage(page);
        } catch {
          inspectedPages.push({
            url: finalUrl,
            status: "inspection_failed",
          });

          continue;
        }

        const statusCode = response.status();
        const responseHeaders = response.headers();
        const contentType = responseHeaders["content-type"] || "";

        inspectedPages.push({
          url: finalUrl,
          status: "inspected",
          statusCode,
          contentType,
          formCount: inspection.forms.length,
          passwordFormCount: inspection.forms.filter(
            (form) => form.hasPasswordField,
          ).length,
        });

        evidence.push(
          createSecurityEvidence({
            request: {
              method: "GET",
              url: finalUrl,
              // Deliberately exclude session and credential headers.
              headers: {
                accept: "text/html",
              },
            },
            response: {
              status: statusCode,
              statusText: response.statusText(),
              headers: {
                "content-type": contentType,
              },
            },
          }),
        );

        const pageType = classifyAuthPage(finalUrl);

        for (const form of inspection.forms) {
          if (!form.hasPasswordField) {
            continue;
          }

          const actionUrl = new URL(form.action);

          if (actionUrl.protocol === "http:") {
            addFinding(
              makeFinding({
                title: "Password Form Uses Insecure HTTP",
                description:
                  "A publicly rendered password form submits to an HTTP destination. Credentials submitted to that destination may be exposed in transit.",
                severity: "high",
                confidence: "high",
                remediation:
                  "Use HTTPS for the page and the form submission destination, and redirect HTTP requests to HTTPS.",
                url: finalUrl,
              }),
            );
          }

          if (form.method === "get") {
            addFinding(
              makeFinding({
                title: "Password Form Uses GET Method",
                description:
                  "A rendered password form uses GET. Form values may be placed in the URL and exposed through browser history, logs, or intermediary systems if the form is submitted.",
                severity: "high",
                confidence: "high",
                remediation:
                  "Use POST for password-bearing forms and ensure credentials are never placed in URLs.",
                url: finalUrl,
              }),
            );
          }

          if (actionUrl.origin !== targetOrigin) {
            addFinding(
              makeFinding({
                title: "Password Form Submits to Another Origin",
                description:
                  "A password form submits to a different origin. This may be intentional for federated authentication, but the destination should be verified.",
                severity: "medium",
                confidence: "high",
                remediation:
                  "Verify that the destination is an explicitly trusted authentication provider and that credential handling is intentional.",
                url: finalUrl,
              }),
            );
          }

          for (const passwordField of form.passwordFields) {
            const autocomplete = passwordField.autocomplete;

            if (!autocomplete) {
              addFinding(
                makeFinding({
                  title: "Password Field Has No Autocomplete Attribute",
                  description: `A password field on a publicly rendered ${pageType} form does not specify an autocomplete attribute.`,
                  severity: "info",
                  confidence: "high",
                  remediation:
                    pageType === "registration"
                      ? 'Consider autocomplete="new-password" for new password fields.'
                      : 'Consider autocomplete="current-password" for existing account password fields.',
                  url: finalUrl,
                }),
              );
            }
          }
        }

        for (const link of inspection.links) {
          if (
            queuedUrls.size >= MAX_AUTH_PAGES ||
            !isSameOrigin(link, targetOrigin)
          ) {
            continue;
          }

          const parsedLink = new URL(link);

          parsedLink.hash = "";

          const normalizedLink = parsedLink.href;

          const isAuthRoute =
            AUTH_PATH_PATTERN.test(
              `${parsedLink.pathname}${parsedLink.search}`,
            ) ||
            REGISTER_PATH_PATTERN.test(
              `${parsedLink.pathname}${parsedLink.search}`,
            );

          if (isAuthRoute && !queuedUrls.has(normalizedLink)) {
            queuedUrls.add(normalizedLink);
            pendingUrls.push(normalizedLink);
          }
        }
      }
    } finally {
      if (browser) {
        await browser.close().catch(() => {});
      }
    }

    return {
      data: {
        status: "completed",
        credentialRequired: false,
        credentialsSubmitted: false,
        pagesInspected: inspectedPages.length,
        publicAuthenticationPagesFound: inspectedPages.filter(
          (item) =>
            item.status === "inspected" &&
            (AUTH_PATH_PATTERN.test(item.url) ||
              REGISTER_PATH_PATTERN.test(item.url)),
        ).length,
        pages: inspectedPages,
        checksPerformed: [
          "javascript_rendered_public_page_inspection",
          "password_form_transport_security",
          "password_form_method",
          "password_form_destination",
          "password_field_autocomplete",
        ],
        checksNotPerformed: [
          "brute_force_protection",
          "account_enumeration",
          "password_policy_enforcement",
          "registration_submission",
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
