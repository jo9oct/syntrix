// STATUS: UPDATED

import mongoose from "mongoose";

import * as scanRepository from "../database/repositories/scan.repository.js";

import * as targetRepository from "../database/repositories/target.repository.js";

import * as findingRepository from "../database/repositories/finding.repository.js";

import * as evidenceRepository from "../database/repositories/evidence.repository.js";

import * as fingerprintRepository from "../database/repositories/fingerprint.repository.js";

import * as verificationRepository from "../database/repositories/verification.repository.js";

import * as aiAnalysisRepository from "../database/repositories/aiAnalysis.repository.js";

import * as reportRepository from "../database/repositories/report.repository.js";

import * as guestSessionRepository from "../database/repositories/guestSession.repository.js";

const assertGuestOwnerId = (guestOwnerId) => {
  if (!mongoose.isValidObjectId(guestOwnerId)) {
    const error = new Error("Guest owner ID must be a valid ObjectId.");

    error.statusCode = 400;

    error.code = "INVALID_GUEST_OWNER_ID";

    throw error;
  }

  return new mongoose.Types.ObjectId(guestOwnerId);
};

const cleanupGuestData = async ({ guestOwnerId }) => {
  const normalizedGuestOwnerId = assertGuestOwnerId(guestOwnerId);

  /*
   * Invalidate the guest session first.
   *
   * The scan worker checks GuestSession
   * before persisting guest data. Once
   * this record is removed, an active
   * guest scan will stop instead of
   * recreating guest data after cleanup.
   */
  const guestSession = await guestSessionRepository.deleteByGuestOwnerId(
    normalizedGuestOwnerId,
  );

  /*
   * Delete all data owned by this
   * temporary guest owner.
   *
   * These operations are intentionally
   * scoped by ownerId so another guest
   * or authenticated user cannot be
   * affected.
   */
  const [
    scans,
    targets,
    findings,
    evidence,
    fingerprints,
    verifications,
    aiAnalyses,
    reports,
  ] = await Promise.all([
    scanRepository.deleteByOwnerId(normalizedGuestOwnerId),

    targetRepository.deleteByOwnerId(normalizedGuestOwnerId),

    findingRepository.deleteByOwnerId(normalizedGuestOwnerId),

    evidenceRepository.deleteByOwnerId(normalizedGuestOwnerId),

    fingerprintRepository.deleteByOwnerId(normalizedGuestOwnerId),

    verificationRepository.deleteByOwnerId(normalizedGuestOwnerId),

    aiAnalysisRepository.deleteByOwnerId(normalizedGuestOwnerId),

    reportRepository.deleteByOwnerId(normalizedGuestOwnerId),
  ]);

  return {
    guestOwnerId: normalizedGuestOwnerId.toString(),

    deleted: {
      scans: scans.deletedCount,

      targets: targets.deletedCount,

      findings: findings.deletedCount,

      evidence: evidence.deletedCount,

      fingerprints: fingerprints.deletedCount,

      verifications: verifications.deletedCount,

      aiAnalyses: aiAnalyses.deletedCount,

      reports: reports.deletedCount,

      guestSession: guestSession.deletedCount,
    },
  };
};

export { cleanupGuestData };
