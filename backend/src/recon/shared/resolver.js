import dns from 'node:dns/promises';
import net from 'node:net';

import {
  blockedHostnames,
  privateIpv4Ranges,
} from '../../config/security.js';

import {
  SsrfProtectionError,
} from '../../utils/errors.js';

const ipv4ToNumber = (address) => {
  const parts = address
    .split('.')
    .map(Number);

  if (
    parts.length !== 4 ||
    parts.some(
      (part) =>
        !Number.isInteger(part) ||
        part < 0 ||
        part > 255,
    )
  ) {
    return null;
  }

  return (
    parts[0] * 256 ** 3 +
    parts[1] * 256 ** 2 +
    parts[2] * 256 +
    parts[3]
  );
};

const isIpv4InRange = (
  address,
  range,
) => {
  if (
    !range ||
    typeof range.start !== 'string' ||
    typeof range.end !== 'string'
  ) {
    return false;
  }

  const addressNumber =
    ipv4ToNumber(address);

  const startNumber =
    ipv4ToNumber(range.start);

  const endNumber =
    ipv4ToNumber(range.end);

  if (
    addressNumber === null ||
    startNumber === null ||
    endNumber === null
  ) {
    return false;
  }

  return (
    addressNumber >= startNumber &&
    addressNumber <= endNumber
  );
};

const normalizeIpv6 = (
  address,
) => {
  let value =
    address
      .trim()
      .toLowerCase();

  const zoneIndex =
    value.indexOf('%');

  if (zoneIndex !== -1) {
    value = value.slice(
      0,
      zoneIndex,
    );
  }

  if (value.includes('.')) {
    const lastColon =
      value.lastIndexOf(':');

    if (lastColon === -1) {
      return null;
    }

    const ipv4Part =
      value.slice(
        lastColon + 1,
      );

    const ipv4Number =
      ipv4ToNumber(
        ipv4Part,
      );

    if (ipv4Number === null) {
      return null;
    }

    const high =
      Math.floor(
        ipv4Number / 65536,
      ).toString(16);

    const low =
      (ipv4Number % 65536).toString(16);

    value =
      `${value.slice(0, lastColon)}:${high}:${low}`;
  }

  const halves =
    value.split('::');

  if (halves.length > 2) {
    return null;
  }

  const left =
    halves[0]
      ? halves[0].split(':')
      : [];

  const right =
    halves[1]
      ? halves[1].split(':')
      : [];

  if (
    halves.length === 1 &&
    left.length !== 8
  ) {
    return null;
  }

  const missing =
    8 -
    left.length -
    right.length;

  if (missing < 0) {
    return null;
  }

  const groups = [
    ...left,
    ...(halves.length === 2
      ? Array(missing).fill('0')
      : []),
    ...right,
  ];

  if (groups.length !== 8) {
    return null;
  }

  if (
    groups.some(
      (group) =>
        !/^[0-9a-f]{1,4}$/.test(
          group,
        ),
    )
  ) {
    return null;
  }

  return groups
    .map((group) =>
      group.padStart(4, '0'),
    )
    .join('');
};

const ipv6ToBigInt = (
  address,
) => {
  const normalized =
    normalizeIpv6(address);

  if (!normalized) {
    return null;
  }

  return BigInt(
    `0x${normalized}`,
  );
};

const isIpv6InPrefix = (
  address,
  prefix,
  prefixLength,
) => {
  const addressValue =
    ipv6ToBigInt(address);

  const prefixValue =
    ipv6ToBigInt(prefix);

  if (
    addressValue === null ||
    prefixValue === null
  ) {
    return false;
  }

  if (prefixLength === 0) {
    return true;
  }

  const shift =
    128n -
    BigInt(prefixLength);

  const mask =
    ((1n <<
      BigInt(prefixLength)) -
      1n) <<
    shift;

  return (
    (addressValue & mask) ===
    (prefixValue & mask)
  );
};

const isBlockedIpv4 = (
  address,
) =>
  privateIpv4Ranges.some(
    (range) =>
      isIpv4InRange(
        address,
        range,
      ),
  );

const isBlockedIpv6 = (
  address,
) => {
  if (
    isIpv6InPrefix(
      address,
      '::1',
      128,
    )
  ) {
    return true;
  }

  if (
    isIpv6InPrefix(
      address,
      'fc00::',
      7,
    )
  ) {
    return true;
  }

  if (
    isIpv6InPrefix(
      address,
      'fe80::',
      10,
    )
  ) {
    return true;
  }

  if (
    isIpv6InPrefix(
      address,
      'ff00::',
      8,
    )
  ) {
    return true;
  }

  if (
    isIpv6InPrefix(
      address,
      '2001:db8::',
      32,
    )
  ) {
    return true;
  }

  return false;
};

const isIpv4MappedIpv6 = (
  address,
) => {
  const normalized =
    normalizeIpv6(address);

  if (!normalized) {
    return false;
  }

  return normalized.startsWith(
    '00000000000000000000ffff',
  );
};

const getMappedIpv4 = (
  address,
) => {
  const normalized =
    normalizeIpv6(address);

  if (!normalized) {
    return null;
  }

  if (
    !normalized.startsWith(
      '00000000000000000000ffff',
    )
  ) {
    return null;
  }

  const ipv4Hex =
    normalized.slice(-8);

  const octets = [
    Number.parseInt(
      ipv4Hex.slice(0, 2),
      16,
    ),
    Number.parseInt(
      ipv4Hex.slice(2, 4),
      16,
    ),
    Number.parseInt(
      ipv4Hex.slice(4, 6),
      16,
    ),
    Number.parseInt(
      ipv4Hex.slice(6, 8),
      16,
    ),
  ];

  return octets.join('.');
};

const isBlockedAddress = (
  address,
) => {
  const version =
    net.isIP(address);

  if (version === 4) {
    return isBlockedIpv4(
      address,
    );
  }

  if (version === 6) {
    if (
      isBlockedIpv6(address)
    ) {
      return true;
    }

    if (
      isIpv4MappedIpv6(
        address,
      )
    ) {
      const mappedIpv4 =
        getMappedIpv4(
          address,
        );

      if (mappedIpv4) {
        return isBlockedIpv4(
          mappedIpv4,
        );
      }
    }
  }

  return false;
};

const assertSafeAddress = (
  address,
) => {
  if (
    isBlockedAddress(address)
  ) {
    throw new SsrfProtectionError(
      `Resolved address is not permitted for security assessment: ${address}`,
    );
  }

  return address;
};

const assertSafeHostname = (
  hostname,
) => {
  const normalizedHostname =
    hostname
      .trim()
      .toLowerCase();

  if (!normalizedHostname) {
    throw new SsrfProtectionError(
      'Hostname is required.',
    );
  }

  if (
    blockedHostnames.has(
      normalizedHostname,
    )
  ) {
    throw new SsrfProtectionError(
      `Hostname is not permitted for security assessment: ${normalizedHostname}`,
    );
  }

  return normalizedHostname;
};

const resolveHostname = async (
  hostname,
) => {
  const normalizedHostname =
    assertSafeHostname(
      hostname,
    );

  if (
    net.isIP(
      normalizedHostname,
    )
  ) {
    return {
      hostname:
        normalizedHostname,

      addresses: [
        assertSafeAddress(
          normalizedHostname,
        ),
      ],
    };
  }

  const records =
    await dns.lookup(
      normalizedHostname,
      {
        all: true,
        verbatim: true,
      },
    );

  if (
    !Array.isArray(records) ||
    records.length === 0
  ) {
    throw new SsrfProtectionError(
      `Hostname did not resolve to an address: ${normalizedHostname}`,
    );
  }

  const addresses = [
    ...new Set(
      records.map(
        (record) =>
          record.address,
      ),
    ),
  ].map(
    (address) =>
      assertSafeAddress(
        address,
      ),
  );

  if (addresses.length === 0) {
    throw new SsrfProtectionError(
      `Hostname did not resolve to a permitted address: ${normalizedHostname}`,
    );
  }

  return {
    hostname:
      normalizedHostname,
    addresses,
  };
};

const resolveAndValidateHostname =
  async (hostname) =>
    resolveHostname(hostname);

const resolveDnsRecords = async (
  hostname,
) => {
  const normalizedHostname =
    assertSafeHostname(
      hostname,
    );

  const resolveRecord =
    async (resolver) => {
      try {
        return await resolver();
      } catch (error) {
        if (
          error?.code ===
            'ENODATA' ||
          error?.code ===
            'ENOTFOUND' ||
          error?.code ===
            'ENODEV'
        ) {
          return [];
        }

        throw error;
      }
    };

  const [
    a,
    aaaa,
    cname,
    mx,
    ns,
    txt,
  ] = await Promise.all([
    resolveRecord(() =>
      dns.resolve4(
        normalizedHostname,
      ),
    ),

    resolveRecord(() =>
      dns.resolve6(
        normalizedHostname,
      ),
    ),

    resolveRecord(() =>
      dns.resolveCname(
        normalizedHostname,
      ),
    ),

    resolveRecord(() =>
      dns.resolveMx(
        normalizedHostname,
      ),
    ),

    resolveRecord(() =>
      dns.resolveNs(
        normalizedHostname,
      ),
    ),

    resolveRecord(() =>
      dns.resolveTxt(
        normalizedHostname,
      ),
    ),
  ]);

  return {
    hostname:
      normalizedHostname,

    A: a.filter(
      (address) =>
        !isBlockedAddress(
          address,
        ),
    ),

    AAAA: aaaa.filter(
      (address) =>
        !isBlockedAddress(
          address,
        ),
    ),

    CNAME: cname,
    MX: mx,
    NS: ns,
    TXT: txt,
  };
};

const assertSafeUrl = async (
  value,
) => {
  let parsedUrl;

  try {
    parsedUrl = new URL(
      value,
    );
  } catch {
    throw new SsrfProtectionError(
      'Invalid target URL.',
    );
  }

  if (
    ![
      'http:',
      'https:',
    ].includes(
      parsedUrl.protocol,
    )
  ) {
    throw new SsrfProtectionError(
      `Unsupported target protocol: ${parsedUrl.protocol}`,
    );
  }

  const resolved =
    await resolveHostname(
      parsedUrl.hostname,
    );

  return {
    url: parsedUrl,
    hostname:
      resolved.hostname,
    addresses:
      resolved.addresses,
  };
};

export {
  assertSafeAddress,
  assertSafeHostname,
  assertSafeUrl,
  isBlockedAddress,
  resolveAndValidateHostname,
  resolveDnsRecords,
  resolveHostname,
};