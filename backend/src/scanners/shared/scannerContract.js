const SECURITY_CATEGORY = 'security';

const getTargetUrl = (context) => {
  const targetUrl = context?.target?.url ?? context?.targetUrl;

  if (typeof targetUrl !== 'string' || targetUrl.length === 0) {
    throw new Error('Security scanner context must contain a target URL.');
  }

  return targetUrl;
};

const createSecurityScanner = ({
  id,
  name,
  description,
  run,
}) => {
  if (
    typeof id !== 'string' ||
    !/^security\.[a-z0-9-]+$/.test(id)
  ) {
    throw new TypeError(`Invalid security scanner identifier: ${id}`);
  }

  if (typeof name !== 'string' || name.length === 0) {
    throw new TypeError(`Security scanner ${id} requires a name.`);
  }

  if (typeof run !== 'function') {
    throw new TypeError(`Security scanner ${id} requires a run function.`);
  }

  return Object.freeze({
    id,
    name,
    description: description ?? '',
    category: SECURITY_CATEGORY,
    type: SECURITY_CATEGORY,

    async run(context) {
      const result = await run(context);

      if (!result || typeof result !== 'object') {
        throw new TypeError(
          `Security scanner ${id} returned an invalid result.`,
        );
      }

      return {
        scannerId: id,
        category: SECURITY_CATEGORY,
        status: result.status ?? 'completed',
        findings: Array.isArray(result.findings)
          ? result.findings
          : [],
        evidence: Array.isArray(result.evidence)
          ? result.evidence
          : [],
        fingerprints: Array.isArray(result.fingerprints)
          ? result.fingerprints
          : [],
        data: result.data ?? {},
        metadata: result.metadata ?? {},
      };
    },
  });
};

export {
  SECURITY_CATEGORY,
  createSecurityScanner,
  getTargetUrl,
};