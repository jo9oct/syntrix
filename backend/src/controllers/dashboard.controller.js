// STATUS: UPDATED
// FILE: backend/src/controllers/dashboard.controller.js

import { User } from "../models/User.js";
import Target from "../database/models/target.model.js";
import Scan from "../database/models/scan.model.js";
import Finding from "../database/models/finding.model.js";
import {
  getReconScanners,
  getSecurityScanners,
} from "../engine/scannerRegistry.js";

/**
 * Get comprehensive telemetry and statistics for the authenticated user's dashboard:
 * - Profile and subscription tier details & quotas
 * - Targets inventory count and monitored assets for the specific user ID
 * - Total scans, status breakdown (running, completed, failed), latest scan for the user
 * - Findings breakdown by severity (critical, high, medium, low, info) and resolution status
 * - Security posture risk score
 * - Available scanner engines (25 modules: 10 recon, 15 security)
 */
export const getUserDashboardStats = async (req, res) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({
        success: false,
        error: "Authenticated user session required",
      });
    }

    const userId = user._id;
    const isAdmin = user.role === "admin";

    // Define owner query strictly for this user (or all platform targets if admin)
    const ownerFilter = isAdmin
      ? {}
      : {
          $or: [
            { ownerId: userId },
            ...(user.organizationId ? [{ ownerId: user.organizationId }] : []),
          ],
        };

    // 1. Fetch Targets owned by this specific user
    const userTargets = await Target.find(ownerFilter)
      .sort({ updatedAt: -1, createdAt: -1 })
      .lean()
      .catch(() => []);

    const totalTargets = userTargets.length;
    const activeTargets = userTargets.filter((t) => t.isActive).length;
    const targetIds = userTargets.map((t) => t._id);

    // 2. Fetch Scans strictly for this user (or all platform scans if admin)
    const scanFilter = isAdmin
      ? {}
      : {
          $or: [
            { ownerId: userId },
            ...(targetIds.length > 0 ? [{ targetId: { $in: targetIds } }] : []),
            ...(user.organizationId ? [{ ownerId: user.organizationId }] : []),
          ],
        };

    const userScans = await Scan.find(scanFilter)
      .sort({ createdAt: -1 })
      .lean()
      .catch(() => []);

    const totalScans = userScans.length;
    const runningScans = userScans.filter(
      (s) =>
        s.status === "running" ||
        s.status === "pending" ||
        s.status === "crawling" ||
        s.status === "scanning",
    ).length;
    const completedScans = userScans.filter((s) => s.status === "completed").length;
    const failedScans = userScans.filter(
      (s) => s.status === "failed" || s.status === "canceled",
    ).length;

    const latestCompletedScan =
      userScans.find((s) => s.status === "completed") || userScans[0] || null;

    // 3. Fetch Findings for this user (or all platform findings if admin)
    const scanIds = userScans.map((s) => s._id);
    const findingFilter = isAdmin
      ? {}
      : {
          $or: [
            { ownerId: userId },
            ...(scanIds.length > 0 ? [{ scanId: { $in: scanIds } }] : []),
            ...(targetIds.length > 0 ? [{ targetId: { $in: targetIds } }] : []),
          ],
        };

    const userFindings = await Finding.find(findingFilter)
      .sort({ createdAt: -1 })
      .lean()
      .catch(() => []);

    const totalFindings = userFindings.length;
    const criticalFindings = userFindings.filter((f) => f.severity === "critical").length;
    const highFindings = userFindings.filter((f) => f.severity === "high").length;
    const mediumFindings = userFindings.filter((f) => f.severity === "medium").length;
    const lowFindings = userFindings.filter((f) => f.severity === "low").length;
    const infoFindings = userFindings.filter((f) => f.severity === "info").length;

    const resolvedFindings = userFindings.filter(
      (f) => f.status === "resolved" || f.status === "accepted",
    ).length;
    const detectedFindings = userFindings.filter(
      (f) => f.status === "detected" || f.status === "verified",
    ).length;

    // 4. Posture / Risk Score calculation for this user
    let riskScore = 0;
    if (
      latestCompletedScan?.riskScore !== undefined &&
      latestCompletedScan?.riskScore !== null
    ) {
      riskScore = latestCompletedScan.riskScore;
    } else if (totalFindings > 0) {
      const weighted =
        criticalFindings * 25 +
        highFindings * 15 +
        mediumFindings * 5 +
        lowFindings * 1;
      riskScore = Math.min(
        100,
        Math.max(10, Math.round(weighted / Math.max(1, totalTargets))),
      );
    }

    let postureLevel = "Optimal Security Posture";
    if (riskScore > 65) postureLevel = "Critical Vulnerability Exposure";
    else if (riskScore > 35) postureLevel = "Elevated Risk Detected";
    else if (riskScore > 0) postureLevel = "Controlled Exposure Level";

    // 5. Available Scanners (from registry)
    let reconScannersCount = 10;
    let securityScannersCount = 15;
    try {
      reconScannersCount = getReconScanners()?.length || 10;
      securityScannersCount = getSecurityScanners()?.length || 15;
    } catch {
      // safe fallback
    }
    const totalScannersCount = reconScannersCount + securityScannersCount;

    // 6. Subscription limits & capabilities
    const tier = isAdmin ? "admin" : (user.subscriptionTier || "free");
    const isFree = !isAdmin && tier === "free";
    const isEnterprise = !isAdmin && tier === "enterprise";

    const quotaAndLimits = {
      tier,
      status: isAdmin ? "active" : (user.subscriptionStatus || "active"),
      expiresAt: isAdmin ? null : (user.subscriptionExpiresAt || null),
      maxTargets: isFree ? 1 : "unlimited",
      allowedScannerEngines: isFree ? 1 : totalScannersCount,
      canRunParallelScans: !isFree,
      canRetest: !isFree,
      canGeneratePdfReports: !isFree,
      canUseMalwareSandbox: isAdmin || isEnterprise,
    };

    // 7. Sanitized recent targets
    const recentTargets = userTargets.slice(0, 5).map((t) => ({
      id: String(t._id),
      _id: String(t._id),
      url: t.url,
      hostname: t.hostname,
      isActive: Boolean(t.isActive),
      scanCount: t.scanCount || 0,
      scanVersionCounter: t.scanVersionCounter || 0,
      lastScannedAt: t.lastScannedAt || null,
      createdAt: t.createdAt,
    }));

    // 8. Sanitized recent scans
    const recentScans = userScans.slice(0, 5).map((s) => ({
      id: String(s._id),
      _id: String(s._id),
      targetUrl: s.targetUrl,
      targetHostname:
        s.targetHostname ||
        (s.targetUrl ? new URL(s.targetUrl).hostname : "target"),
      status: s.status,
      riskScore: s.riskScore ?? 0,
      scanVersion: s.scanVersion || 1,
      createdAt: s.createdAt,
      completedAt: s.completedAt || null,
    }));

    // 9. Sanitized recent findings
    const recentFindings = userFindings.slice(0, 5).map((f) => ({
      id: String(f._id),
      _id: String(f._id),
      title: f.title,
      category: f.category,
      severity: f.severity,
      confidence: f.confidence,
      status: f.status,
      createdAt: f.createdAt,
    }));

    const responseData = {
      user: {
        id: String(user._id),
        name: user.name,
        email: user.email,
        role: user.role,
        subscriptionTier: tier,
        subscriptionStatus: user.subscriptionStatus || "active",
        subscriptionExpiresAt: user.subscriptionExpiresAt || null,
        organization: user.organizationId?.name || "Sentrix Security Workspace",
      },
      overview: {
        riskScore,
        postureLevel,
        totalTargets,
        activeTargets,
        totalScans,
        runningScans,
        completedScans,
        failedScans,
        totalFindings,
        criticalFindings,
        highFindings,
        mediumFindings,
        lowFindings,
        infoFindings,
        resolvedFindings,
        detectedFindings,
        totalScanners: totalScannersCount,
      },
      targets: {
        total: totalTargets,
        active: activeTargets,
        limit: quotaAndLimits.maxTargets,
        items: recentTargets,
      },
      scans: {
        total: totalScans,
        running: runningScans,
        completed: completedScans,
        failed: failedScans,
        latestCompleted: latestCompletedScan
          ? {
              id: String(latestCompletedScan._id),
              targetUrl: latestCompletedScan.targetUrl,
              riskScore: latestCompletedScan.riskScore ?? riskScore,
              status: latestCompletedScan.status,
              createdAt: latestCompletedScan.createdAt,
            }
          : null,
        items: recentScans,
      },
      findings: {
        total: totalFindings,
        bySeverity: {
          critical: criticalFindings,
          high: highFindings,
          medium: mediumFindings,
          low: lowFindings,
          info: infoFindings,
        },
        byStatus: {
          detected: detectedFindings,
          resolved: resolvedFindings,
        },
        items: recentFindings,
      },
      scanners: {
        total: totalScannersCount,
        recon: reconScannersCount,
        security: securityScannersCount,
        tierAllowed: quotaAndLimits.allowedScannerEngines,
      },
      quotaAndLimits,
      system: {
        status: "operational",
        engine: "Sentrix Autonomous Security Assessment Engine",
        timestamp: new Date().toISOString(),
      },
    };

    return res.status(200).json({
      success: true,
      data: responseData,
    });
  } catch (err) {
    console.error("[Dashboard] Failed to generate user dashboard statistics:", err);
    return res.status(500).json({
      success: false,
      error: "Failed to generate user dashboard statistics",
    });
  }
};
