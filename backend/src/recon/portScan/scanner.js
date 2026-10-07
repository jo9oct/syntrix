// STATUS: UPDATED

import {
  executeRequest,
} from '../../core/httpClient.js';

import {
  createServiceFingerprint,
} from '../shared/fingerprint.js';

const DEFAULT_PORTS = Object.freeze([
  21,
  22,
  23,
  25,
  53,
  80,
  110,
  143,
  443,
  445,
  587,
  993,
  995,
  1433,
  1521,
  3306,
  3389,
  5432,
  5900,
  6379,
  8080,
  8443,
]);

const normalizePorts = (
  ports,
) => {
  const source =
    Array.isArray(ports) &&
    ports.length > 0
      ? ports
      : DEFAULT_PORTS;

  return [
    ...new Set(
      source
        .map((port) =>
          Number(port),
        )
        .filter(
          (port) =>
            Number.isInteger(
              port,
            ) &&
            port >= 1 &&
            port <= 65535,
        ),
    ),
  ];
};

const getPortUrl = (
  protocol,
  hostname,
  port,
) => {
  const defaultPort =
    protocol === 'https'
      ? 443
      : 80;

  const portSuffix =
    port === defaultPort
      ? ''
      : `:${port}`;

  return `${protocol}://${hostname}${portSuffix}/`;
};

const probePort = async ({
  hostname,
  port,
  timeout,
  scope,
  signal,
}) => {
  const protocols =
    port === 443 ||
    port === 8443
      ? ['https']
      : ['http', 'https'];

  const attempts = [];

  for (
    const protocol of protocols
  ) {
    if (signal?.aborted) {
      break;
    }

    const url =
      getPortUrl(
        protocol,
        hostname,
        port,
      );

    try {
      const response =
        await executeRequest({
          url,
          method: 'HEAD',
          timeout,
          scope,
          maxRedirects: 0,
          responseType: 'text',
        });

      attempts.push({
        protocol,

        status:
          response.statusCode,

        headers:
          response.headers,

        url:
          response.url,
      });

      return {
        port,

        state:
          'open',

        protocol,

        statusCode:
          response.statusCode,

        url:
          response.url,

        headers:
          response.headers,
      };
    } catch (error) {
      attempts.push({
        protocol,

        error: {
          name:
            error?.name,

          message:
            error?.message,

          code:
            error?.code,
        },
      });
    }
  }

  return {
    port,

    state:
      'closed_or_unreachable',

    attempts,
  };
};

const scan = async (
  context,
) => {
  if (!context?.target?.url) {
    throw new Error(
      'Port scan requires a target URL.',
    );
  }

  const targetUrl =
    new URL(
      context.target.url,
    );

  const hostname =
    targetUrl.hostname;

  const configuredPorts =
    context.options
      ?.portScan
      ?.ports ??
    context.options
      ?.ports;

  const ports =
    normalizePorts(
      configuredPorts,
    );

  const timeout =
    Number(
      context.options
        ?.portScan
        ?.timeoutMs ??
        3000,
    );

  const results = [];

  for (
    const port of ports
  ) {
    if (
      context.signal?.aborted
    ) {
      break;
    }

    const result =
      await probePort({
        hostname,
        port,
        timeout,
        scope:
          context.scope,
        signal:
          context.signal,
      });

    results.push(result);
  }

  const openPorts =
    results.filter(
      (result) =>
        result.state ===
        'open',
    );

  const fingerprints =
    openPorts.map(
      (result) =>
        createServiceFingerprint({
          service:
            result.protocol,

          port:
            result.port,

          protocol:
            result.protocol,

          version:
            null,

          confidence:
            'high',

          source:
            'portScan',

          evidence: {
            url:
              result.url,

            statusCode:
              result.statusCode,
          },
        }),
    );

  const findings =
    openPorts.map(
      (result) => ({
        title:
          `Open port detected: ${result.port}`,

        severity:
          'info',

        confidence:
          'high',

        status:
          'detected',

        description:
          `The target responded on port ${result.port} over ${result.protocol}.`,

        evidence: {
          port:
            result.port,

          protocol:
            result.protocol,

          statusCode:
            result.statusCode,

          url:
            result.url,
        },
      }),
    );

  return {
    scannerId:
      'portScan',

    status:
      context.signal?.aborted
        ? 'cancelled'
        : 'completed',

    data: {
      hostname,

      portsScanned:
        ports.length,

      openPorts:
        openPorts.map(
          (result) => ({
            port:
              result.port,

            protocol:
              result.protocol,

            statusCode:
              result.statusCode,
          }),
        ),

      results,
    },

    findings,

    evidence:
      openPorts.map(
        (result) => ({
          type:
            'port-scan',

          port:
            result.port,

          protocol:
            result.protocol,

          url:
            result.url,

          statusCode:
            result.statusCode,
        }),
      ),

    fingerprints,

    verificationRecords:
      [],

    metadata: {
      hostname,

      ports,

      timeout,
    },
  };
};

const run =
  scan;

const scanner = {
  id:
    'portScan',

  name:
    'Port Scan',

  description:
    'Discovers accessible network ports on the authorized target host.',

  run,
};

export {
  scan,
  run,
  scanner,
  createServiceFingerprint,
  DEFAULT_PORTS,
  normalizePorts,
};