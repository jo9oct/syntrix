import crypto from "node:crypto";

const stableStringify = (value) => {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }

  const keys = Object.keys(value).sort();

  return `{${keys
    .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
    .join(",")}}`;
};

const createHash = (value) =>
  crypto.createHash("sha256").update(value).digest("hex");

const createFingerprint = ({
  type,
  name,
  version = null,
  confidence = "medium",
  source,
  evidence = {},
  value = null,
}) => {
  const normalizedName = String(name ?? "").trim();

  const normalizedSource = String(source ?? "").trim();

  if (!normalizedName) {
    throw new TypeError("Fingerprint name is required.");
  }

  if (!normalizedSource) {
    throw new TypeError("Fingerprint source is required.");
  }

  const material = stableStringify({
    type,
    name: normalizedName.toLowerCase(),
    version: version ?? null,
    source: normalizedSource.toLowerCase(),
    value,
  });

  const fingerprint = createHash(material);

  return {
    type,

    name: normalizedName,

    version: version ?? null,

    confidence,

    source: normalizedSource,

    evidence,

    fingerprint,
  };
};

const createTechnologyFingerprint = ({
  name,
  version = null,
  source = "technology",
  confidence = "medium",
  evidence = {},
}) =>
  createFingerprint({
    type: "technology",

    name,

    version,

    confidence,

    source,

    evidence,
  });

const createServiceFingerprint = ({
  service,
  port,
  protocol,
  version = null,
  confidence = "medium",
  source = "serviceDetection",
  evidence = {},
}) => {
  const normalizedService = String(service ?? "unknown").trim();

  const serviceName = port ? `${normalizedService}:${port}` : normalizedService;

  return createFingerprint({
    type: "service",

    name: serviceName,

    version,

    confidence,

    source,

    evidence: {
      ...evidence,

      service: normalizedService,

      port: port ?? null,

      protocol: protocol ?? null,
    },

    value: {
      service: normalizedService,

      port: port ?? null,

      protocol: protocol ?? null,

      version,
    },
  });
};

export {
  createFingerprint,
  createServiceFingerprint,
  createTechnologyFingerprint,
  stableStringify,
};
