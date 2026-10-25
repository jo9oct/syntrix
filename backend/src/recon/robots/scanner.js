/* STATUS: UPDATED */

import { get } from "../../request/request.js";

import { createExchangeEvidence } from "../shared/evidence.js";
import { createReconScanner, getTargetUrl } from "../shared/reconContract.js";
import { assertSafeUrl } from "../shared/resolver.js";

const MAX_ROBOTS_BYTES = 1024 * 1024;
const MAX_DIRECTIVES = 10000;
const MAX_VALUE_LENGTH = 2000;
const MAX_USER_AGENT_LENGTH = 256;

const createEmptyResult = () => ({
  userAgents: [],
  disallowed: [],
  allowed: [],
  sitemaps: [],
});

const getResponseBody = (body) => {
  if (typeof body === "string") {
    return body;
  }

  if (Buffer.isBuffer(body)) {
    return body.toString("utf8");
  }

  return null;
};

const parseRobots = (body) => {
  const text = getResponseBody(body);

  if (text === null) {
    return {
      ...createEmptyResult(),
      malformed: true,
      directivesParsed: 0,
    };
  }

  const userAgents = new Set();
  const disallowed = [];
  const allowed = [];
  const sitemaps = [];

  let currentAgents = [];
  let groupHasRules = false;
  let directivesParsed = 0;
  let truncated = false;

  const lines = text.split(/\r?\n/);

  for (const rawLine of lines) {
    if (directivesParsed >= MAX_DIRECTIVES) {
      truncated = true;
      break;
    }

    // Remove comments while retaining the directive itself.
    const line = rawLine.split("#", 1)[0].trim();

    if (!line) {
      continue;
    }

    const separator = line.indexOf(":");

    if (separator === -1) {
      continue;
    }

    const directive = line.slice(0, separator).trim().toLowerCase();

    const value = line
      .slice(separator + 1)
      .trim()
      .slice(0, MAX_VALUE_LENGTH);

    if (directive === "user-agent") {
      if (groupHasRules) {
        currentAgents = [];
        groupHasRules = false;
      }

      if (!value) {
        continue;
      }

      const agent = value.slice(0, MAX_USER_AGENT_LENGTH);

      if (!currentAgents.includes(agent)) {
        currentAgents.push(agent);
      }

      userAgents.add(agent);
      directivesParsed += 1;
      continue;
    }

    if (directive === "sitemap") {
      // Sitemap is a global directive and may be an absolute URL.
      if (value) {
        sitemaps.push(value);
      }

      directivesParsed += 1;
      continue;
    }

    if (!["allow", "disallow"].includes(directive)) {
      continue;
    }

    // Empty Allow/Disallow values do not specify a path rule.
    if (!value) {
      continue;
    }

    const agents = currentAgents.length ? currentAgents : ["*"];

    for (const userAgent of agents) {
      const entry = {
        userAgent,
        path: value,
      };

      if (directive === "allow") {
        allowed.push(entry);
      } else {
        disallowed.push(entry);
      }
    }

    groupHasRules = true;
    directivesParsed += 1;
  }

  return {
    userAgents: [...userAgents],
    disallowed,
    allowed,
    sitemaps,
    malformed: false,
    directivesParsed,
    truncated,
  };
};

const cancelledResult = (url) => ({
  data: {
    url,
    status: null,
    ...createEmptyResult(),
  },
  evidence: [],
  fingerprints: [],
  verificationRecords: [],
  metadata: {
    cancelled: true,
  },
});

const scanner = createReconScanner({
  id: "recon.robots",

  name: "Robots.txt Reconnaissance",

  description:
    "Retrieves and parses robots.txt directives as public discovery hints.",

  async run(context) {
    if (context?.signal?.aborted) {
      return cancelledResult(null);
    }

    const targetUrl = getTargetUrl(context);
    const parsedUrl = new URL(targetUrl);

    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      throw new Error(
        "Robots reconnaissance only supports HTTP and HTTPS targets.",
      );
    }

    parsedUrl.pathname = "/robots.txt";
    parsedUrl.search = "";
    parsedUrl.hash = "";

    const robotsUrl = parsedUrl.toString();

    await assertSafeUrl(robotsUrl);

    if (context?.signal?.aborted) {
      return cancelledResult(robotsUrl);
    }

    // robots.txt is public. Do not forward authenticated session
    // cookies or authorization headers unnecessarily.
    let response;
    try {
      response = await get(robotsUrl, {
        signal: context?.signal,
        scope: context?.scope,
        headers: {
          Accept: "text/plain, */*;q=0.1",
        },
        maxRedirects: 0,
        maxContentLength: MAX_ROBOTS_BYTES,
        maxBodyLength: MAX_ROBOTS_BYTES,
        responseType: "text",
      });
    } catch (error) {
      if (context?.signal?.aborted) {
        return cancelledResult(robotsUrl);
      }

      return {
        data: {
          url: robotsUrl,
          status: null,
          ...createEmptyResult(),
        },
        evidence: [],
        fingerprints: [],
        verificationRecords: [],
        metadata: {
          successfulResponse: false,
          robotsFound: false,
          bodyBytes: 0,
          userAgentCount: 0,
          disallowedCount: 0,
          allowedCount: 0,
          sitemapCount: 0,
          directivesParsed: 0,
          truncated: false,
          malformed: false,
          cancelled: false,
          error: error?.message ?? "Failed to fetch robots.txt",
        },
      };
    }

    if (context?.signal?.aborted) {
      return cancelledResult(robotsUrl);
    }

    const status = Number(response?.status);

    if (!Number.isInteger(status) || status < 100 || status > 599) {
      return {
        data: {
          url: robotsUrl,
          status: null,
          ...createEmptyResult(),
        },
        evidence: [],
        fingerprints: [],
        verificationRecords: [],
        metadata: {
          successfulResponse: false,
          robotsFound: false,
          cancelled: false,
        },
      };
    }

    const successfulResponse = status >= 200 && status < 300;

    const body = successfulResponse ? getResponseBody(response.data) : null;

    const bodySize = body === null ? 0 : Buffer.byteLength(body, "utf8");

    const parsed =
      successfulResponse && bodySize <= MAX_ROBOTS_BYTES
        ? parseRobots(body)
        : createEmptyResult();

    const contentType =
      response?.headers?.["content-type"] ??
      response?.headers?.["Content-Type"] ??
      null;

    const evidence = createExchangeEvidence({
      request: {
        method: "GET",
        url: robotsUrl,
        headers: {
          Accept: "text/plain, */*;q=0.1",
        },
      },

      response: {
        status,
        statusText: response?.statusText ?? null,
        headers: response?.headers ?? {},
        contentType,
        // robots.txt can reveal internal paths; retain parsed
        // directives rather than duplicating the entire body.
        body: null,
      },
    });

    return {
      data: {
        url: robotsUrl,
        status,
        ...parsed,
      },

      evidence: [evidence],
      fingerprints: [],
      verificationRecords: [],

      metadata: {
        successfulResponse,
        bodyBytes: bodySize,
        userAgentCount: parsed.userAgents.length,
        disallowedCount: parsed.disallowed.length,
        allowedCount: parsed.allowed.length,
        sitemapCount: parsed.sitemaps.length,
        directivesParsed: parsed.directivesParsed ?? 0,
        truncated: parsed.truncated ?? false,
        malformed: parsed.malformed ?? false,
        cancelled: false,
        note: "Robots directives guide crawler behavior; they do not authorize access or prove a vulnerability.",
      },
    };
  },
});

export default scanner;
