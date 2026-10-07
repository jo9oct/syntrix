// STATUS: UPDATED

const VALID_SEVERITIES =
  new Set([
    'critical',
    'high',
    'medium',
    'low',
    'info',
  ]);

const VALID_CONFIDENCES =
  new Set([
    'low',
    'medium',
    'high',
  ]);

const VALID_STATUSES =
  new Set([
    'detected',
    'verified',
    'false_positive',
    'accepted',
    'resolved',
  ]);

const VALID_VERIFICATION_STATUSES =
  new Set([
    'pending',
    'verified',
    'rejected',
    'inconclusive',
  ]);

const normalizeString = (
  value,
  maxLength,
) => {
  if (
    value === undefined ||
    value === null
  ) {
    return undefined;
  }

  if (
    typeof value !== 'string'
  ) {
    return String(value)
      .slice(0, maxLength);
  }

  return value.slice(
    0,
    maxLength,
  );
};

const normalizeLocation = (
  location,
) => {
  if (
    !location ||
    typeof location !== 'object'
  ) {
    return undefined;
  }

  return {
    url:
      normalizeString(
        location.url,
        2048,
      ),

    path:
      normalizeString(
        location.path,
        2048,
      ),

    parameter:
      normalizeString(
        location.parameter,
        512,
      ),

    method:
      typeof location.method ===
        'string'
        ? location.method
            .toUpperCase()
            .slice(0, 16)
        : undefined,

    requestId:
      normalizeString(
        location.requestId,
        256,
      ),

    component:
      normalizeString(
        location.component,
        512,
      ),
  };
};

const normalizeReferences = (
  references,
) => {
  if (
    !Array.isArray(references)
  ) {
    return [];
  }

  return references
    .filter(
      (reference) =>
        reference &&
        typeof reference ===
          'object',
    )
    .map((reference) => ({
      type:
        normalizeString(
          reference.type,
          64,
        ),

      value:
        normalizeString(
          reference.value,
          512,
        ),

      url:
        normalizeString(
          reference.url,
          2048,
        ),
    }))
    .filter(
      (reference) =>
        reference.type ||
        reference.value ||
        reference.url,
    );
};

const normalizeTags = (
  tags,
) => {
  if (!Array.isArray(tags)) {
    return [];
  }

  return [
    ...new Set(
      tags
        .filter(
          (tag) =>
            typeof tag ===
              'string' &&
            tag.trim().length > 0,
        )
        .map((tag) =>
          tag
            .trim()
            .slice(0, 128),
        ),
    ),
  ];
};

const normalizeFinding = ({
  scannerId,
  category = 'security',
  title,
  description,
  impact,
  severity = 'info',
  confidence = 'low',
  status = 'detected',
  verificationStatus = 'pending',
  remediation,
  location,
  evidenceIds = [],
  verificationId = null,
  references = [],
  tags = [],
  fingerprint,
  metadata = {},
}) => {
  if (!scannerId) {
    throw new Error(
      'Finding requires a scanner identifier.',
    );
  }

  if (!title) {
    throw new Error(
      `Finding from ${scannerId} requires a title.`,
    );
  }

  const normalizedSeverity =
    VALID_SEVERITIES.has(
      severity,
    )
      ? severity
      : 'info';

  const normalizedConfidence =
    VALID_CONFIDENCES.has(
      confidence,
    )
      ? confidence
      : 'low';

  const normalizedStatus =
    VALID_STATUSES.has(status)
      ? status
      : 'detected';

  const normalizedVerificationStatus =
    VALID_VERIFICATION_STATUSES.has(
      verificationStatus,
    )
      ? verificationStatus
      : 'pending';

  return {
    scannerId,

    category:
      normalizeString(
        category,
        128,
      ) ?? 'security',

    title:
      normalizeString(
        title,
        500,
      ),

    description:
      normalizeString(
        description ?? '',
        10_000,
      ),

    impact:
      normalizeString(
        impact,
        10_000,
      ),

    severity:
      normalizedSeverity,

    confidence:
      normalizedConfidence,

    status:
      normalizedStatus,

    verificationStatus:
      normalizedVerificationStatus,

    location:
      normalizeLocation(
        location,
      ),

    remediation:
      normalizeString(
        remediation,
        10_000,
      ),

    evidenceIds:
      Array.isArray(evidenceIds)
        ? [...evidenceIds]
        : [],

    verificationId:
      verificationId ?? null,

    references:
      normalizeReferences(
        references,
      ),

    tags:
      normalizeTags(tags),

    fingerprint:
      normalizeString(
        fingerprint,
        256,
      ),

    metadata:
      metadata &&
      typeof metadata ===
        'object' &&
      !Array.isArray(metadata)
        ? metadata
        : {},
  };
};

const normalizeScannerFindings = (
  scannerId,
  findings,
) => {
  if (!Array.isArray(findings)) {
    return [];
  }

  if (
    typeof scannerId !==
      'string' ||
    scannerId.trim().length === 0
  ) {
    throw new Error(
      'Scanner findings require a valid scanner identifier.',
    );
  }

  return findings.map(
    (finding) =>
      normalizeFinding({
        ...finding,

        // The scanner executing the
        // finding is authoritative.
        // This keeps finding and
        // evidence identifiers
        // consistent.
        scannerId,
      }),
  );
};

const calculateFindingCounts = (
  findings,
) => {
  const counts = {
    total: 0,
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    info: 0,
  };

  for (const finding of findings) {
    counts.total += 1;

    if (
      VALID_SEVERITIES.has(
        finding.severity,
      )
    ) {
      counts[finding.severity] += 1;
    }
  }

  return counts;
};

export {
  calculateFindingCounts,
  normalizeFinding,
  normalizeScannerFindings,
};