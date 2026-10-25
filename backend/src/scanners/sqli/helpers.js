/*
 * STATUS: UPDATED
 * File: src/scanners/sqli/helpers.js
 */

const MAX_COMPARISON_BODY_LENGTH = 100_000;

const SQL_ERROR_PATTERNS = [
  /you have an error in your sql syntax/i,
  /warning:\s*mysql_/i,
  /mysqli?_query\s*\(/i,
  /postgresql.*(?:syntax error|error)/i,
  /pg_query\s*\(/i,
  /sqlite(?:3)?::exception/i,
  /sqlite error/i,
  /ora-\d{5}/i,
  /oracle error/i,
  /microsoft sql server.*(?:error|exception)/i,
  /sql server.*(?:syntax|error)/i,
  /unclosed quotation mark after the character string/i,
  /odbc sql server driver/i,
  /sqlstate\[[0-9a-z]+\]/i,
  /unterminated quoted string/i,
  /quoted string not properly terminated/i,
  /syntax error at or near/i,
];

const DATABASE_FINGERPRINTS = [
  {
    family: "mysql",
    patterns: [
      /you have an error in your sql syntax/i,
      /warning:\s*mysql_/i,
      /mysqli?_query\s*\(/i,
      /mysql server version/i,
    ],
  },
  {
    family: "postgresql",
    patterns: [
      /postgresql.*(?:syntax error|error)/i,
      /pg_query\s*\(/i,
      /syntax error at or near/i,
      /unterminated quoted string/i,
    ],
  },
  {
    family: "oracle",
    patterns: [/ora-\d{5}/i, /oracle error/i],
  },
  {
    family: "mssql",
    patterns: [
      /microsoft sql server.*(?:error|exception)/i,
      /sql server.*(?:syntax|error)/i,
      /unclosed quotation mark after the character string/i,
      /odbc sql server driver/i,
    ],
  },
  {
    family: "sqlite",
    patterns: [/sqlite(?:3)?::exception/i, /sqlite error/i],
  },
];

const normalizeBody = (value) => {
  if (typeof value === "string") {
    return value.slice(0, MAX_COMPARISON_BODY_LENGTH);
  }

  if (value === null || value === undefined) {
    return "";
  }

  try {
    return JSON.stringify(value).slice(0, MAX_COMPARISON_BODY_LENGTH);
  } catch {
    return "";
  }
};

const normalizeDynamicContent = (value) =>
  normalizeBody(value)
    .replace(
      /\b\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?\b/gi,
      "[TIMESTAMP]",
    )
    .replace(
      /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/gi,
      "[UUID]",
    )
    .replace(/\b[0-9a-f]{24,}\b/gi, "[HEX_TOKEN]")
    .replace(/\b\d{10,}\b/g, "[LONG_NUMBER]")
    .replace(/\s+/g, " ")
    .trim();

const normalizeComparableBody = (value) => normalizeDynamicContent(value);

const getSqlErrorSignature = (value) => {
  const body = normalizeBody(value);

  if (!body) {
    return null;
  }

  const index = SQL_ERROR_PATTERNS.findIndex((pattern) => pattern.test(body));

  return index < 0 ? null : index;
};

/*
 * Returns a tentative database-family hint.
 * A hint is not proof of SQL injection or a definitive database identity.
 */
const identifyDatabaseFamily = (value) => {
  const body = normalizeBody(value);

  if (!body) {
    return null;
  }

  const matches = DATABASE_FINGERPRINTS.filter(({ patterns }) =>
    patterns.some((pattern) => pattern.test(body)),
  );

  return matches.length === 1 ? matches[0].family : null;
};

const summarizeResponse = (response) => ({
  status: response?.status ?? response?.statusCode ?? null,
  body: normalizeComparableBody(response?.data ?? response?.body),
  durationMs:
    Number.isFinite(response?.durationMs) && response.durationMs >= 0
      ? response.durationMs
      : null,
});

const isSuccessfulResponse = (response) => {
  const status = response?.status ?? response?.statusCode;

  return Number.isInteger(status) && status >= 200 && status < 400;
};

const isMeaningfulBooleanDifference = (
  baselineResponse,
  trueResponse,
  falseResponse,
) => {
  if (!baselineResponse || !trueResponse || !falseResponse) {
    return false;
  }

  const baseline = summarizeResponse(baselineResponse);
  const trueResult = summarizeResponse(trueResponse);
  const falseResult = summarizeResponse(falseResponse);

  if (
    !isSuccessfulResponse(trueResponse) &&
    !isSuccessfulResponse(falseResponse)
  ) {
    return false;
  }

  if (trueResult.status !== falseResult.status) {
    return (
      (trueResult.status === baseline.status &&
        falseResult.status !== baseline.status) ||
      (falseResult.status === baseline.status &&
        trueResult.status !== baseline.status)
    );
  }

  if (
    baseline.body.length < 20 ||
    trueResult.body.length < 20 ||
    falseResult.body.length < 20
  ) {
    return false;
  }

  if (trueResult.body === falseResult.body) {
    return false;
  }

  const trueMatchesBaseline = trueResult.body === baseline.body;
  const falseMatchesBaseline = falseResult.body === baseline.body;

  if (trueMatchesBaseline !== falseMatchesBaseline) {
    return true;
  }

  /*
   * When all three normalized bodies differ, a large length difference
   * can be a secondary signal. It remains a heuristic, not confirmation.
   */
  const maxLength = Math.max(
    trueResult.body.length,
    falseResult.body.length,
    1,
  );

  const lengthDifference = Math.abs(
    trueResult.body.length - falseResult.body.length,
  );

  return (
    lengthDifference >= 100 &&
    (lengthDifference / maxLength >= 0.1 || lengthDifference >= 200)
  );
};

export {
  getSqlErrorSignature,
  identifyDatabaseFamily,
  isMeaningfulBooleanDifference,
  isSuccessfulResponse,
  normalizeBody,
  normalizeComparableBody,
  summarizeResponse,
};
