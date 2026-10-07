const encodeQueryValue = (value) =>
  encodeURIComponent(
    String(value),
  );

const decodeQueryValue = (value) => {
  if (
    typeof value !== 'string'
  ) {
    return '';
  }

  try {
    return decodeURIComponent(
      value,
    );
  } catch {
    return value;
  }
};

const encodeBase64 = (value) =>
  Buffer.from(
    String(value),
    'utf8',
  ).toString('base64');

const decodeBase64 = (value) => {
  if (
    typeof value !== 'string'
  ) {
    return '';
  }

  return Buffer.from(
    value,
    'base64',
  ).toString('utf8');
};

const encodeBase64Url = (value) =>
  encodeBase64(value)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');

const decodeBase64Url = (value) => {
  if (
    typeof value !== 'string'
  ) {
    return '';
  }

  const normalized =
    value
      .replace(/-/g, '+')
      .replace(/_/g, '/');

  const padding =
    normalized.length % 4;

  const padded =
    padding === 0
      ? normalized
      : normalized +
        '='.repeat(
          4 - padding,
        );

  return decodeBase64(
    padded,
  );
};

export {
  encodeQueryValue,
  decodeQueryValue,
  encodeBase64,
  decodeBase64,
  encodeBase64Url,
  decodeBase64Url,
};