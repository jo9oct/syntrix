import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";

import {
  assertAiTierAccess,
  getScanAiAnalyses,
  getFindingAiAnalysis,
  analyzeFindingOnDemand,
  analyzeScanOnDemand,
  persistFindingAnalysis,
} from "../../src/services/aiAnalysis.service.js";

import {
  scanIdParamSchema,
  findingIdParamSchema,
} from "../../src/validators/aiAnalysis.validator.js";

test("aiAnalysis validator - accepts valid 24-char hex ObjectIds", () => {
  const validScanId = new mongoose.Types.ObjectId().toString();
  const validFindingId = new mongoose.Types.ObjectId().toString();

  const scanResult = scanIdParamSchema.validate({ scanId: validScanId });
  assert.equal(scanResult.error, undefined);
  assert.equal(scanResult.value.scanId, validScanId);

  const findingResult = findingIdParamSchema.validate({ findingId: validFindingId });
  assert.equal(findingResult.error, undefined);
  assert.equal(findingResult.value.findingId, validFindingId);
});

test("aiAnalysis validator - rejects invalid or malformed ObjectIds", () => {
  const invalidScanResult = scanIdParamSchema.validate({ scanId: "invalid-id-123" });
  assert.notEqual(invalidScanResult.error, undefined);

  const invalidFindingResult = findingIdParamSchema.validate({ findingId: "short" });
  assert.notEqual(invalidFindingResult.error, undefined);
});

test("aiAnalysis service - enforces ownerId and scanId validation", async () => {
  await assert.rejects(
    async () => {
      await getScanAiAnalyses({ ownerId: null, scanId: new mongoose.Types.ObjectId().toString() });
    },
    { code: "OWNER_ID_REQUIRED" },
  );

  await assert.rejects(
    async () => {
      await getScanAiAnalyses({ ownerId: new mongoose.Types.ObjectId().toString(), scanId: null });
    },
    { code: "SCAN_ID_REQUIRED" },
  );

  await assert.rejects(
    async () => {
      await getScanAiAnalyses({ ownerId: "invalid-id", scanId: new mongoose.Types.ObjectId().toString() });
    },
    { code: "INVALID_OWNER_ID" },
  );
});

test("aiAnalysis service - enforces findingId validation", async () => {
  const ownerId = new mongoose.Types.ObjectId().toString();

  await assert.rejects(
    async () => {
      await getFindingAiAnalysis({ ownerId, findingId: null });
    },
    { code: "FINDING_ID_REQUIRED" },
  );

  await assert.rejects(
    async () => {
      await getFindingAiAnalysis({ ownerId, findingId: "not-an-objectid" });
    },
    { code: "INVALID_FINDING_ID" },
  );
});

test("aiAnalysis service - persistFindingAnalysis skips invalid statuses cleanly", async () => {
  const ownerId = new mongoose.Types.ObjectId();
  const scanId = new mongoose.Types.ObjectId();

  const res = await persistFindingAnalysis({
    ownerId,
    scanId,
    analysis: {
      findingId: null,
      status: "completed",
    },
  });
  assert.equal(res, null);

  const pendingRes = await persistFindingAnalysis({
    ownerId,
    scanId,
    analysis: {
      findingId: new mongoose.Types.ObjectId(),
      status: "pending",
    },
  });
  assert.equal(pendingRes, null);
});

test("aiAnalysis service - enforces subscription tier restriction (Pro & Enterprise only)", async () => {
  const ownerId = new mongoose.Types.ObjectId().toString();
  const scanId = new mongoose.Types.ObjectId().toString();
  const findingId = new mongoose.Types.ObjectId().toString();

  // 1. Guest user is rejected with AI_TIER_RESTRICTED
  await assert.rejects(
    async () => {
      await analyzeFindingOnDemand({
        ownerId,
        findingId,
        isGuest: true,
      });
    },
    { code: "AI_TIER_RESTRICTED", statusCode: 403 },
  );

  await assert.rejects(
    async () => {
      await analyzeScanOnDemand({
        ownerId,
        scanId,
        isGuest: true,
      });
    },
    { code: "AI_TIER_RESTRICTED", statusCode: 403 },
  );

  // 2. Free tier registered user is rejected with AI_TIER_RESTRICTED
  await assert.rejects(
    async () => {
      await analyzeFindingOnDemand({
        ownerId,
        findingId,
        isGuest: false,
        reqUser: { role: "client_owner", subscriptionTier: "free", subscriptionStatus: "active" },
      });
    },
    { code: "AI_TIER_RESTRICTED", statusCode: 403 },
  );

  // 3. Pro tier user passes tier check and resolves to 'pro'
  const proTier = await assertAiTierAccess({
    ownerId,
    isGuest: false,
    reqUser: { role: "client_owner", subscriptionTier: "pro", subscriptionStatus: "active" },
  });
  assert.equal(proTier, "pro");

  // 4. Specialist / Admin role passes tier check and resolves to 'enterprise'
  const specialistTier = await assertAiTierAccess({
    ownerId,
    isGuest: false,
    reqUser: { role: "security_engineer" },
  });
  assert.equal(specialistTier, "enterprise");

  const adminTier = await assertAiTierAccess({
    ownerId,
    isGuest: false,
    reqUser: { role: "admin" },
  });
  assert.equal(adminTier, "enterprise");
});

