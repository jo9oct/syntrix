import { get } from "../../request/request.js";

import { createExchangeEvidence } from "../shared/evidence.js";

import { createReconScanner, getTargetUrl } from "../shared/reconContract.js";

import { assertSafeUrl } from "../shared/resolver.js";

const parseRobots = (body) => {
  if (typeof body !== "string") {
    return {
      userAgents: [],
      disallowed: [],
      allowed: [],
      sitemaps: [],
    };
  }

  const userAgents = new Set();

  const disallowed = [];
  const allowed = [];
  const sitemaps = [];

  let currentUserAgent = "*";

  for (const rawLine of body.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (!line || line.startsWith("#")) {
      continue;
    }

    const separator = line.indexOf(":");

    if (separator === -1) {
      continue;
    }

    const directive = line.slice(0, separator).trim().toLowerCase();

    const value = line.slice(separator + 1).trim();

    if (!value) {
      continue;
    }

    if (directive === "user-agent") {
      currentUserAgent = value.slice(0, 256);

      userAgents.add(currentUserAgent);

      continue;
    }

    if (directive === "disallow") {
      disallowed.push({
        userAgent: currentUserAgent,

        path: value.slice(0, 2000),
      });

      continue;
    }

    if (directive === "allow") {
      allowed.push({
        userAgent: currentUserAgent,

        path: value.slice(0, 2000),
      });

      continue;
    }

    if (directive === "sitemap") {
      sitemaps.push(value.slice(0, 2000));
    }
  }

  return {
    userAgents: [...userAgents],

    disallowed,

    allowed,

    sitemaps,
  };
};

const scanner = createReconScanner({
  id: "recon.robots",

  name: "Robots.txt Reconnaissance",

  description: "Retrieves and parses the target robots.txt resource.",

  async run(context) {
    const targetUrl = getTargetUrl(context);

    const parsedUrl = new URL(targetUrl);

    parsedUrl.pathname = "/robots.txt";

    parsedUrl.search = "";
    parsedUrl.hash = "";

    const robotsUrl = parsedUrl.toString();

    await assertSafeUrl(robotsUrl);

    if (context?.signal?.aborted) {
      return {
        data: {
          url: robotsUrl,

          status: null,

          userAgents: [],

          disallowed: [],

          allowed: [],

          sitemaps: [],
        },

        evidence: [],

        fingerprints: [],

        verificationRecords: [],

        metadata: {
          cancelled: true,
        },
      };
    }

    const requestHeaders = context?.session?.getHeaders?.() ?? {};

    const response = await get(robotsUrl, {
      signal: context?.signal,

      headers: requestHeaders,
    });

    if (context?.signal?.aborted) {
      return {
        data: {
          url: robotsUrl,

          status: response.status,

          userAgents: [],

          disallowed: [],

          allowed: [],

          sitemaps: [],
        },

        evidence: [],

        fingerprints: [],

        verificationRecords: [],

        metadata: {
          cancelled: true,
        },
      };
    }

    const parsed = parseRobots(response.data);

    return {
      data: {
        url: robotsUrl,

        status: response.status,

        ...parsed,
      },

      evidence: [
        createExchangeEvidence({
          request: {
            method: "GET",

            url: robotsUrl,

            headers: requestHeaders,
          },

          response: {
            status: response.status,

            statusText: response.statusText,

            headers: response.headers,

            body: response.data,

            contentType: response.headers?.["content-type"],
          },
        }),
      ],

      fingerprints: [],

      verificationRecords: [],

      metadata: {
        userAgentCount: parsed.userAgents.length,

        disallowedCount: parsed.disallowed.length,

        allowedCount: parsed.allowed.length,

        sitemapCount: parsed.sitemaps.length,
      },
    };
  },
});

export default scanner;
