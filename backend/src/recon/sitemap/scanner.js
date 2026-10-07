import {
  get,
} from '../../request/request.js';

import {
  createExchangeEvidence,
} from '../shared/evidence.js';

import {
  createReconScanner,
  getTargetUrl,
} from '../shared/reconContract.js';

import {
  assertSafeUrl,
} from '../shared/resolver.js';

const MAX_SITEMAP_URLS = 100;

const SITEMAP_PATHS = Object.freeze([
  '/sitemap.xml',
  '/sitemap_index.xml',
]);

const decodeXmlValue = (
  value,
) =>
  value
    .replace(
      /&amp;/g,
      '&',
    )
    .replace(
      /&lt;/g,
      '<',
    )
    .replace(
      /&gt;/g,
      '>',
    )
    .replace(
      /&quot;/g,
      '"',
    )
    .replace(
      /&apos;/g,
      "'",
    )
    .trim();

const extractLocations = (
  body,
) => {
  if (
    typeof body !== 'string'
  ) {
    return [];
  }

  const locations = [];

  const pattern =
    /<loc\b[^>]*>([\s\S]*?)<\/loc>/gi;

  let match;

  while (
    (
      match =
        pattern.exec(body)
    ) !== null &&
    locations.length <
      MAX_SITEMAP_URLS
  ) {
    const value =
      decodeXmlValue(
        match[1],
      );

    if (!value) {
      continue;
    }

    try {
      const url =
        new URL(value);

      if (
        ![
          'http:',
          'https:',
        ].includes(
          url.protocol,
        )
      ) {
        continue;
      }

      locations.push(
        url.toString(),
      );
    } catch {
      // Invalid sitemap locations are ignored.
    }
  }

  return [
    ...new Set(
      locations,
    ),
  ].slice(
    0,
    MAX_SITEMAP_URLS,
  );
};

const scanner =
  createReconScanner({
    id:
      'recon.sitemap',

    name:
      'Sitemap Reconnaissance',

    description:
      'Discovers URLs exposed through standard XML sitemap resources.',

    async run(context) {
      const targetUrl =
        getTargetUrl(
          context,
        );

      const baseUrl =
        new URL(
          targetUrl,
        );

      const discovered = [];
      const evidence = [];

      for (
        const pathname of
          SITEMAP_PATHS
      ) {
        if (
          context?.signal
            ?.aborted
        ) {
          break;
        }

        const sitemapUrl =
          new URL(
            pathname,
            baseUrl.origin,
          ).toString();

        await assertSafeUrl(
          sitemapUrl,
        );

        const requestHeaders =
          context?.session
            ?.getHeaders?.() ?? {};

        try {
          const response =
            await get(
              sitemapUrl,
              {
                signal:
                  context?.signal,

                headers:
                  requestHeaders,
              },
            );

          if (
            context?.signal
              ?.aborted
          ) {
            break;
          }

          const locations =
            extractLocations(
              response.data,
            );

          discovered.push({
            url:
              sitemapUrl,

            status:
              response.status,

            locations,
          });

          evidence.push(
            createExchangeEvidence({
              request: {
                method:
                  'GET',

                url:
                  sitemapUrl,

                headers:
                  requestHeaders,
              },

              response: {
                status:
                  response.status,

                statusText:
                  response.statusText,

                headers:
                  response.headers,

                body:
                  response.data,

                contentType:
                  response
                    .headers
                    ?.['content-type'],
              },
            }),
          );
        } catch {
          if (
            context?.signal
              ?.aborted
          ) {
            break;
          }

          discovered.push({
            url:
              sitemapUrl,

            status:
              null,

            locations: [],
          });
        }
      }

      const discoveredUrls = [
        ...new Set(
          discovered.flatMap(
            (sitemap) =>
              sitemap.locations,
          ),
        ),
      ].slice(
        0,
        MAX_SITEMAP_URLS,
      );

      return {
        data: {
          sitemaps:
            discovered,

          discoveredUrls,
        },

        evidence,

        fingerprints: [],

        verificationRecords: [],

        metadata: {
          maximumUrls:
            MAX_SITEMAP_URLS,

          sitemapCandidates:
            SITEMAP_PATHS.length,

          sitemapResourcesChecked:
            discovered.length,

          discoveredUrlCount:
            discoveredUrls.length,
        },
      };
    },
  });

export default scanner;