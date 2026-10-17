import https from "node:https";
import { URL } from "node:url";

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
    return Boolean(
      this.secretKey &&
      !this.secretKey.includes("demoKey") &&
      !this.secretKey.includes("sampleSecret"),
    );
  }

  async httpsRequest(options, postData) {
    return new Promise((resolve, reject) => {
      const request = https.request(options, (response) => {
        let body = "";

        response.setEncoding("utf8");

        response.on("data", (chunk) => {
          body += chunk;
        });

        response.on("end", () => {
          let data;

          try {
            data = JSON.parse(body || "{}");
          } catch {
            return reject(
              new Error("Chapa returned an invalid JSON response."),
            );
          }

          const statusCode = response.statusCode || 500;

          if (statusCode < 200 || statusCode >= 300) {
            return reject(
              new Error(`Chapa request failed with HTTP ${statusCode}.`),
            );
          }

          resolve({ statusCode, data });
        });
      });

      request.setTimeout(15000, () => {
        request.destroy(new Error("Chapa request timed out."));
      });

      request.on("error", reject);

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

    const url = new URL(`${this.baseUrl}${path}`);

    if (url.protocol !== "https:") {
      throw new Error("Chapa API must use HTTPS.");
    }

    const postData =
      payload === undefined ? undefined : JSON.stringify(payload);

    return this.httpsRequest(
      {
        hostname: url.hostname,
        port: url.port ? Number(url.port) : 443,
        path: `${url.pathname}${url.search}`,
        method,
        headers: {
          Authorization: `Bearer ${this.secretKey}`,
          Accept: "application/json",
          ...(postData
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

  async initializePayment(params) {
    if (
      !params ||
      !Number.isFinite(Number(params.amount)) ||
      Number(params.amount) <= 0 ||
      !params.email ||
      !params.firstName ||
      !params.lastName ||
      !params.tx_ref
    ) {
      throw new Error("Invalid payment initialization parameters.");
    }

    const currency = params.currency || "ETB";

    if (this.simulationEnabled && !this.isConfigured) {
      simulatedTransactions.set(params.tx_ref, {
        amount: Number(params.amount),
        currency,
        status: "pending",
      });

      const simulatedCheckoutUrl = new URL(
        "/dashboard/billing",
        process.env.APP_BASE_URL || "http://localhost:3000",
      );

      simulatedCheckoutUrl.searchParams.set("verify_simulated", params.tx_ref);
      simulatedCheckoutUrl.searchParams.set("amount", String(params.amount));
      simulatedCheckoutUrl.searchParams.set("currency", currency);

      return {
        checkoutUrl: simulatedCheckoutUrl.toString(),
        tx_ref: params.tx_ref,
        isSimulated: true,
      };
    }

    const payload = {
      amount: String(params.amount),
      currency,
      email: params.email,
      first_name: params.firstName,
      last_name: params.lastName,
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
      const callbackUrl = new URL(params.callbackUrl);

      if (callbackUrl.protocol !== "https:") {
        throw new Error("The Chapa callback URL must use HTTPS.");
      }

      payload.callback_url = callbackUrl.toString();
    }

    if (params.returnUrl) {
      const returnUrl = new URL(params.returnUrl);

      if (returnUrl.protocol !== "https:") {
        throw new Error("The Chapa return URL must use HTTPS.");
      }

      payload.return_url = returnUrl.toString();
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

    const checkout = new URL(checkoutUrl);

    if (
      checkout.protocol !== "https:" ||
      checkout.hostname !== "checkout.chapa.co"
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
    if (typeof tx_ref !== "string" || !tx_ref.trim()) {
      throw new Error("A valid transaction reference is required.");
    }

    if (this.simulationEnabled && !this.isConfigured) {
      const transaction = simulatedTransactions.get(tx_ref);

      if (!transaction) {
        return {
          success: false,
          status: "failed",
          tx_ref,
          amount: 0,
          currency: "ETB",
        };
      }

      // Simulation never represents a real payment.
      // It must not upgrade a real subscription.
      return {
        success: false,
        status: "pending",
        tx_ref,
        amount: transaction.amount,
        currency: transaction.currency,
        reference: `SIMULATED-${tx_ref}`,
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
        raw: response.data,
      };
    }

    const status = String(data.status || "").toLowerCase();
    const amount = Number(data.amount);

    if (!Number.isFinite(amount) || amount < 0) {
      throw new Error("Chapa returned an invalid transaction amount.");
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
      currency: String(data.currency || "ETB").toUpperCase(),
      paymentMethod: data.method || undefined,
      reference: data.reference || undefined,
      raw: data,
    };
  }
}

export const chapaService = new ChapaService();
