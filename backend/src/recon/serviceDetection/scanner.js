// STATUS: UPDATED

import { get } from "../../request/request.js";

import { createExchangeEvidence } from "../shared/evidence.js";

import { createServiceFingerprint } from "../shared/fingerprint.js";

import { createReconScanner, getTargetUrl } from "../shared/reconContract.js";

import { assertSafeUrl } from "../shared/resolver.js";

const extractTitle = (body) => {
  if (typeof body !== "string") {
    return null;
  }

  const match = body.match(/<title[^>]*>([\s\S]*?)<\/title>/i);

  return match?.[1]?.replace(/\s+/g, " ").trim().slice(0, 500) ?? null;
};

const extractVersion = (value) => {
  if (typeof value !== "string") {
    return null;
  }

  const match = value.match(
    /(?:server|powered[-\s]?by)[\/\s:-]*([a-z0-9._-]+)\/([0-9][a-z0-9._-]*)/i,
  );

  return match?.[2] ?? null;
};

const scanner = createReconScanner({
  id: "recon.version-detection",

  name: "Service Detection",

  description:
    "Identifies web services and server software exposed by the authorized target.",

  async run(context) {
    const targetUrl = getTargetUrl(context);

    await assertSafeUrl(targetUrl);

    const response = await get(targetUrl, {
      signal: context?.signal,

      headers: context?.session?.getHeaders?.() ?? {},
    });

    const server = response.headers?.server ?? response.headers?.Server ?? null;

    const poweredBy =
      response.headers?.["x-powered-by"] ??
      response.headers?.["X-Powered-By"] ??
      null;

    const parsedUrl = new URL(targetUrl);

    const protocol = parsedUrl.protocol.replace(":", "");

    const service = protocol === "https" ? "https" : "http";

    const version = extractVersion(server ?? poweredBy);

    const evidence = [
      createExchangeEvidence({
        request: {
          method: "GET",

          url: targetUrl,

          headers: context?.session?.getHeaders?.() ?? {},
        },

        response: {
          status: response.status,

          statusText: response.statusText,

          headers: response.headers,

          body: response.data,

          contentType: response.headers?.["content-type"],
        },
      }),
    ];

    const fingerprint = createServiceFingerprint({
      service,

      port: parsedUrl.port || (service === "https" ? 443 : 80),

      protocol,

      version,

      confidence: version ? "high" : "low",

      source: "versionDetection",

      evidence: {
        server,

        poweredBy,

        version,
      },
    });

    return {
      data: {
        protocol,

        status: response.status,

        statusText: response.statusText,

        server,

        poweredBy,

        version,

        contentType: response.headers?.["content-type"] ?? null,

        title: extractTitle(response.data),
      },

      evidence,

      fingerprints: [fingerprint],
    };
  },
});

export default scanner;
