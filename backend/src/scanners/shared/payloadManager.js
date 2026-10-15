const SAFE_MARKER = "assessment-marker";

const PAYLOADS = Object.freeze({
  xss: [`<${SAFE_MARKER}>`, `"${SAFE_MARKER}"`],

  sqli: [`'`, `"`],

  pathTraversal: ["../", "..\\"],

  openRedirect: ["https://example.invalid/"],

  commandInjection: ["assessment-marker"],

  ssrf: ["https://example.invalid/"],
});

const getPayloads = (type) => {
  const payloads = PAYLOADS[type];

  if (!payloads) {
    return [];
  }

  return [...payloads];
};

const getSafeMarker = () => SAFE_MARKER;

export { getPayloads, getSafeMarker };
