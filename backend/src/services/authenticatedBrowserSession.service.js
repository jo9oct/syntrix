
/* STATUS: UPDATED */
/* FILE: src/services/authenticatedBrowserSession.service.js */

import puppeteer from "puppeteer-core";
import { assertSafeUrl } from "../recon/shared/resolver.js";

const NAVIGATION_TIMEOUT_MS = 15000;
const LOGIN_DETECTION_TIMEOUT_MS = 2000;
const MAX_SESSION_COOKIE_LENGTH = 8192;

const getChromiumExecutablePath = () =>
  process.env.PUPPETEER_EXECUTABLE_PATH || "/usr/bin/chromium";

const createAuthenticationError = (code, message) => {
  const error = new Error(message);
  error.code = code;
  return error;
};

const normalizeTargetUrl = (value) => {
  let target;

  try {
    target = new URL(value);
  } catch {
    throw createAuthenticationError(
      "AUTH_INVALID_TARGET",
      "A valid HTTP or HTTPS target URL is required.",
    );
  }

  if (
    !["http:", "https:"].includes(target.protocol) ||
    target.username ||
    target.password ||
    !target.hostname
  ) {
    throw createAuthenticationError(
      "AUTH_INVALID_TARGET",
      "The authentication target URL is invalid.",
    );
  }

  target.hash = "";
  return target;
};

/*
 * Accept Cookie-header pairs only:
 * session=abc; csrf=def
 *
 * Do not accept Set-Cookie attributes such as Domain, Path,
 * Secure, HttpOnly, or SameSite as independent cookie pairs.
 */
const parseSessionCookie = (value) => {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > MAX_SESSION_COOKIE_LENGTH ||
    /[\r\n\0]/.test(value)
  ) {
    throw createAuthenticationError(
      "AUTH_COOKIE_INVALID",
      "The session cookie is missing or has an invalid format.",
    );
  }

  const parts = value.split(";");
  const cookies = [];
  const seenNames = new Set();

  for (const part of parts) {
    const separatorIndex = part.indexOf("=");

    if (separatorIndex <= 0) {
      throw createAuthenticationError(
        "AUTH_COOKIE_INVALID",
        "The session cookie contains an invalid cookie pair.",
      );
    }

    const name = part.slice(0, separatorIndex).trim();
    const cookieValue = part.slice(separatorIndex + 1).trim();

    if (
      !/^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/.test(name) ||
      /[\x00-\x20\x7f;,]/.test(cookieValue) ||
      seenNames.has(name)
    ) {
      throw createAuthenticationError(
        "AUTH_COOKIE_INVALID",
        "The session cookie contains an invalid or duplicate cookie.",
      );
    }

    /*
     * Cookie values are intentionally restricted to cookie-octets.
     * Encode special data according to the target application's
     * documented cookie format before submitting it.
     */
    if (!/^[\x21\x23-\x2B\x2D-\x3A\x3C-\x5B\x5D-\x7E]*$/.test(cookieValue)) {
      throw createAuthenticationError(
        "AUTH_COOKIE_INVALID",
        "The session cookie contains an unsupported value.",
      );
    }

    seenNames.add(name);
    cookies.push({ name, value: cookieValue });
  }

  if (cookies.length === 0) {
    throw createAuthenticationError(
      "AUTH_COOKIE_INVALID",
      "At least one session cookie is required.",
    );
  }

  return cookies;
};

const detectAuthenticationChallenge = async (page) =>
  page.evaluate(() => {
    const text = (document.body?.innerText || "").toLowerCase();

    const captchaDetected =
      document.querySelector(
        [
          'iframe[src*="captcha"]',
          'iframe[src*="recaptcha"]',
          'iframe[src*="hcaptcha"]',
          '[class*="captcha"]',
          '[id*="captcha"]',
          "[data-sitekey]",
        ].join(","),
      ) !== null;

    const mfaDetected =
      /two.factor|two-factor|multi.factor|verification code|one.time password|authenticator code|security code/.test(
        text,
      ) ||
      document.querySelector(
        [
          'input[autocomplete="one-time-code"]',
          'input[name*="otp" i]',
          'input[name*="totp" i]',
        ].join(","),
      ) !== null;

    return { captchaDetected, mfaDetected };
  });

const findLoginForm = async (page) =>
  page.evaluate(() => {
    const forms = Array.from(document.forms);

    const candidates = forms
      .map((form) => {
        const password = form.querySelector('input[type="password"]');

        if (!password) {
          return null;
        }

        let action;

        try {
          action = new URL(
            form.getAttribute("action") || location.href,
            document.baseURI,
          );
        } catch {
          return null;
        }

        const username = form.querySelector(
          [
            'input[autocomplete="username"]',
            'input[type="email"]',
            'input[name*="user" i]',
            'input[id*="user" i]',
            'input[name*="email" i]',
            'input[id*="email" i]',
            'input[type="text"]',
          ].join(","),
        );

        if (
          action.origin !== location.origin ||
          !["http:", "https:"].includes(action.protocol) ||
          (location.protocol === "https:" && action.protocol !== "https:") ||
          !username ||
          username.disabled ||
          password.disabled
        ) {
          return null;
        }

        return {
          formIndex: forms.indexOf(form),
          usernameIndex: Array.from(form.querySelectorAll("input")).indexOf(
            username,
          ),
          passwordIndex: Array.from(form.querySelectorAll("input")).indexOf(
            password,
          ),
        };
      })
      .filter(Boolean);

    return candidates[0] || null;
  });

const detectLoginFailure = async (page) =>
  page.evaluate(() => {
    const text = (document.body?.innerText || "").toLowerCase();

    const loginErrorVisible =
      /invalid username|invalid password|incorrect password|login failed|sign in failed|authentication failed|incorrect username or password/.test(
        text,
      );

    const passwordFormVisible = Array.from(document.forms).some((form) =>
      Boolean(form.querySelector('input[type="password"]')),
    );

    return { loginErrorVisible, passwordFormVisible };
  });

const isLikelyLoginUrl = (value) => {
  try {
    const url = new URL(value);
    return /(?:^|\/)(?:login|log-in|signin|sign-in|authenticate|authentication)(?:\/|$)/i.test(
      url.pathname,
    );
  } catch {
    return false;
  }
};

const createAuthenticatedBrowserSession = async ({
  targetUrl,
  credentials,
  signal,
} = {}) => {
  const target = normalizeTargetUrl(targetUrl);

  const hasCookie =
    typeof credentials?.sessionCookie === "string" &&
    !Object.hasOwn(credentials, "username") &&
    !Object.hasOwn(credentials, "password");

  const hasUsernamePassword =
    typeof credentials?.username === "string" &&
    credentials.username.trim().length > 0 &&
    typeof credentials?.password === "string" &&
    credentials.password.length > 0 &&
    !Object.hasOwn(credentials, "sessionCookie");

  if (!hasCookie && !hasUsernamePassword) {
    throw createAuthenticationError(
      "AUTH_CREDENTIALS_INVALID",
      "Provide either username/password or a session cookie.",
    );
  }

  const cookies = hasCookie
    ? parseSessionCookie(credentials.sessionCookie)
    : [];

  await assertSafeUrl(target.href);

  if (signal?.aborted) {
    throw createAuthenticationError(
      "AUTH_CANCELLED",
      "Authentication was cancelled.",
    );
  }

  let browser;
  let context;
  let page;
  let closed = false;
  let abortHandler;

  const close = async () => {
    if (closed) return;

    closed = true;

    if (signal && abortHandler) {
      signal.removeEventListener("abort", abortHandler);
    }

    if (browser) {
      await browser.close().catch(() => {});
    }
  };

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

    context = await browser.createBrowserContext();
    page = await context.newPage();

    page.setDefaultNavigationTimeout(NAVIGATION_TIMEOUT_MS);
    page.setDefaultTimeout(NAVIGATION_TIMEOUT_MS);

    /*
     * Cookies are host-only because they are installed with the
     * exact target URL, not a Domain attribute or wildcard domain.
     */
    if (hasCookie) {
      await context.setCookie(
        ...cookies.map(({ name, value }) => ({
          name,
          value,
          url: target.origin,
        })),
      );
    }

    await page.setRequestInterception(true);

    page.on("request", (request) => {
      void (async () => {
        try {
          if (signal?.aborted || closed) {
            await request.abort("aborted").catch(() => {});
            return;
          }

          const requestUrl = request.url();

          if (requestUrl === "about:blank") {
            await request.continue().catch(() => {});
            return;
          }

          const parsed = new URL(requestUrl);

          /*
           * Authentication browsing is restricted to the exact
           * origin: scheme, hostname, and port must all match.
           */
          if (
            !["http:", "https:"].includes(parsed.protocol) ||
            parsed.origin !== target.origin
          ) {
            await request.abort().catch(() => {});
            return;
          }

          await assertSafeUrl(parsed.href);
          await request.continue().catch(() => {});
        } catch {
          await request.abort().catch(() => {});
        }
      })();
    });

    if (signal) {
      abortHandler = () => {
        void close();
      };

      signal.addEventListener("abort", abortHandler, { once: true });
    }

    if (signal?.aborted) {
      throw createAuthenticationError(
        "AUTH_CANCELLED",
        "Authentication was cancelled.",
      );
    }

    await page.goto(target.href, {
      waitUntil: "domcontentloaded",
      timeout: NAVIGATION_TIMEOUT_MS,
    });

    if (signal?.aborted || page.isClosed()) {
      throw createAuthenticationError(
        "AUTH_CANCELLED",
        "Authentication was cancelled.",
      );
    }

    const finalUrl = normalizeTargetUrl(page.url());

    if (finalUrl.origin !== target.origin) {
      throw createAuthenticationError(
        "AUTH_CROSS_ORIGIN_REDIRECT",
        "The page redirected outside the target origin. This authentication flow is not supported.",
      );
    }

    await assertSafeUrl(finalUrl.href);

    const challenge = await detectAuthenticationChallenge(page);

    if (challenge.captchaDetected) {
      throw createAuthenticationError(
        "AUTH_CAPTCHA_REQUIRED",
        "The page presents a CAPTCHA. Automated authentication cannot continue.",
      );
    }

    if (challenge.mfaDetected) {
      throw createAuthenticationError(
        "AUTH_MFA_REQUIRED",
        "The page requires additional verification. Automated authentication cannot continue.",
      );
    }

    if (hasCookie) {
      /*
       * Do not attempt a second login when the user supplied a cookie.
       * Check common login indicators, but no generic check can prove
       * authentication for every application's custom UI.
       */
      const loginState = await detectLoginFailure(page);
      const loginForm = await findLoginForm(page);

      if (
        isLikelyLoginUrl(finalUrl.href) ||
        loginState.loginErrorVisible ||
        loginForm !== null
      ) {
        throw createAuthenticationError(
          "AUTH_SESSION_UNCONFIRMED",
          "The supplied session cookie did not reach a clearly authenticated page. It may be expired, invalid, or unsupported by the target.",
        );
      }
    } else {
      const form = await findLoginForm(page);

      if (!form) {
        throw createAuthenticationError(
          "AUTH_LOGIN_FORM_NOT_FOUND",
          "No supported same-origin username and password form was found.",
        );
      }

      const filled = await page.evaluate(
        ({ formIndex, usernameIndex, passwordIndex, username, password }) => {
          const targetForm = document.forms[formIndex];
          const inputs = Array.from(
            targetForm?.querySelectorAll("input") || [],
          );

          const usernameInput = inputs[usernameIndex];
          const passwordInput = inputs[passwordIndex];

          if (
            !targetForm ||
            !usernameInput ||
            !passwordInput ||
            !targetForm.isConnected
          ) {
            return false;
          }

          const setValue = (input, value) => {
            const setter = Object.getOwnPropertyDescriptor(
              HTMLInputElement.prototype,
              "value",
            )?.set;

            if (!setter) return false;

            setter.call(input, value);
            input.dispatchEvent(new Event("input", { bubbles: true }));
            input.dispatchEvent(new Event("change", { bubbles: true }));

            return true;
          };

          return (
            setValue(usernameInput, username) &&
            setValue(passwordInput, password)
          );
        },
        {
          formIndex: form.formIndex,
          usernameIndex: form.usernameIndex,
          passwordIndex: form.passwordIndex,
          username: credentials.username,
          password: credentials.password,
        },
      );

      if (!filled) {
        throw createAuthenticationError(
          "AUTH_FORM_FILL_FAILED",
          "The supported login form could not be filled.",
        );
      }

      if (signal?.aborted) {
        throw createAuthenticationError(
          "AUTH_CANCELLED",
          "Authentication was cancelled.",
        );
      }

      await Promise.all([
        page
          .waitForNavigation({
            waitUntil: "domcontentloaded",
            timeout: NAVIGATION_TIMEOUT_MS,
          })
          .catch(() => {}),
        page.evaluate((formIndex) => {
          const form = document.forms[formIndex];

          if (!form) {
            throw new Error("Login form is no longer available.");
          }

          form.requestSubmit();
        }, form.formIndex),
      ]);

      if (signal?.aborted || page.isClosed()) {
        throw createAuthenticationError(
          "AUTH_CANCELLED",
          "Authentication was cancelled.",
        );
      }

      const authenticatedUrl = normalizeTargetUrl(page.url());

      if (authenticatedUrl.origin !== target.origin) {
        throw createAuthenticationError(
          "AUTH_CROSS_ORIGIN_REDIRECT",
          "The login redirected outside the target origin. This login flow is not supported.",
        );
      }

      await assertSafeUrl(authenticatedUrl.href);

      await page
        .waitForSelector('input[type="password"]', {
          hidden: true,
          timeout: LOGIN_DETECTION_TIMEOUT_MS,
        })
        .catch(() => {});

      const loginState = await detectLoginFailure(page);

      if (loginState.loginErrorVisible || loginState.passwordFormVisible) {
        throw createAuthenticationError(
          "AUTH_LOGIN_UNCONFIRMED",
          "Login could not be verified. The credentials may be incorrect, or the site may require an unsupported authentication step.",
        );
      }
    }

    return {
      browser,
      context,
      page,
      targetOrigin: target.origin,
      close,
    };
  } catch (error) {
    await close();

    if (error?.code) {
      throw error;
    }

    if (signal?.aborted) {
      throw createAuthenticationError(
        "AUTH_CANCELLED",
        "Authentication was cancelled.",
      );
    }

    throw createAuthenticationError(
      "AUTHENTICATION_FAILED",
      "The browser authentication flow failed.",
    );
  }
};

export { createAuthenticatedBrowserSession };
