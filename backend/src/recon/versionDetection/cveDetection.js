const NVD_API_URL = "https://services.nvd.nist.gov/rest/json/cves/2.0";

const REQUEST_TIMEOUT_MS = 8_000;
const MAX_RESPONSE_BYTES = 1_000_000;
const MAX_PRODUCTS = 15;
const MAX_CVES_PER_PRODUCT = 10;
const MAX_TOTAL_CVES = 50;

const normalizeText = (value) =>
  typeof value === "string" ? value.trim() : "";

const normalizeVersion = (value) => {
  const version = normalizeText(value);

  if (!version || version.length > 100) {
    return null;
  }

  return version;
};

const getDescription = (descriptions = []) => {
  const english = descriptions.find(
    (item) => item.lang === "en" && typeof item.value === "string",
  );

  return english?.value?.slice(0, 2_000) ?? null;
};

const getCvss = (metrics = {}) => {
  const candidates = [
    ...(metrics.cvssMetricV40 ?? []),
    ...(metrics.cvssMetricV31 ?? []),
    ...(metrics.cvssMetricV30 ?? []),
    ...(metrics.cvssMetricV2 ?? []),
  ];

  const metric = candidates[0];

  if (!metric) {
    return {
      score: null,
      severity: null,
      version: null,
    };
  }

  const data = metric.cvssData ?? {};

  return {
    score: Number.isFinite(data.baseScore) ? data.baseScore : null,
    severity:
      normalizeText(data.baseSeverity || metric.baseSeverity).toLowerCase() ||
      null,
    version: normalizeText(data.version) || null,
  };
};

const readJsonWithLimit = async (response) => {
  const declaredLength = Number(response.headers.get("content-length"));

  if (Number.isFinite(declaredLength) && declaredLength > MAX_RESPONSE_BYTES) {
    throw new Error("NVD response exceeds the configured size limit.");
  }

  if (!response.body) {
    throw new Error("NVD returned an empty response body.");
  }

  const reader = response.body.getReader();
  const chunks = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) break;

      totalBytes += value.byteLength;

      if (totalBytes > MAX_RESPONSE_BYTES) {
        await reader.cancel();
        throw new Error("NVD response exceeds the configured size limit.");
      }

      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const body = new Uint8Array(totalBytes);
  let offset = 0;

  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return JSON.parse(new TextDecoder().decode(body));
};

const searchNvd = async (keyword) => {
  const url = new URL(NVD_API_URL);
  url.searchParams.set("keywordSearch", keyword);
  url.searchParams.set("resultsPerPage", String(MAX_CVES_PER_PRODUCT));

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const headers = {
      Accept: "application/json",
    };

    if (process.env.NVD_API_KEY) {
      headers.apiKey = process.env.NVD_API_KEY;
    }

    const response = await fetch(url, {
      method: "GET",
      headers,
      signal: controller.signal,
      redirect: "error",
    });

    if (!response.ok) {
      throw new Error(`NVD returned HTTP ${response.status}.`);
    }

    return await readJsonWithLimit(response);
  } finally {
    clearTimeout(timeout);
  }
};

/**
 * Looks up possible CVEs for software discovered by version detection.
 *
 * IMPORTANT:
 * NVD keyword matches are candidates only. This function does not prove
 * that a product is affected or that the target is vulnerable.
 *
 * @param {Array<{name: string, version: string}>} versions
 * @param {{signal?: AbortSignal}} options
 */
export const detectCveCandidates = async (versions = [], { signal } = {}) => {
  if (!Array.isArray(versions) || versions.length === 0) {
    return {
      candidates: [],
      queriedProducts: 0,
      errors: [],
      status: "no-products",
    };
  }

  const products = versions
    .filter((item) => item && typeof item === "object")
    .map((item) => ({
      name: normalizeText(item.name),
      version: normalizeVersion(item.version),
    }))
    .filter(
      (item) =>
        item.name &&
        item.name.length <= 150 &&
        item.version &&
        item.version !== "unknown",
    )
    .filter(
      (item, index, items) =>
        items.findIndex(
          (other) =>
            other.name.toLowerCase() === item.name.toLowerCase() &&
            other.version === item.version,
        ) === index,
    )
    .slice(0, MAX_PRODUCTS);

  const candidatesById = new Map();
  const errors = [];
  let queriedProducts = 0;

  for (const product of products) {
    if (signal?.aborted) {
      break;
    }

    const keyword = `${product.name} ${product.version}`;

    try {
      const result = await searchNvd(keyword);
      queriedProducts += 1;

      for (const item of result.vulnerabilities ?? []) {
        if (candidatesById.size >= MAX_TOTAL_CVES) {
          break;
        }

        const cve = item.cve;

        if (!cve || typeof cve.id !== "string") {
          continue;
        }

        const existing = candidatesById.get(cve.id);
        const cvss = getCvss(cve.metrics);

        const matchedProduct = {
          name: product.name,
          version: product.version,
        };

        if (existing) {
          if (
            !existing.matchedProducts.some(
              (matched) =>
                matched.name === matchedProduct.name &&
                matched.version === matchedProduct.version,
            )
          ) {
            existing.matchedProducts.push(matchedProduct);
          }

          continue;
        }

        candidatesById.set(cve.id, {
          cveId: cve.id,
          description: getDescription(cve.descriptions),
          published: cve.published ?? null,
          lastModified: cve.lastModified ?? null,
          cvss,
          matchedProducts: [matchedProduct],
          matchType: "nvd-keyword",
          applicability: "unverified",
          confidence: "low",
          verified: false,
          source: "NVD",
          sourceUrl: `https://nvd.nist.gov/vuln/detail/${encodeURIComponent(cve.id)}`,
        });
      }
    } catch (error) {
      errors.push({
        product: product.name,
        version: product.version,
        message: signal?.aborted
          ? "CVE lookup cancelled."
          : error.name === "AbortError"
            ? "NVD request timed out."
            : "NVD lookup failed.",
      });

      if (signal?.aborted) {
        break;
      }
    }
  }

  return {
    candidates: [...candidatesById.values()],
    queriedProducts,
    errors,
    status: signal?.aborted
      ? "cancelled"
      : errors.length > 0
        ? "partial"
        : "completed",
  };
};

export default detectCveCandidates;
