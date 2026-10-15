const RECON_CATEGORY = "recon";

const getTargetUrl = (context) => {
  const targetUrl = context?.target?.url ?? context?.targetUrl;

  if (typeof targetUrl !== "string" || targetUrl.length === 0) {
    throw new Error("Recon scanner context must contain a target URL.");
  }

  return targetUrl;
};

const getTargetHostname = (context) => {
  const hostname =
    context?.target?.hostname ??
    context?.hostname ??
    new URL(getTargetUrl(context)).hostname;

  if (typeof hostname !== "string" || hostname.length === 0) {
    throw new Error("Recon scanner context must contain a target hostname.");
  }

  return hostname.toLowerCase();
};

const normalizeReconResult = (scannerId, result = {}) => {
  if (!result || typeof result !== "object") {
    throw new TypeError(
      `Recon scanner ${scannerId} returned an invalid result.`,
    );
  }

  return {
    scannerId,
    category: RECON_CATEGORY,
    status: result.status ?? "completed",
    data: result.data ?? {},
    findings: Array.isArray(result.findings) ? result.findings : [],
    evidence: Array.isArray(result.evidence) ? result.evidence : [],
    fingerprints: Array.isArray(result.fingerprints) ? result.fingerprints : [],
    metadata: result.metadata ?? {},
  };
};

const createReconScanner = ({ id, name, description, run }) => {
  if (typeof id !== "string" || !/^recon\.[a-z0-9-]+$/.test(id)) {
    throw new TypeError(`Invalid recon scanner identifier: ${id}`);
  }

  if (typeof name !== "string" || name.length === 0) {
    throw new TypeError(`Recon scanner ${id} requires a name.`);
  }

  if (typeof run !== "function") {
    throw new TypeError(`Recon scanner ${id} requires a run function.`);
  }

  return Object.freeze({
    id,
    name,
    description: description ?? "",
    category: RECON_CATEGORY,
    type: RECON_CATEGORY,

    async run(context) {
      const result = await run(context);

      return normalizeReconResult(id, result);
    },
  });
};

export {
  RECON_CATEGORY,
  createReconScanner,
  getTargetHostname,
  getTargetUrl,
  normalizeReconResult,
};
