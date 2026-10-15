const cloneUrl = (value) => {
  const url = new URL(value);

  return url;
};

const getParameters = (value) => {
  const url = cloneUrl(value);

  return [...url.searchParams.keys()];
};

const setParameter = (value, parameter, replacement) => {
  const url = cloneUrl(value);

  url.searchParams.set(parameter, replacement);

  return url.toString();
};

const getParameterEntries = (value) => {
  const url = cloneUrl(value);

  return [...url.searchParams.entries()];
};

export { getParameterEntries, getParameters, setParameter };
