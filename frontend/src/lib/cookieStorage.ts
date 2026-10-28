// STATUS: CREATED
// FILE: frontend/src/lib/cookieStorage.ts
// PURPOSE: Secure Cookie-based storage adapter for auth tokens and Zustand auth store

export interface StateStorage {
  getItem: (name: string) => string | null | Promise<string | null>;
  setItem: (name: string, value: string) => void | Promise<void>;
  removeItem: (name: string) => void | Promise<void>;
}

const AUTH_COOKIE_NAME = "sentrix_token";
const DEFAULT_EXPIRY_DAYS = 7;

/**
 * Read a cookie by name from document.cookie
 */
export const getCookie = (name: string): string | null => {
  if (typeof document === "undefined") return null;

  try {
    const nameEQ = encodeURIComponent(name) + "=";
    const pairs = document.cookie.split(";");

    for (let i = 0; i < pairs.length; i++) {
      let pair = pairs[i].trim();
      if (pair.indexOf(nameEQ) === 0) {
        const rawValue = pair.substring(nameEQ.length);
        try {
          return decodeURIComponent(rawValue);
        } catch {
          return rawValue;
        }
      }
    }
  } catch {
    // Return null if cookie access is blocked
  }

  return null;
};

/**
 * Set a secure cookie with SameSite=Lax, Secure flag on HTTPS, and bounded expiration
 */
export const setCookie = (
  name: string,
  value: string,
  days = DEFAULT_EXPIRY_DAYS,
): void => {
  if (typeof document === "undefined") return;

  try {
    const expires = new Date();
    expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);

    const isSecure =
      typeof window !== "undefined" &&
      window.location &&
      window.location.protocol === "https:";

    const cookieParts = [
      `${encodeURIComponent(name)}=${encodeURIComponent(value)}`,
      `expires=${expires.toUTCString()}`,
      "path=/",
      "SameSite=Lax",
    ];

    if (isSecure) {
      cookieParts.push("Secure");
    }

    document.cookie = cookieParts.join("; ");
  } catch (err) {
    console.warn("[cookieStorage] Unable to write cookie:", err);
  }
};

/**
 * Remove a cookie by expiring it immediately
 */
export const removeCookie = (name: string): void => {
  if (typeof document === "undefined") return;

  try {
    const isSecure =
      typeof window !== "undefined" &&
      window.location &&
      window.location.protocol === "https:";

    const cookieParts = [
      `${encodeURIComponent(name)}=`,
      "expires=Thu, 01 Jan 1970 00:00:00 GMT",
      "path=/",
      "SameSite=Lax",
    ];

    if (isSecure) {
      cookieParts.push("Secure");
    }

    document.cookie = cookieParts.join("; ");
  } catch (err) {
    console.warn("[cookieStorage] Unable to remove cookie:", err);
  }
};

/**
 * Read the dedicated JWT auth token from the cookie, with fallback to auth state or legacy localStorage
 */
export const getAuthToken = (): string | null => {
  // 1. Direct dedicated auth cookie
  const directToken =
    getCookie(AUTH_COOKIE_NAME) ||
    getCookie("token") ||
    getCookie("refreshToken");
  if (directToken) {
    if (directToken === "sentrix_demo_auth_token") {
      removeCookie(AUTH_COOKIE_NAME);
    } else {
      return directToken;
    }
  }

  // 2. Zustand auth cookie payload
  const authCookie = getCookie("sentrix-auth");
  if (authCookie) {
    try {
      const parsed = JSON.parse(authCookie);
      if (parsed?.state?.token) {
        if (parsed.state.token === "sentrix_demo_auth_token") {
          removeCookie("sentrix-auth");
        } else if (parsed?.state?.isAuthenticated) {
          setCookie(AUTH_COOKIE_NAME, parsed.state.token);
          return parsed.state.token;
        }
      }
    } catch {
      // Ignore parse failure
    }
  }

  // 3. In-memory fallback
  if (
    typeof window !== "undefined" &&
    (window as any).__SENTRIX_AUTH_TOKEN__ &&
    (window as any).__SENTRIX_AUTH_TOKEN__ !== "sentrix_demo_auth_token"
  ) {
    return (window as any).__SENTRIX_AUTH_TOKEN__;
  }

  // 4. Fallback to localStorage (for migration without losing active session)
  if (typeof window !== "undefined" && window.localStorage) {
    try {
      const legacy = window.localStorage.getItem("sentrix-auth");
      if (legacy) {
        const parsed = JSON.parse(legacy);
        if (
          parsed?.state?.isAuthenticated &&
          parsed?.state?.token &&
          parsed.state.token !== "sentrix_demo_auth_token"
        ) {
          const legacyToken = parsed.state.token;
          // Migrate immediately to secure cookie
          setCookie(AUTH_COOKIE_NAME, legacyToken);
          setCookie("sentrix-auth", legacy);
          window.localStorage.removeItem("sentrix-auth");
          return legacyToken;
        } else {
          window.localStorage.removeItem("sentrix-auth");
        }
      }
    } catch {
      // Ignore localStorage error
    }
  }

  return null;
};

/**
 * Set the dedicated JWT auth token in a secure cookie
 */
export const setAuthToken = (
  token: string,
  days = DEFAULT_EXPIRY_DAYS,
): void => {
  setCookie(AUTH_COOKIE_NAME, token, days);
};

/**
 * Clear the dedicated JWT auth token cookie
 */
export const removeAuthToken = (): void => {
  removeCookie(AUTH_COOKIE_NAME);
};

/**
 * Zustand StateStorage adapter that persists only to secure cookies
 * and transparently migrates any legacy localStorage auth entries.
 */
export const cookieStorage: StateStorage = {
  getItem: (name: string): string | null => {
    // Check cookie first
    const fromCookie = getCookie(name);
    if (fromCookie) {
      if (name === "sentrix-auth") {
        try {
          const parsed = JSON.parse(fromCookie);
          if (parsed?.state?.token === "sentrix_demo_auth_token") {
            removeCookie(name);
            return null;
          }
        } catch {
          // Ignore
        }
      }
      return fromCookie;
    }

    // Migration fallback: check localStorage, migrate to cookie, and delete from localStorage
    if (typeof window !== "undefined" && window.localStorage) {
      try {
        const fromLocal = window.localStorage.getItem(name);
        if (fromLocal) {
          if (name === "sentrix-auth") {
            try {
              const parsed = JSON.parse(fromLocal);
              if (
                !parsed?.state?.isAuthenticated ||
                parsed?.state?.token === "sentrix_demo_auth_token"
              ) {
                window.localStorage.removeItem(name);
                return null;
              }
            } catch {
              // Ignore
            }
          }
          setCookie(name, fromLocal, DEFAULT_EXPIRY_DAYS);
          window.localStorage.removeItem(name);
          return fromLocal;
        }
      } catch {
        // Ignore
      }
    }

    return null;
  },

  setItem: (name: string, value: string): void => {
    // Write only to secure cookie
    setCookie(name, value, DEFAULT_EXPIRY_DAYS);

    // Ensure legacy localStorage does not hold sensitive auth state
    if (typeof window !== "undefined" && window.localStorage) {
      try {
        window.localStorage.removeItem(name);
      } catch {
        // Ignore
      }
    }
  },

  removeItem: (name: string): void => {
    removeCookie(name);
    removeAuthToken();

    if (typeof window !== "undefined" && window.localStorage) {
      try {
        window.localStorage.removeItem(name);
      } catch {
        // Ignore
      }
    }
  },
};
