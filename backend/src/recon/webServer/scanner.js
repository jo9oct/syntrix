import {
  get,
} from '../../request/request.js';

import {
  createExchangeEvidence,
} from '../shared/evidence.js';

import {
  createServiceFingerprint,
} from '../shared/fingerprint.js';

import {
  createReconScanner,
  getTargetUrl,
} from '../shared/reconContract.js';

import {
  assertSafeUrl,
} from '../shared/resolver.js';

const scanner =
  createReconScanner({
    id:
      'recon.web-server',

    name:
      'Web Server Detection',

    description:
      'Identifies publicly exposed web-server information from HTTP headers.',

    async run(context) {
      const targetUrl =
        getTargetUrl(
          context,
        );

      await assertSafeUrl(
        targetUrl,
      );

      if (
        context?.signal?.aborted
      ) {
        return {
          data: {
            server: null,
            poweredBy: null,
            protocol: null,
            status: null,
          },

          evidence: [],

          fingerprints: [],

          verificationRecords: [],

          metadata: {
            cancelled: true,
          },
        };
      }

      const requestHeaders =
        context?.session
          ?.getHeaders?.() ?? {};

      const response =
        await get(
          targetUrl,
          {
            signal:
              context?.signal,

            headers:
              requestHeaders,
          },
        );

      if (
        context?.signal?.aborted
      ) {
        return {
          data: {
            server: null,
            poweredBy: null,
            protocol: null,
            status: null,
          },

          evidence: [],

          fingerprints: [],

          verificationRecords: [],

          metadata: {
            cancelled: true,
          },
        };
      }

      const server =
        response.headers?.server ??
        response.headers?.Server ??
        null;

      const poweredBy =
        response.headers?.[
          'x-powered-by'
        ] ??
        response.headers?.[
          'X-Powered-By'
        ] ??
        null;

      const url =
        new URL(
          targetUrl,
        );

      const protocol =
        url.protocol.replace(
          ':',
          '',
        );

      const port =
        url.port ||
        (
          protocol === 'https'
            ? 443
            : 80
        );

      const fingerprints = [];

      if (server) {
        fingerprints.push(
          createServiceFingerprint({
            service:
              server,

            port,

            protocol,

            version: null,

            confidence:
              'high',

            source:
              'webServer',

            evidence: {
              header:
                'server',

              value:
                server,
            },
          }),
        );
      }

      if (poweredBy) {
        fingerprints.push(
          createServiceFingerprint({
            service:
              poweredBy,

            port,

            protocol,

            version: null,

            confidence:
              'medium',

            source:
              'webServer',

            evidence: {
              header:
                'x-powered-by',

              value:
                poweredBy,
            },
          }),
        );
      }

      const evidence =
        createExchangeEvidence({
          request: {
            method:
              'GET',

            url:
              targetUrl,

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

            contentType:
              response
                .headers
                ?.['content-type'],
          },
        });

      return {
        data: {
          server,
          poweredBy,
          protocol,
          status:
            response.status,
        },

        evidence: [
          evidence,
        ],

        fingerprints,

        verificationRecords: [],

        metadata: {
          serverDetected:
            Boolean(server),

          poweredByDetected:
            Boolean(poweredBy),

          port,
        },
      };
    },
  });

export default scanner;