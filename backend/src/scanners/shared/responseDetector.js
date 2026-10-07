const normalizeBody = (value) => {
  if (typeof value !== 'string') {
    return '';
  }

  return value
    .replace(/\s+/g, ' ')
    .trim();
};

const containsMarker = (
  value,
  marker,
) => {
  const body = normalizeBody(value);

  return body.includes(marker);
};

const getResponseSignature = (response) => ({
  status: response?.status ?? null,
  statusText: response?.statusText ?? null,
  contentType:
    response?.headers?.['content-type'] ?? null,
  contentLength:
    typeof response?.data === 'string'
      ? response.data.length
      : 0,
});

const responsesDiffer = (
  baseline,
  candidate,
) => {
  if (!baseline || !candidate) {
    return false;
  }

  return (
    baseline.status !== candidate.status ||
    normalizeBody(baseline.data) !==
      normalizeBody(candidate.data)
  );
};

export {
  containsMarker,
  getResponseSignature,
  normalizeBody,
  responsesDiffer,
};