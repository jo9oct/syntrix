// STATUS: REPLACE
// FILE: src/services/chapa.service.js

import https from "node:https";
import { URL } from "node:url";

const API_HOSTNAME = "api.chapa.co";
const CHECKOUT_HOSTNAME = "checkout.chapa.co";
const REQUEST_TIMEOUT_MS = 15_000;
const MAX_RESPONSE_BYTES = 1024 * 1024;

export const SUBSCRIPTION_PLANS = [
  {
    id: "free",
    name: "Free Community",
    tagline:
      "Essential external security scanning for developers and small sites.",
    badge: "Open Access",
    priceETB: 0,
    priceUSD: 0,
    period: "Forever free",
    features: [
      "1 Monitored Target Asset / Project",
      "OWASP Top 10 Dynamic Vulnerability Checks",
      "Manual Security Assessment Scans",
      "Basic HTTP Header & TLS Audits",
      "Community Threat Intelligence Feed",
      "7-Day Telemetry History",
      "Standard Community Support",
    ],
    limits: {
      projects: 1,
      scansPerMonth: 5,
      apiFuzzing: false,
      malwareSandbox: false,
      retestingQueue: false,
      pdfReports: false,
      seats: 1,
    },
    popular: false,
    cta: "Get Started Free",
  },
  {
    id: "pro",
    name: "Pro Security Engineer",
    tagline: "Full-featured automated DAST, API fuzzing, and malware triage.",
    badge: "Most Popular",
    priceETB: 2500,
    priceETBAnnual: 25000,
    priceUSD: 29,
    priceUSDAnnual: 290,
    period: "per month",
    annualSavings: "Save 2 months (17% off)",
    features: [
      "Unlimited Target Projects & Endpoints",
      "Deep Dynamic Security Assessment Engine",
      "Automated REST & GraphQL API Fuzzing",
      "Interactive Developer Remediation Kanban",
      "One-Click Automated Patch Verification Retest",
      "Binary Static PE & IOC Malware Inspection",
      "Executive & Technical PDF/HTML Report Generation",
      "90-Day Audit Logs & Operational Telemetry",
      "Chapa Checkout (Telebirr, CBEBirr, Cards)",
      "Priority Email & Chat Support",
    ],
    limits: {
      projects: 9999,
      scansPerMonth: 9999,
      apiFuzzing: true,
      malwareSandbox: true,
      retestingQueue: true,
      pdfReports: true,
      seats: 5,
    },
    popular: true,
    cta: "Upgrade to Pro",
  },
  {
    id: "enterprise",
    name: "Enterprise SecOps",
    tagline:
      "Unified multi-tenant platform with 5 specialized expert workspaces.",
    badge: "Enterprise Grade",
    priceETB: 14900,
    priceETBAnnual: 149000,
    priceUSD: 149,
    priceUSDAnnual: 1490,
    period: "per month",
    annualSavings: "Save 2 months on annual",
    features: [
      "Everything in Pro Included",
      "All 5 Specialized Workspaces (Engineer, Client, Malware, Developer, Admin)",
      "Unlimited Team Members & Role-Based Access Controls",
      "CI/CD Pipeline Security Gate (GitHub Actions / GitLab)",
      "Dedicated Isolated Malware Detonation Sandbox",
      "Custom Vulnerability Signatures & YARA Rule Uploads",
      "Full Organization Governance & Tamper-Evident Audit Trails",
      "Enterprise Chapa Bank Wire & Invoicing Support",
      "24/7 Dedicated Incident Response Hotline & SLA",
    ],
    limits: {
      projects: 9999,
      scansPerMonth: 9999,
      apiFuzzing: true,
      malwareSandbox: true,
      retestingQueue: true,
      pdfReports: true,
      seats: 9999,
    },
    popular: false,
    cta: "Get Enterprise",
  },
];

// Process-local simulation is for development only.
// It is not persistent and is never accepted as a real payment.
const simulatedTransactions = new Map();

class ChapaService {
  get secretKey() {
    return process.env.CHAPA_SECRET_KEY || "";
  }

  get baseUrl() {
    return (process.env.CHAPA_BASE_URL || "https://api.chapa.co/v1").replace(
      /\/+$/,
      "",
    );
  }

  get simulationEnabled() {
    return (
      process.env.NODE_ENV !== "production" &&
      process.env.CHAPA_SIMULATE_PAYMENTS === "true"
    );
  }

  get isConfigured() {
    const key = this.secretKey.trim();

    return Boolean(key && !/demo|sample|placeholder|change.?me/i.test(key));
  }

  get isSimulationOnly() {
    return this.simulationEnabled && !this.isConfigured;
  }

  assertApiUrl(path) {
    let url;

    try {
      url = new URL(path, `${this.baseUrl}/`);
    } catch {
      throw new Error("Chapa API URL is invalid.");
    }

    if (
      url.protocol !== "https:" ||
      url.hostname.toLowerCase() !== API_HOSTNAME ||
      url.port ||
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      !url.pathname.startsWith("/v1/")
    ) {
      throw new Error("Chapa API destination is not permitted.");
    }

    return url;
  }

  async httpsRequest(options, postData) {
    return new Promise((resolve, reject) => {
      let settled = false;

      const fail = (error) => {
        if (settled) return;
        settled = true;
        reject(error);
      };

      const request = https.request(
        {
          ...options,
          agent: undefined,
          maxHeaderSize: 16 * 1024,
        },
        (response) => {
          let body = "";
          let responseBytes = 0;

          response.setEncoding("utf8");

          response.on("data", (chunk) => {
            if (settled) return;

            responseBytes += Buffer.byteLength(chunk);

            if (responseBytes > MAX_RESPONSE_BYTES) {
              response.destroy();
              request.destroy(
                new Error("Chapa response exceeded the allowed size."),
              );
              fail(new Error("Chapa response exceeded the allowed size."));
              return;
            }

            body += chunk;
          });

          response.on("error", fail);

          response.on("end", () => {
            if (settled) return;

            const statusCode = response.statusCode || 500;

            if (statusCode < 200 || statusCode >= 300) {
              fail(new Error(`Chapa request failed with HTTP ${statusCode}.`));
              return;
            }

            let data;

            try {
              data = JSON.parse(body || "{}");
            } catch {
              fail(new Error("Chapa returned an invalid JSON response."));
              return;
            }

            settled = true;
            resolve({ statusCode, data });
          });
        },
      );

      request.setTimeout(REQUEST_TIMEOUT_MS, () => {
        request.destroy(new Error("Chapa request timed out."));
      });

      request.on("error", fail);

      if (postData) {
        request.write(postData);
      }

      request.end();
    });
  }

  async requestChapa(path, method, payload) {
    if (!this.isConfigured) {
      throw new Error("Chapa payment credentials are not configured.");
    }

    const url = this.assertApiUrl(path);

    const postData =
      payload === undefined ? undefined : JSON.stringify(payload);

    return this.httpsRequest(
      {
        hostname: url.hostname,
        port: 443,
        path: `${url.pathname}${url.search}`,
        method,
        headers: {
          Authorization: `Bearer ${this.secretKey}`,
          Accept: "application/json",
          ...(postData !== undefined
            ? {
                "Content-Type": "application/json",
                "Content-Length": Buffer.byteLength(postData),
              }
            : {}),
        },
      },
      postData,
    );
  }

  validatePaymentParams(params) {
    if (!params || typeof params !== "object") {
      throw new Error("Invalid payment initialization parameters.");
    }

    const amount = Number(params.amount);

    if (
      !Number.isFinite(amount) ||
      amount <= 0 ||
      !Number.isSafeInteger(Math.round(amount * 100)) ||
      params.currency !== "ETB" ||
      typeof params.email !== "string" ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(params.email) ||
      typeof params.firstName !== "string" ||
      !params.firstName.trim() ||
      typeof params.lastName !== "string" ||
      !params.lastName.trim() ||
      typeof params.tx_ref !== "string" ||
      !/^stx-[a-f0-9]{36}$/i.test(params.tx_ref)
    ) {
      throw new Error("Invalid payment initialization parameters.");
    }

    return amount;
  }

  validateRedirectUrl(value, label) {
    let url;

    try {
      url = new URL(value);
    } catch {
      throw new Error(`${label} is invalid.`);
    }

    if (url.protocol !== "https:" || url.username || url.password || url.hash) {
      throw new Error(`${label} must be a valid HTTPS URL.`);
    }

    return url;
  }

  async initializePayment(params) {
    const amount = this.validatePaymentParams(params);
    const currency = "ETB";

    if (this.isSimulationOnly) {
      simulatedTransactions.set(params.tx_ref, {
        amount,
        currency,
        status: "pending",
      });

      const appBaseUrl = process.env.APP_BASE_URL;

      if (!appBaseUrl) {
        throw new Error("APP_BASE_URL is required for payment simulation.");
      }

      const appUrl = this.validateRedirectUrl(appBaseUrl, "APP_BASE_URL");

      // Permit HTTP only for localhost development.
      if (
        appUrl.protocol !== "https:" &&
        !["localhost", "127.0.0.1", "::1"].includes(appUrl.hostname)
      ) {
        throw new Error("Simulation URL must use HTTPS outside localhost.");
      }

      const checkoutUrl = new URL("/dashboard/billing", appUrl);
      checkoutUrl.searchParams.set("verify_simulated", params.tx_ref);

      return {
        checkoutUrl: checkoutUrl.toString(),
        tx_ref: params.tx_ref,
        isSimulated: true,
      };
    }

    const payload = {
      amount: String(amount),
      currency,
      email: params.email,
      first_name: params.firstName.trim(),
      last_name: params.lastName.trim(),
      tx_ref: params.tx_ref,
      "customization[title]":
        params.customizationTitle || "Sentrix Subscription",
      "customization[description]":
        params.customizationDescription ||
        "Cybersecurity platform subscription",
    };

    if (params.phoneNumber) {
      payload.phone_number = params.phoneNumber;
    }

    if (params.callbackUrl) {
      payload.callback_url = this.validateRedirectUrl(
        params.callbackUrl,
        "Chapa callback URL",
      ).toString();
    }

    if (params.returnUrl) {
      payload.return_url = this.validateRedirectUrl(
        params.returnUrl,
        "Chapa return URL",
      ).toString();
    }

    const response = await this.requestChapa(
      "/transaction/initialize",
      "POST",
      payload,
    );

    const checkoutUrl = response.data?.data?.checkout_url;

    if (
      response.data?.status !== "success" ||
      typeof checkoutUrl !== "string"
    ) {
      throw new Error("Chapa did not return a valid checkout URL.");
    }

    let checkout;

    try {
      checkout = new URL(checkoutUrl);
    } catch {
      throw new Error("Chapa returned an invalid checkout URL.");
    }

    if (
      checkout.protocol !== "https:" ||
      checkout.hostname.toLowerCase() !== CHECKOUT_HOSTNAME ||
      checkout.port ||
      checkout.username ||
      checkout.password
    ) {
      throw new Error("Chapa returned an unexpected checkout URL.");
    }

    return {
      checkoutUrl: checkout.toString(),
      tx_ref: params.tx_ref,
      isSimulated: false,
    };
  }

  async verifyPayment(tx_ref) {
    if (typeof tx_ref !== "string" || !/^stx-[a-f0-9]{36}$/i.test(tx_ref)) {
      throw new Error("A valid transaction reference is required.");
    }

    if (this.isSimulationOnly) {
      const transaction = simulatedTransactions.get(tx_ref);

      return {
        success: false,
        status: transaction ? "pending" : "failed",
        tx_ref,
        amount: transaction?.amount ?? 0,
        currency: transaction?.currency ?? "ETB",
        raw: { simulated: true },
      };
    }

    const response = await this.requestChapa(
      `/transaction/verify/${encodeURIComponent(tx_ref)}`,
      "GET",
    );

    const data = response.data?.data;

    if (
      response.data?.status !== "success" ||
      !data ||
      data.tx_ref !== tx_ref
    ) {
      return {
        success: false,
        status: "failed",
        tx_ref,
        amount: 0,
        currency: "ETB",
      };
    }

    const status = String(data.status || "").toLowerCase();
    const amount = Number(data.amount);
    const currency = String(data.currency || "").toUpperCase();

    if (!Number.isFinite(amount) || amount <= 0 || currency !== "ETB") {
      throw new Error("Chapa returned invalid payment details.");
    }

    const normalizedStatus =
      status === "success"
        ? "success"
        : status === "pending"
          ? "pending"
          : "failed";

    return {
      success: normalizedStatus === "success",
      status: normalizedStatus,
      tx_ref,
      amount,
      currency,
      paymentMethod:
        typeof data.method === "string" ? data.method.slice(0, 100) : undefined,
      reference:
        typeof data.reference === "string"
          ? data.reference.slice(0, 200)
          : undefined,
    };
  }
}

export const chapaService = new ChapaService();
