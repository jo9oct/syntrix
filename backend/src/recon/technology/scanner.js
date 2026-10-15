import { get } from "../../request/request.js";

import { createExchangeEvidence } from "../shared/evidence.js";

import { createTechnologyFingerprint } from "../shared/fingerprint.js";

import { createReconScanner, getTargetUrl } from "../shared/reconContract.js";

import { assertSafeUrl } from "../shared/resolver.js";

const TECHNOLOGY_SIGNATURES = Object.freeze([
  {
    name: "WordPress",

    patterns: [/wp-content/i, /wp-includes/i, /wordpress/i],
  },

  {
    name: "Next.js",

    patterns: [/_next\/static/i, /__next_data__/i, /self\.__next_f/i],
  },

  {
    name: "React",

    patterns: [
      /data-reactroot/i,
      /react-dom/i,
      /react\.(?:development|production)\.min\.js/i,
    ],
  },

  {
    name: "Angular",

    patterns: [/ng-version/i, /angular(?:\.min)?\.js/i, /angular\.io/i],
  },

  {
    name: "Vue.js",

    patterns: [/vue(?:\.runtime)?(?:\.min)?\.js/i, /data-v-[a-f0-9]+/i],
  },

  {
    name: "jQuery",

    patterns: [/jquery(?:\.min)?\.js/i],
  },

  {
    name: "Bootstrap",

    patterns: [/bootstrap(?:\.min)?\.css/i, /bootstrap(?:\.min)?\.js/i],
  },

  {
    name: "PHP",

    patterns: [/\.php(?:\?|["'])/i, /PHPSESSID/i],
  },

  {
    name: "Express",

    patterns: [/x-powered-by:\s*express/i],
  },
]);

const normalizeHeaderText = (headers) =>
  Object.entries(headers ?? {})
    .map(([key, value]) => `${key}: ${value}`)
    .join("\n");

const detectTechnologies = (headers, body) => {
  const headerText = normalizeHeaderText(headers);

  const bodyText = typeof body === "string" ? body : "";

  const content = `${headerText}\n${bodyText}`;

  return TECHNOLOGY_SIGNATURES.filter((technology) =>
    technology.patterns.some((pattern) => pattern.test(content)),
  ).map((technology) => ({
    name: technology.name,

    source: "http-response",
  }));
};

const scanner = createReconScanner({
  id: "recon.technology",

  name: "Technology Detection",

  description:
    "Detects common web technologies using passive response signatures.",

  async run(context) {
    const targetUrl = getTargetUrl(context);

    await assertSafeUrl(targetUrl);

    if (context?.signal?.aborted) {
      return {
        data: {
          technologies: [],
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

    const response = await get(targetUrl, {
      signal: context?.signal,

      headers: requestHeaders,
    });

    if (context?.signal?.aborted) {
      return {
        data: {
          technologies: [],
        },

        evidence: [],

        fingerprints: [],

        verificationRecords: [],

        metadata: {
          cancelled: true,
        },
      };
    }

    const technologies = detectTechnologies(response.headers, response.data);

    const fingerprints = technologies.map((technology) =>
      createTechnologyFingerprint({
        name: technology.name,

        source: technology.source,

        confidence: "medium",

        evidence: {
          url: targetUrl,

          statusCode: response.status,
        },
      }),
    );

    const evidence = createExchangeEvidence({
      request: {
        method: "GET",

        url: targetUrl,

        headers: requestHeaders,
      },

      response: {
        status: response.status,

        statusText: response.statusText,

        headers: response.headers,

        body: response.data,

        contentType: response.headers?.["content-type"],
      },
    });

    return {
      data: {
        technologies,
      },

      evidence: [evidence],

      fingerprints,

      verificationRecords: [],

      metadata: {
        technologyCount: technologies.length,

        signaturesChecked: TECHNOLOGY_SIGNATURES.length,
      },
    };
  },
});

export default scanner;
