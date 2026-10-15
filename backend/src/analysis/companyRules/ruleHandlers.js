// STATUS: UPDATED

const normalizeValue = (value) =>
  String(value ?? "")
    .trim()
    .toLowerCase();

const getHeaderValue = ({ scannerResults, header }) => {
  const normalizedHeader = normalizeValue(header);

  /*
   * CORS-specific headers must be read from
   * the public CORS scanner ID exposed by
   * the scanner registry and result processor.
   */
  if (
    normalizedHeader === "access-control-allow-origin" ||
    normalizedHeader === "access-control-allow-credentials"
  ) {
    const corsResult = scannerResults.find(
      (result) => result?.scannerId === "cors",
    );

    if (corsResult) {
      const data = corsResult.data ?? {};

      if (normalizedHeader === "access-control-allow-origin") {
        return {
          found: data.allowOrigin !== null && data.allowOrigin !== undefined,

          value: data.allowOrigin ?? null,

          scannerId: corsResult.scannerId,

          source: "data.allowOrigin",
        };
      }

      return {
        found: data.allowCredentials !== undefined,

        value: data.allowCredentials,

        scannerId: corsResult.scannerId,

        source: "data.allowCredentials",
      };
    }
  }

  /*
   * General response headers are provided by
   * the public securityHeaders scanner ID.
   *
   * The scanner implementation internally uses
   * "security.security-headers", but the scanner
   * registry exposes it as "securityHeaders".
   * resultProcessor.js uses the registry ID.
   */
  const securityHeadersResult = scannerResults.find(
    (result) => result?.scannerId === "securityHeaders",
  );

  if (securityHeadersResult) {
    const data = securityHeadersResult.data;

    if (
      data &&
      typeof data === "object" &&
      data.headers &&
      typeof data.headers === "object"
    ) {
      const match = Object.entries(data.headers).find(
        ([key]) => normalizeValue(key) === normalizedHeader,
      );

      if (match) {
        return {
          found: true,

          value: match[1],

          scannerId: securityHeadersResult.scannerId,

          source: "data.headers",
        };
      }

      return {
        found: false,

        value: null,

        scannerId: securityHeadersResult.scannerId,

        source: "data.headers",
      };
    }
  }

  return {
    found: false,
    value: null,
    scannerId: null,
    source: null,
  };
};

const evaluateOperator = ({ actual, operator, expected, exists }) => {
  switch (operator) {
    case "equals":
      return normalizeValue(actual) === normalizeValue(expected);

    case "not_equals":
      /*
       * A missing value is considered different
       * from the expected value.
       *
       * Example:
       * missing header != "*"
       * therefore the rule passes.
       */
      if (!exists) {
        return true;
      }

      return normalizeValue(actual) !== normalizeValue(expected);

    case "contains":
      if (!exists) {
        return false;
      }

      return normalizeValue(actual).includes(normalizeValue(expected));

    case "not_contains":
      if (!exists) {
        return false;
      }

      return !normalizeValue(actual).includes(normalizeValue(expected));

    case "exists":
      return exists === true;

    case "not_exists":
      return exists === false;

    default: {
      const error = new Error(`Unsupported company rule operator: ${operator}`);

      error.code = "UNSUPPORTED_COMPANY_RULE_OPERATOR";

      error.statusCode = 400;

      throw error;
    }
  }
};

const evaluateHeaderRule = ({ rule, scannerResults }) => {
  const ruleDefinition = rule?.rule ?? {};

  const header = ruleDefinition.header;

  const operator = ruleDefinition.operator;

  const expected = ruleDefinition.value;

  if (typeof header !== "string" || header.trim().length === 0) {
    const error = new Error("Header company rule requires a header name.");

    error.code = "INVALID_COMPANY_RULE_DEFINITION";

    error.statusCode = 400;

    throw error;
  }

  if (typeof operator !== "string" || operator.trim().length === 0) {
    const error = new Error("Header company rule requires an operator.");

    error.code = "INVALID_COMPANY_RULE_DEFINITION";

    error.statusCode = 400;

    throw error;
  }

  const observation = getHeaderValue({
    scannerResults,
    header,
  });

  const matches = evaluateOperator({
    actual: observation.value,

    operator,

    expected,

    exists: observation.found,
  });

  return {
    supported: observation.scannerId !== null,

    violated: !matches,

    actual: observation.value,

    expected,

    operator,

    scannerId: observation.scannerId,

    source: observation.source,
  };
};

const evaluateCorsRule = ({ rule, scannerResults }) => {
  const ruleDefinition = rule?.rule ?? {};

  const property = ruleDefinition.property;

  const operator = ruleDefinition.operator;

  const expected = ruleDefinition.value;

  const supportedProperties = new Set(["allowOrigin", "allowCredentials"]);

  if (!supportedProperties.has(property)) {
    const error = new Error(`Unsupported CORS rule property: ${property}`);

    error.code = "INVALID_COMPANY_RULE_DEFINITION";

    error.statusCode = 400;

    throw error;
  }

  if (typeof operator !== "string" || operator.trim().length === 0) {
    const error = new Error("CORS company rule requires an operator.");

    error.code = "INVALID_COMPANY_RULE_DEFINITION";

    error.statusCode = 400;

    throw error;
  }

  const corsResult = scannerResults.find(
    (result) => result?.scannerId === "cors",
  );

  if (!corsResult) {
    return {
      supported: false,

      violated: false,

      actual: null,

      expected,

      operator,

      scannerId: "cors",

      source: `data.${property}`,
    };
  }

  const data = corsResult.data ?? {};

  const actual = data[property];

  const exists = actual !== undefined && actual !== null;

  const matches = evaluateOperator({
    actual,

    operator,

    expected,

    exists,
  });

  return {
    supported: true,

    violated: !matches,

    actual,

    expected,

    operator,

    scannerId: "cors",

    source: `data.${property}`,
  };
};

const evaluateRule = ({ rule, scannerResults = [] }) => {
  const type = normalizeValue(rule?.rule?.type);

  switch (type) {
    case "header":
      return evaluateHeaderRule({
        rule,
        scannerResults,
      });

    case "cors":
      return evaluateCorsRule({
        rule,
        scannerResults,
      });

    default: {
      const error = new Error(`Unsupported company rule type: ${type}`);

      error.code = "UNSUPPORTED_COMPANY_RULE_TYPE";

      error.statusCode = 400;

      throw error;
    }
  }
};

export { evaluateRule, evaluateHeaderRule, evaluateCorsRule };
