import {
  normalizeUrl,
  isSameOrigin,
} from '../utils/url.js';

const extractLinks = (
  html,
  baseUrl,
) => {
  if (
    typeof html !== 'string' ||
    html.length === 0
  ) {
    return [];
  }

  const links = new Set();

  const pattern =
    /<a\b[^>]*href\s*=\s*["']([^"']+)["']/gi;

  let match;

  while (
    (match =
      pattern.exec(html)) !== null
  ) {
    const href =
      match[1]?.trim();

    if (!href) {
      continue;
    }

    try {
      const resolved =
        new URL(
          href,
          baseUrl,
        );

      if (
        ![
          'http:',
          'https:',
        ].includes(
          resolved.protocol,
        )
      ) {
        continue;
      }

      resolved.hash = '';

      links.add(
        normalizeUrl(
          resolved.toString(),
        ),
      );
    } catch {
      continue;
    }
  }

  return [
    ...links,
  ];
};

const filterSameOrigin = (
  urls,
  targetUrl,
) =>
  urls.filter((url) =>
    isSameOrigin(
      url,
      targetUrl,
    ),
  );

export {
  extractLinks,
  filterSameOrigin,
};