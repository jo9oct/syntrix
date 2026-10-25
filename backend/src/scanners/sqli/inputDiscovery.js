/*
 * STATUS: CREATED
 * File: src/scanners/sqli/inputDiscovery.js
 *
 * Implements input discovery and mutated request builders for the 6 SQLi input sources:
 * 1. URL query parameters
 * 2. HTML form fields
 * 3. JSON/API request bodies
 * 4. Cookies
 * 5. URL path parameters
 * 6. HTTP headers
 */

import * as cheerio from "cheerio";
import { discoverPageInputs } from "../../discovery/inputDiscovery.js";

/**
 * 1. URL Query Parameters
 */
export const discoverQueryInputs = (targetUrl, discoveredParamNames = []) => {
  const inputs = [];
  try {
    const url = new URL(targetUrl);
    const keys = [
      ...new Set([...url.searchParams.keys(), ...discoveredParamNames]),
    ];

    for (const key of keys) {
      const originalValue = url.searchParams.get(key) ?? "1";
      inputs.push({
        source: "query",
        targetUrl,
        parameter: key,
        method: "GET",
        originalValue,
        createRequest: (payload) => {
          const u = new URL(targetUrl);
          u.searchParams.set(key, payload);
          return {
            url: u.toString(),
            method: "GET",
            headers: {},
          };
        },
      });
    }

    // If no query parameters were in the URL or discovered, provide standard query probes
    if (inputs.length === 0) {
      for (const param of ["id", "q"]) {
        inputs.push({
          source: "query",
          targetUrl,
          parameter: param,
          method: "GET",
          originalValue: "1",
          createRequest: (payload) => {
            const u = new URL(targetUrl);
            u.searchParams.set(param, payload);
            return {
              url: u.toString(),
              method: "GET",
              headers: {},
            };
          },
        });
      }
    }
  } catch {
    // Ignore malformed target URL
  }

  return inputs;
};

/**
 * 1b. Discovers Query Parameters from In-Page Links (Crawl assist for root landing URLs)
 */
export const discoverPageQueryInputs = (targetUrl, responseBody = "") => {
  const inputs = [];
  const bodyText = typeof responseBody === "string" ? responseBody : "";

  if (bodyText.includes("<a ") || bodyText.includes("<A ")) {
    try {
      const $ = cheerio.load(bodyText);
      const seen = new Set();

      $("a[href]").each((_, el) => {
        const href = $(el).attr("href");
        if (!href) return;

        try {
          const resolved = new URL(href, targetUrl);
          const targetOrigin = new URL(targetUrl).origin;

          if (resolved.origin === targetOrigin && resolved.search) {
            for (const [key, val] of resolved.searchParams.entries()) {
              const signature = `${resolved.pathname}:${key}`;
              if (!seen.has(signature)) {
                seen.add(signature);
                inputs.push({
                  source: "query",
                  targetUrl: resolved.toString(),
                  parameter: key,
                  method: "GET",
                  originalValue: val || "1",
                  createRequest: (payload) => {
                    const u = new URL(resolved.toString());
                    u.searchParams.set(key, payload);
                    return {
                      url: u.toString(),
                      method: "GET",
                      headers: {},
                    };
                  },
                });
              }
            }
          }
        } catch {
          // Ignore invalid link URL
        }
      });
    } catch {
      // Ignore Cheerio parsing error
    }
  }

  return inputs;
};

/**
 * 2. HTML Form Fields
 */
export const discoverFormInputs = (targetUrl, responseBody = "") => {
  const inputs = [];
  const bodyText = typeof responseBody === "string" ? responseBody : "";

  if (bodyText.includes("<form") || bodyText.includes("<input")) {
    try {
      const $ = cheerio.load(bodyText);

      $("form").each((_, formEl) => {
        const $form = $(formEl);
        const rawAction = $form.attr("action") || "";
        let actionUrl = targetUrl;
        try {
          actionUrl = new URL(rawAction, targetUrl).toString();
        } catch {
          actionUrl = targetUrl;
        }

        const method = ($form.attr("method") || "POST").toUpperCase();
        const formFields = {};
        const fieldNames = [];

        $form.find("input, textarea, select").each((_, el) => {
          const $el = $(el);
          const name = $el.attr("name");
          const type = ($el.attr("type") || "text").toLowerCase();

          if (
            !name ||
            ["submit", "button", "reset", "image", "file"].includes(type)
          ) {
            return;
          }

          const val =
            $el.val() || $el.attr("value") || $el.attr("placeholder") || "1";
          formFields[name] = String(val);
          if (!fieldNames.includes(name)) {
            fieldNames.push(name);
          }
        });

        for (const name of fieldNames.slice(0, 3)) {
          inputs.push({
            source: "form",
            targetUrl: actionUrl,
            parameter: name,
            method,
            originalValue: formFields[name] || "1",
            createRequest: (payload) => {
              if (method === "POST") {
                const bodyParams = new URLSearchParams({
                  ...formFields,
                  [name]: payload,
                });
                return {
                  url: actionUrl,
                  method: "POST",
                  headers: {
                    "content-type": "application/x-www-form-urlencoded",
                  },
                  body: bodyParams.toString(),
                };
              }

              const u = new URL(actionUrl);
              u.searchParams.set(name, payload);
              return {
                url: u.toString(),
                method: "GET",
                headers: {},
              };
            },
          });
        }
      });
    } catch {
      // Fall through to fallback
    }
  }

  // Fallback for form inputs when scanning form-like routes
  if (inputs.length === 0) {
    const lower = targetUrl.toLowerCase();
    const isFormEndpoint =
      lower.includes("login") ||
      lower.includes("search") ||
      lower.includes("submit") ||
      lower.includes("contact");
    const fallbackParams = lower.includes("login") ? ["username"] : ["search"];

    if (isFormEndpoint) {
      for (const param of fallbackParams) {
        inputs.push({
          source: "form",
          targetUrl,
          parameter: param,
          method: "POST",
          originalValue: "admin",
          createRequest: (payload) => ({
            url: targetUrl,
            method: "POST",
            headers: {
              "content-type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({ [param]: payload }).toString(),
          }),
        });
      }
    }
  }

  return inputs;
};

/**
 * 3. JSON / API Request Bodies
 */
export const discoverJsonInputs = (targetUrl, response) => {
  const inputs = [];
  const contentType = String(
    response?.headers?.["content-type"] || response?.headers?.contentType || "",
  );
  const isApi =
    /api|graphql|v\d|rest|\.json/i.test(targetUrl) ||
    contentType.includes("application/json");

  if (isApi) {
    let parsedBody = null;
    if (
      response?.data &&
      typeof response.data === "object" &&
      !Array.isArray(response.data)
    ) {
      parsedBody = response.data;
    } else if (
      typeof response?.data === "string" &&
      response.data.trim().startsWith("{")
    ) {
      try {
        parsedBody = JSON.parse(response.data);
      } catch {
        // Not valid JSON
      }
    }

    const basePayload =
      parsedBody && typeof parsedBody === "object"
        ? { ...parsedBody }
        : { id: "1", query: "test" };

    const discoveredKeys = Object.keys(basePayload).filter(
      (k) =>
        typeof basePayload[k] === "string" ||
        typeof basePayload[k] === "number",
    );

    const jsonKeys =
      discoveredKeys.length > 0 ? discoveredKeys.slice(0, 3) : ["id", "query"];

    for (const key of jsonKeys) {
      inputs.push({
        source: "json",
        targetUrl,
        parameter: key,
        method: "POST",
        originalValue: String(basePayload[key] ?? "1"),
        createRequest: (payload) => ({
          url: targetUrl,
          method: "POST",
          headers: {
            "content-type": "application/json",
            accept: "application/json",
          },
          body: JSON.stringify({
            ...basePayload,
            [key]: payload,
          }),
        }),
      });
    }
  }

  return inputs;
};

/**
 * 4. Cookies
 */
export const discoverCookieInputs = (
  targetUrl,
  response,
  requestHeaders = {},
) => {
  const inputs = [];
  const existingCookies = {};

  if (requestHeaders?.cookie && typeof requestHeaders.cookie === "string") {
    for (const item of requestHeaders.cookie.split(";")) {
      const [name, ...val] = item.trim().split("=");
      if (name) existingCookies[name] = val.join("=");
    }
  }

  const setCookie = response?.headers?.["set-cookie"];
  if (setCookie) {
    const arr = Array.isArray(setCookie) ? setCookie : [setCookie];
    for (const item of arr) {
      const match = String(item).match(/^([^=;]+)=([^;]*)/);
      if (match) {
        existingCookies[match[1].trim()] = match[2].trim();
      }
    }
  }

  const cookieNames = Object.keys(existingCookies);
  if (cookieNames.length === 0) {
    cookieNames.push("session_id", "tracking_id");
    existingCookies["session_id"] = "1";
    existingCookies["tracking_id"] = "1";
  }

  for (const name of cookieNames.slice(0, 2)) {
    inputs.push({
      source: "cookie",
      targetUrl,
      parameter: name,
      method: "GET",
      originalValue: existingCookies[name] || "1",
      createRequest: (payload) => {
        const merged = {
          ...existingCookies,
          [name]: payload,
        };
        const cookieString = Object.entries(merged)
          .map(([k, v]) => `${k}=${v}`)
          .join("; ");
        return {
          url: targetUrl,
          method: "GET",
          headers: {
            cookie: cookieString,
          },
        };
      },
    });
  }

  return inputs;
};

/**
 * 5. URL Path Parameters
 */
export const discoverPathInputs = (targetUrl) => {
  const inputs = [];
  try {
    const url = new URL(targetUrl);
    const segments = url.pathname.split("/").filter(Boolean);

    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      const isNumeric = /^\d+$/.test(seg);
      const isUuid =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
          seg,
        );

      if (
        isNumeric ||
        isUuid ||
        (segments.length >= 2 && i === segments.length - 1)
      ) {
        const paramName = isNumeric
          ? `path_id_${i + 1}`
          : `path_segment_${i + 1}`;
        inputs.push({
          source: "path",
          targetUrl,
          parameter: paramName,
          method: "GET",
          originalValue: seg,
          createRequest: (payload) => {
            const u = new URL(targetUrl);
            const segs = u.pathname.split("/").filter(Boolean);
            const injection =
              typeof payload === "string" && payload.startsWith(seg)
                ? payload
                : `${seg}${payload}`;
            segs[i] = encodeURIComponent(injection).replace(/'/g, "%27");
            u.pathname = "/" + segs.join("/");
            return {
              url: u.toString(),
              method: "GET",
              headers: {},
            };
          },
        });
        break; // Max 1 path parameter per target
      }
    }
  } catch {
    // Ignore malformed URL
  }

  return inputs;
};

/**
 * 6. HTTP Headers
 */
export const discoverHeaderInputs = (targetUrl) => {
  const candidateHeaders = [
    {
      name: "User-Agent",
      original: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
    },
    { name: "X-Forwarded-For", original: "127.0.0.1" },
  ];

  return candidateHeaders.map(({ name, original }) => ({
    source: "header",
    targetUrl,
    parameter: name,
    method: "GET",
    originalValue: original,
    createRequest: (payload) => ({
      url: targetUrl,
      method: "GET",
      headers: {
        [name]: payload,
      },
    }),
  }));
};

/**
 * Aggregate all 6 sources into a prioritized, bounded collection of input targets
 */
export const discoverAllInputs = ({
  targetUrl,
  baselineResponse,
  requestHeaders = {},
}) => {
  const body = baselineResponse?.data ?? baselineResponse?.body ?? "";

  const directQueryInputs = discoverQueryInputs(targetUrl);
  const pageQueryInputs = discoverPageQueryInputs(targetUrl, body);
  let hasDirectParams = false;
  try {
    hasDirectParams = Boolean(new URL(targetUrl).search);
  } catch {}

  const queryInputs =
    hasDirectParams && directQueryInputs.length > 0
      ? directQueryInputs
      : pageQueryInputs.length > 0
        ? [...pageQueryInputs, ...directQueryInputs]
        : directQueryInputs;

  const formInputs = discoverFormInputs(targetUrl, body);
  const jsonInputs = discoverJsonInputs(targetUrl, baselineResponse);
  const cookieInputs = discoverCookieInputs(
    targetUrl,
    baselineResponse,
    requestHeaders,
  );
  const pathInputs = discoverPathInputs(targetUrl);
  const headerInputs = discoverHeaderInputs(targetUrl);

  return [
    ...queryInputs.slice(0, 3),
    ...formInputs.slice(0, 2),
    ...jsonInputs.slice(0, 2),
    ...cookieInputs.slice(0, 1),
    ...pathInputs.slice(0, 1),
    ...headerInputs.slice(0, 1),
  ];
};
