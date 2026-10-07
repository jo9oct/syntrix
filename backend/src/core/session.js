const createSession = ({
  headers = {},
  cookies = {},
  metadata = {},
} = {}) => {
  const session = {
    headers: {
      ...headers,
    },

    cookies: {
      ...cookies,
    },

    metadata: {
      ...metadata,
    },
  };

  const getCookieHeader = () =>
    Object.entries(
      session.cookies,
    )
      .map(
        ([name, value]) =>
          `${name}=${value}`,
      )
      .join('; ');

  const setCookie = (
    name,
    value,
  ) => {
    if (
      typeof name !== 'string' ||
      name.trim().length === 0
    ) {
      return;
    }

    session.cookies[
      name.trim()
    ] = String(value);
  };

  const removeCookie = (
    name,
  ) => {
    delete session.cookies[
      name
    ];
  };

  const getHeaders = () => {
    const result = {
      ...session.headers,
    };

    const cookieHeader =
      getCookieHeader();

    if (cookieHeader) {
      result.cookie =
        cookieHeader;
    }

    return result;
  };

  const setHeader = (
    name,
    value,
  ) => {
    session.headers[
      String(name).toLowerCase()
    ] = String(value);
  };

  const clear = () => {
    session.headers = {};
    session.cookies = {};
    session.metadata = {};
  };

  return {
    getCookieHeader,
    setCookie,
    removeCookie,
    getHeaders,
    setHeader,
    clear,
  };
};

export {
  createSession,
};