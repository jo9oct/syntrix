const parseUrl = (value) => {
  if (
    typeof value !== 'string' ||
    value.trim().length === 0
  ) {
    throw new TypeError(
      'A URL string is required.',
    );
  }

  const parsed = new URL(
    value.trim(),
  );

  if (
    !['http:', 'https:'].includes(
      parsed.protocol,
    )
  ) {
    throw new TypeError(
      'Only HTTP and HTTPS URLs are supported.',
    );
  }

  if (
    parsed.username ||
    parsed.password
  ) {
    throw new TypeError(
      'URLs containing embedded credentials are not supported.',
    );
  }

  return parsed;
};

const normalizeUrl = (value) => {
  const parsed = parseUrl(value);

  parsed.hash = '';

  if (
    parsed.pathname.length > 1 &&
    parsed.pathname.endsWith('/')
  ) {
    parsed.pathname =
      parsed.pathname.replace(
        /\/+$/,
        '',
      );
  }

  return parsed.toString();
};

const getHostname = (value) =>
  parseUrl(value).hostname.toLowerCase();

const getOrigin = (value) =>
  parseUrl(value).origin;

const getPath = (value) =>
  parseUrl(value).pathname;

const isSameOrigin = (
  first,
  second,
) =>
  getOrigin(first) ===
  getOrigin(second);

const isHttpUrl = (value) => {
  try {
    const parsed = new URL(value);

    return [
      'http:',
      'https:',
    ].includes(
      parsed.protocol,
    );
  } catch {
    return false;
  }
};

export {
  parseUrl,
  normalizeUrl,
  getHostname,
  getOrigin,
  getPath,
  isSameOrigin,
  isHttpUrl,
};