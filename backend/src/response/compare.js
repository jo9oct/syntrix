const normalizeBodyForComparison = (body) =>
  String(body ?? "")
    .replace(/\s+/g, " ")
    .trim();

const calculateSimilarity = (first, second) => {
  const left = normalizeBodyForComparison(first);

  const right = normalizeBodyForComparison(second);

  if (left === right) {
    return 1;
  }

  if (left.length === 0 && right.length === 0) {
    return 1;
  }

  const maxLength = Math.max(left.length, right.length);

  if (maxLength === 0) {
    return 1;
  }

  let common = 0;

  const minimumLength = Math.min(left.length, right.length);

  for (let index = 0; index < minimumLength; index += 1) {
    if (left[index] === right[index]) {
      common += 1;
    }
  }

  return common / maxLength;
};

const compareResponses = (baseline, candidate) => {
  const statusChanged = baseline.statusCode !== candidate.statusCode;

  const contentTypeChanged = baseline.contentType !== candidate.contentType;

  const bodySimilarity = calculateSimilarity(baseline.body, candidate.body);

  const materiallyDifferent =
    statusChanged || contentTypeChanged || bodySimilarity < 0.95;

  return {
    statusChanged,
    contentTypeChanged,
    bodySimilarity,
    materiallyDifferent,
  };
};

export { normalizeBodyForComparison, calculateSimilarity, compareResponses };
