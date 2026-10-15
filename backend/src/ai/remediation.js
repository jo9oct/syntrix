const MAX_REMEDIATION_ITEMS = 8;
const MAX_ITEM_LENGTH = 2000;

const normalizeText = (value) => {
  if (typeof value !== "string") {
    return null;
  }

  const text = value.trim();

  if (!text) {
    return null;
  }

  return text.slice(0, MAX_ITEM_LENGTH);
};

const normalizeList = (value) => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map(normalizeText)
    .filter(Boolean)
    .slice(0, MAX_REMEDIATION_ITEMS);
};

const normalizeRemediation = (value) => {
  if (!value) {
    return {
      summary: null,
      actions: [],
      references: [],
    };
  }

  if (typeof value === "string") {
    return {
      summary: normalizeText(value),
      actions: [],
      references: [],
    };
  }

  return {
    summary: normalizeText(value.summary || value.description),
    actions: normalizeList(value.actions || value.steps),
    references: normalizeList(value.references),
  };
};

const buildDefaultRemediation = (finding) => {
  const category = String(finding?.category || "security").trim();

  return {
    summary:
      `Review the ${category} finding and address ` +
      "the underlying application-security control.",
    actions: [
      "Confirm the finding against the supplied evidence.",
      "Identify and correct the underlying application behavior.",
      "Add a regression test covering the affected security control.",
      "Re-run the relevant security scanner after remediation.",
    ],
    references: [],
  };
};

const ensureRemediation = (remediation, finding) => {
  const normalized = normalizeRemediation(remediation);

  if (
    normalized.summary ||
    normalized.actions.length ||
    normalized.references.length
  ) {
    return normalized;
  }

  return buildDefaultRemediation(finding);
};

export { normalizeRemediation, buildDefaultRemediation, ensureRemediation };
