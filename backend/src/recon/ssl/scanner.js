import tls from 'node:tls';

import {
  createFingerprint,
} from '../shared/fingerprint.js';

import {
  createReconScanner,
  getTargetUrl,
} from '../shared/reconContract.js';

import {
  assertSafeUrl,
} from '../shared/resolver.js';

const getCertificate = (
  socket,
) => {
  const certificate =
    socket.getPeerCertificate();

  if (
    !certificate ||
    Object.keys(certificate).length === 0
  ) {
    return null;
  }

  return {
    subject:
      certificate.subject ??
      null,

    issuer:
      certificate.issuer ??
      null,

    subjectAlternativeName:
      certificate.subjectaltname ??
      null,

    validFrom:
      certificate.valid_from ??
      null,

    validTo:
      certificate.valid_to ??
      null,

    serialNumber:
      certificate.serialNumber ??
      null,

    fingerprint:
      certificate.fingerprint256 ??
      certificate.fingerprint ??
      null,
  };
};

const createAbortError = () =>
  Object.assign(
    new Error(
      'TLS reconnaissance was aborted.',
    ),
    {
      code: 'ABORT_ERR',
    },
  );

const createTimeoutError = () =>
  Object.assign(
    new Error(
      'TLS connection timed out.',
    ),
    {
      code: 'ETIMEDOUT',
    },
  );

const connectTls = ({
  address,
  port,
  hostname,
  timeoutMs,
  signal,
}) =>
  new Promise(
    (resolve, reject) => {
      let settled = false;

      const socket =
        tls.connect({
          host: address,
          port,
          servername:
            hostname,
          rejectUnauthorized:
            false,
        });

      const cleanup =
        () => {
          socket.removeAllListeners(
            'secureConnect',
          );

          socket.removeAllListeners(
            'error',
          );

          socket.removeAllListeners(
            'timeout',
          );

          if (signal) {
            signal.removeEventListener(
              'abort',
              onAbort,
            );
          }
        };

      const finish =
        (callback) => {
          if (settled) {
            return;
          }

          settled = true;
          cleanup();
          socket.destroy();

          callback();
        };

      const onAbort =
        () => {
          finish(() =>
            reject(
              createAbortError(),
            ),
          );
        };

      socket.setTimeout(
        timeoutMs,
      );

      socket.once(
        'secureConnect',
        () => {
          const certificate =
            getCertificate(
              socket,
            );

          const result = {
            protocol:
              socket.getProtocol(),

            cipher:
              socket.getCipher()
                ?.name ?? null,

            authorized:
              socket.authorized,

            authorizationError:
              socket.authorizationError ??
              null,

            certificate,
          };

          finish(() =>
            resolve(result),
          );
        },
      );

      socket.once(
        'timeout',
        () => {
          finish(() =>
            reject(
              createTimeoutError(),
            ),
          );
        },
      );

      socket.once(
        'error',
        (error) => {
          finish(() =>
            reject(error),
          );
        },
      );

      if (signal) {
        if (signal.aborted) {
          onAbort();
          return;
        }

        signal.addEventListener(
          'abort',
          onAbort,
          {
            once: true,
          },
        );
      }
    },
  );

const scanner =
  createReconScanner({
    id:
      'recon.ssl',

    name:
      'SSL/TLS Reconnaissance',

    description:
      'Collects TLS protocol, cipher, and certificate metadata from HTTPS targets.',

    async run(context) {
      const targetUrl =
        getTargetUrl(
          context,
        );

      const parsedUrl =
        new URL(
          targetUrl,
        );

      if (
        parsedUrl.protocol !==
        'https:'
      ) {
        return {
          data: {
            supported: false,

            reason:
              'Target URL is not HTTPS.',
          },

          evidence: [],

          fingerprints: [],

          verificationRecords: [],

          metadata: {
            supported: false,
          },
        };
      }

      if (
        context?.signal?.aborted
      ) {
        return {
          data: {
            supported: true,
            cancelled: true,
          },

          evidence: [],

          fingerprints: [],

          verificationRecords: [],

          metadata: {
            cancelled: true,
          },
        };
      }

      const resolution =
        await assertSafeUrl(
          targetUrl,
        );

      const address =
        resolution.addresses[0];

      if (!address) {
        throw new Error(
          'No safe address was available for TLS inspection.',
        );
      }

      const port =
        Number.parseInt(
          parsedUrl.port ||
            '443',
          10,
        );

      if (
        !Number.isInteger(port) ||
        port < 1 ||
        port > 65535
      ) {
        throw new Error(
          'Invalid TLS target port.',
        );
      }

      const timeoutMs =
        Math.min(
          Math.max(
            Number(
              context?.options
                ?.tlsTimeoutMs ??
                5000,
            ),
            500,
          ),
          10000,
        );

      const tlsResult =
        await connectTls({
          address,
          port,
          hostname:
            parsedUrl.hostname,
          timeoutMs,
          signal:
            context?.signal,
        });

      if (
        context?.signal?.aborted
      ) {
        return {
          data: {
            supported: true,
            cancelled: true,
          },

          evidence: [],

          fingerprints: [],

          verificationRecords: [],

          metadata: {
            cancelled: true,
          },
        };
      }

      const certificate =
        tlsResult.certificate;

      const evidence = [
        {
          type:
            'certificate',

          hostname:
            parsedUrl.hostname,

          url:
            targetUrl,

          protocol:
            tlsResult.protocol,

          cipher:
            tlsResult.cipher,

          authorized:
            tlsResult.authorized,

          authorizationError:
            tlsResult.authorizationError,

          certificate,
        },
      ];

      const fingerprints = [];

      if (
        certificate
      ) {
        fingerprints.push(
          createFingerprint({
            type:
              'certificate',

            name:
              parsedUrl.hostname,

            version:
              tlsResult.protocol,

            confidence:
              'high',

            source:
              'ssl',

            evidence: {
              issuer:
                certificate.issuer,

              subject:
                certificate.subject,

              serialNumber:
                certificate.serialNumber,

              fingerprint:
                certificate.fingerprint,

              validFrom:
                certificate.validFrom,

              validTo:
                certificate.validTo,
            },
          }),
        );
      }

      return {
        data: {
          supported: true,

          hostname:
            parsedUrl.hostname,

          port,

          ...tlsResult,
        },

        evidence,

        fingerprints,

        verificationRecords: [],

        metadata: {
          resolvedAddress:
            address,

          timeoutMs,
        },
      };
    },
  });

export default scanner;