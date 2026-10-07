const VERIFICATION_STATUS = Object.freeze({
  PENDING: 'pending',
  VERIFIED: 'verified',
  REJECTED: 'rejected',
  INCONCLUSIVE: 'inconclusive',
});

const createPendingVerification = ({
  finding,
}) => {
  if (!finding) {
    throw new Error(
      'Verification requires a finding.',
    );
  }

  return {
    status: VERIFICATION_STATUS.PENDING,
    findingId: finding._id ?? finding.id ?? null,
    reason: null,
    evidenceIds: Array.isArray(
      finding.evidenceIds,
    )
      ? [...finding.evidenceIds]
      : [],
    verifiedAt: null,
    verifiedBy: null,
  };
};

const applyVerification = (
  finding,
  verification,
) => {
  if (!verification) {
    return {
      ...finding,
      status: 'detected',
    };
  }

  if (
    !Object.values(VERIFICATION_STATUS).includes(
      verification.status,
    )
  ) {
    throw new Error(
      `Invalid verification status: ${verification.status}`,
    );
  }

  let findingStatus = 'detected';

  if (
    verification.status ===
    VERIFICATION_STATUS.VERIFIED
  ) {
    findingStatus = 'verified';
  }

  if (
    verification.status ===
    VERIFICATION_STATUS.REJECTED
  ) {
    findingStatus = 'false_positive';
  }

  return {
    ...finding,
    status: findingStatus,
  };
};

export {
  VERIFICATION_STATUS,
  applyVerification,
  createPendingVerification,
};