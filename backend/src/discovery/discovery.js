import { extractLinks, filterSameOrigin } from "../core/discovery.js";

const discoverLinks = ({ html, baseUrl, sameOrigin = true } = {}) => {
  const links = extractLinks(html, baseUrl);

  if (!sameOrigin) {
    return links;
  }

  return filterSameOrigin(links, baseUrl);
};

const discoverPaths = ({ html, baseUrl } = {}) =>
  discoverLinks({
    html,
    baseUrl,
    sameOrigin: true,
  })
    .map((url) => {
      try {
        return new URL(url).pathname;
      } catch {
        return null;
      }
    })
    .filter(Boolean);

export { discoverLinks, discoverPaths };
