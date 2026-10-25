// STATUS: UPDATED
// File: src/scanners/authentication/loginChecks.js

export const LOGIN_PATTERN =
  /(?:login|log-in|signin|sign-in|authenticate|auth)(?:\/|$|[?#\s])/i;

export const REGISTER_PATTERN =
  /(?:register|sign-up|signup|create-account|registration)(?:\/|$|[?#\s])/i;

export function safeUrl(rawUrl, baseUrl) {
  try {
    const parsed = new URL(rawUrl, baseUrl);

    if (
      !["http:", "https:"].includes(parsed.protocol) ||
      parsed.username ||
      parsed.password
    ) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

export function classifyAuthUrl(rawUrl) {
  try {
    const url = new URL(rawUrl);
    const candidate = `${url.pathname} ${url.search}`.trim();

    if (REGISTER_PATTERN.test(candidate)) {
      return "registration";
    }

    if (LOGIN_PATTERN.test(candidate)) {
      return "login";
    }

    return null;
  } catch {
    return null;
  }
}

export function discoverAuthLinks({
  links = [],
  targetOrigin,
  targetHref,
  visited,
  pending,
  maxPages,
}) {
  for (const link of links) {
    if (visited.size + pending.size >= maxPages) {
      break;
    }

    const linkUrl = safeUrl(link.url, targetHref);

    if (
      !linkUrl ||
      linkUrl.origin !== targetOrigin ||
      visited.has(linkUrl.href) ||
      pending.has(linkUrl.href)
    ) {
      continue;
    }

    const linkType = classifyAuthUrl(linkUrl.href);
    const labelType = classifyAuthUrl(`https://local.invalid/${link.text}`);
    const authType = linkType || labelType;

    if (authType) {
      pending.set(linkUrl.href, authType);
    }
  }
}
