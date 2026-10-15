import { get } from "../../request/request.js";
import { createExchangeEvidence } from "../shared/evidence.js";
import { createTechnologyFingerprint } from "../shared/fingerprint.js";
import { createReconScanner, getTargetUrl } from "../shared/reconContract.js";
import { assertSafeUrl } from "../shared/resolver.js";

const VERSION_PATTERNS = [
  {
    name: "nginx",
    pattern: /nginx\/([0-9.]+)/i,
  },
  {
    name: "Apache",
    pattern: /Apache\/([0-9.]+)/i,
  },
  {
    name: "PHP",
    pattern: /PHP\/([0-9.]+)/i,
  },
  {
    name: "Express",
    pattern: /Express(?:\/|\s+)([0-9.]+)/i,
  },
  {
    name: "IIS",
    pattern: /IIS\/([0-9.]+)/i,
  },
];

const detectVersions = (headers, body) => {
  const values = [
    ...Object.values(headers ?? {}).map(String),
    typeof body === "string" ? body : "",
  ];

  const combined = values.join("\n");

  const versions = [];

  for (const signature of VERSION_PATTERNS) {
    const match = combined.match(signature.pattern);

    if (match?.[1]) {
      versions.push({
        name: signature.name,
        version: match[1],
      });
    }
  }

  return versions;
};

const scanner = createReconScanner({
  id: "recon.version-detection",
  name: "Version Detection",
  description: "Detects publicly exposed service and technology versions.",

  async run(context) {
    const targetUrl = getTargetUrl(context);

    await assertSafeUrl(targetUrl);

    const response = await get(targetUrl, {
      signal: context?.signal,
      headers: context?.session?.getHeaders?.() ?? {},
    });

    const versions = detectVersions(response.headers, response.data);

    const fingerprints = versions.map((item) =>
      createTechnologyFingerprint({
        name: item.name,
        version: item.version,
        source: "http-response",
      }),
    );

    return {
      data: {
        versions,
      },
      evidence: [
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
      ],
      fingerprints,
    };
  },
});

export default scanner;
