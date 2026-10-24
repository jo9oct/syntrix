// STATUS: UPDATED
// FILE: src/controllers/admin.controller.js

import bcrypt from "bcryptjs";
import { User } from "../models/User.js";
import { Organization } from "../models/Organization.js";
import { Project } from "../models/Project.js";
import { Assessment } from "../models/Assessment.js";
import { MalwareCase } from "../models/MalwareCase.js";
import { AuditLog } from "../models/AuditLog.js";
import { Transaction } from "../models/Transaction.js";
import { ServiceOrder } from "../models/ServiceOrder.js";
import { SystemSetting } from "../models/SystemSetting.js";
import Scan from "../database/models/scan.model.js";
import Finding from "../database/models/finding.model.js";
import Target from "../database/models/target.model.js";

const ALLOWED_ROLES = [
  "admin",
  "security_engineer",
  "developer",
  "malware_analyst",
  "client_owner",
  "client_member",
];

export const getUsers = async (req, res) => {
  try {
    const users = await User.find()
      .populate("organizationId", "name")
      .sort({ createdAt: -1 });

    const formatted = users.map((user) => ({
      id: String(user._id),
      name: user.name,
      email: user.email,
      role: user.role,
      subscriptionTier: user.subscriptionTier || "free",
      subscriptionStatus: user.subscriptionStatus || "active",
      org: user.organizationId?.name || "Sentrix Operations",
      status: user.isActive ? "active" : "suspended",
      lastLogin: user.lastLogin
        ? new Date(user.lastLogin).toLocaleDateString()
        : "Never",
      createdAt: user.createdAt,
    }));

    return res.status(200).json({
      success: true,
      count: formatted.length,
      data: formatted,
    });
  } catch (err) {
    console.error("[Admin] Failed to retrieve users:", err);

    return res.status(500).json({
      success: false,
      error: "Failed to retrieve users",
    });
  }
};

export const createUser = async (req, res) => {
  try {
    const { name, email, password, role, organization, subscriptionTier } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({
        success: false,
        error: "Please provide name, email, password, and role",
      });
    }

    const normalizedRole = typeof role === "string" ? role.trim().toLowerCase().replace(/\s+/g, "_") : null;

    if (!normalizedRole || !ALLOWED_ROLES.includes(normalizedRole)) {
      return res.status(400).json({
        success: false,
        error: `Role must be one of: ${ALLOWED_ROLES.join(", ")}`,
      });
    }

    const existing = await User.findOne({ email: email.trim().toLowerCase() });

    if (existing) {
      return res.status(400).json({
        success: false,
        error: "User with this email already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    let orgId;

    if (organization) {
      let org = await Organization.findOne({ name: organization.trim() });

      if (!org) {
        org = await Organization.create({
          name: organization.trim(),
          ownerId: req.user?._id,
        });
      }

      orgId = org._id;
    } else {
      let defaultOrg = await Organization.findOne();
      if (!defaultOrg) {
        defaultOrg = await Organization.create({
          name: "Sentrix Operations",
          ownerId: req.user?._id,
        });
      }
      orgId = defaultOrg?._id;
    }

    const validTier = ["free", "pro", "enterprise"].includes(subscriptionTier) ? subscriptionTier : "free";

    const newUser = await User.create({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password: hashedPassword,
      role: normalizedRole,
      organizationId: orgId,
      subscriptionTier: validTier,
      isActive: true,
    });

    return res.status(201).json({
      success: true,
      data: {
        id: String(newUser._id),
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        subscriptionTier: newUser.subscriptionTier,
        org: organization || "Sentrix Operations",
        status: "active",
        lastLogin: "Never",
      },
    });
  } catch (err) {
    console.error("[Admin] Failed to create user:", err);

    return res.status(500).json({
      success: false,
      error: "Failed to create user",
    });
  }
};

export const toggleUserStatus = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found",
      });
    }

    if (user.role === "admin") {
      return res.status(403).json({
        success: false,
        error: "Administrator accounts cannot be suspended or deactivated.",
      });
    }

    user.isActive = !user.isActive;
    await user.save();

    return res.status(200).json({
      success: true,
      data: {
        id: String(user._id),
        status: user.isActive ? "active" : "suspended",
      },
    });
  } catch (err) {
    console.error("[Admin] Failed to update user status:", err);

    return res.status(500).json({
      success: false,
      error: "Failed to update user status",
    });
  }
};

/**
 * Update a user's role (admin only).
 * Valid roles: admin, security_engineer, developer, malware_analyst, client_owner, client_member
 */
export const updateUserRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    const normalizedRole = typeof role === "string" ? role.trim().toLowerCase().replace(/\s+/g, "_") : null;

    if (!normalizedRole || !ALLOWED_ROLES.includes(normalizedRole)) {
      return res.status(400).json({
        success: false,
        error: `Role must be one of: ${ALLOWED_ROLES.join(", ")}`,
      });
    }

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found",
      });
    }

    if (user.role === "admin" && normalizedRole !== "admin") {
      return res.status(403).json({
        success: false,
        error: "Administrator accounts cannot be changed to another role.",
      });
    }

    user.role = normalizedRole;
    await user.save();

    return res.status(200).json({
      success: true,
      message: `User role updated successfully to ${normalizedRole}`,
      data: {
        id: String(user._id),
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.isActive ? "active" : "suspended",
        updatedAt: user.updatedAt,
      },
    });
  } catch (err) {
    console.error("[Admin] Failed to update user role:", err);

    return res.status(500).json({
      success: false,
      error: "Failed to update user role",
    });
  }
};

/**
 * Get comprehensive admin dashboard statistics:
 * Includes total users, total free, pro, enterprise users separately,
 * subscription statuses, user roles, total site scans, scans by status,
 * total targets, projects, organizations, findings, malware cases, billing, and system health.
 */
export const getAdminDashboardStats = async (req, res) => {
  try {
    // 1. User & Subscription Tier metrics
    const [
      totalUsers,
      activeUsers,
      suspendedUsers,
      // Subscription Tiers (Free, Pro, Enterprise)
      freeUsersCount,
      proUsersCount,
      enterpriseUsersCount,
      // Subscription Statuses
      activeSubCount,
      trialSubCount,
      canceledSubCount,
      inactiveSubCount,
      // Role Breakdown
      adminCount,
      secEngCount,
      devCount,
      malwareAnalystCount,
      clientOwnerCount,
      clientMemberCount,
    ] = await Promise.all([
      User.countDocuments().catch(() => 0),
      User.countDocuments({ isActive: true }).catch(() => 0),
      User.countDocuments({ isActive: false }).catch(() => 0),
      // Tiers
      User.countDocuments({ subscriptionTier: "free" }).catch(() => 0),
      User.countDocuments({ subscriptionTier: "pro" }).catch(() => 0),
      User.countDocuments({ subscriptionTier: "enterprise" }).catch(() => 0),
      // Statuses
      User.countDocuments({ subscriptionStatus: "active" }).catch(() => 0),
      User.countDocuments({ subscriptionStatus: "trial" }).catch(() => 0),
      User.countDocuments({ subscriptionStatus: "canceled" }).catch(() => 0),
      User.countDocuments({ subscriptionStatus: "inactive" }).catch(() => 0),
      // Roles
      User.countDocuments({ role: "admin" }).catch(() => 0),
      User.countDocuments({ role: "security_engineer" }).catch(() => 0),
      User.countDocuments({ role: "developer" }).catch(() => 0),
      User.countDocuments({ role: "malware_analyst" }).catch(() => 0),
      User.countDocuments({ role: "client_owner" }).catch(() => 0),
      User.countDocuments({ role: "client_member" }).catch(() => 0),
    ]);

    // 2. Scan metrics (both Scan engine and Assessment targets)
    const [
      engineScanCount,
      assessmentScanCount,
      runningScans,
      completedScans,
      failedScans,
    ] = await Promise.all([
      Scan.countDocuments().catch(() => 0),
      Assessment.countDocuments().catch(() => 0),
      Scan.countDocuments({ status: "running" }).catch(() => 0),
      Scan.countDocuments({ status: "completed" }).catch(() => 0),
      Scan.countDocuments({ status: "failed" }).catch(() => 0),
    ]);

    const totalSiteScans = engineScanCount + assessmentScanCount;

    // 3. Targets, Projects, Organizations & Findings
    const [
      totalTargets,
      totalProjects,
      totalOrganizations,
      totalFindings,
      criticalFindings,
      highFindings,
      mediumFindings,
      lowFindings,
      infoFindings,
      totalMalwareCases,
      totalOrders,
      pendingOrders,
    ] = await Promise.all([
      Target.countDocuments().catch(() => 0),
      Project.countDocuments().catch(() => 0),
      Organization.countDocuments().catch(() => 0),
      Finding.countDocuments().catch(() => 0),
      Finding.countDocuments({ severity: "critical" }).catch(() => 0),
      Finding.countDocuments({ severity: "high" }).catch(() => 0),
      Finding.countDocuments({ severity: "medium" }).catch(() => 0),
      Finding.countDocuments({ severity: "low" }).catch(() => 0),
      Finding.countDocuments({ severity: "info" }).catch(() => 0),
      MalwareCase.countDocuments().catch(() => 0),
      ServiceOrder.countDocuments().catch(() => 0),
      ServiceOrder.countDocuments({ status: { $in: ["submitted", "under_review", "info_requested"] } }).catch(() => 0),
    ]);

    // 4. Billing & Transaction revenue metrics
    let totalTransactions = 0;
    let successfulTransactions = 0;
    let totalRevenueAmount = 0;

    try {
      [totalTransactions, successfulTransactions] = await Promise.all([
        Transaction.countDocuments().catch(() => 0),
        Transaction.countDocuments({ status: "success" }).catch(() => 0),
      ]);

      const revenueAgg = await Transaction.aggregate([
        { $match: { status: "success" } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]).catch(() => []);

      totalRevenueAmount = revenueAgg?.[0]?.total || 0;
    } catch {
      totalRevenueAmount = 0;
    }

    // 5. Recent registered users (latest 5)
    const recentUsers = await User.find()
      .select("name email role subscriptionTier subscriptionStatus isActive createdAt")
      .sort({ createdAt: -1 })
      .limit(5)
      .catch(() => []);

    // 6. Recent audit logs if available
    let recentAuditLogs = [];
    try {
      recentAuditLogs = await AuditLog.find()
        .sort({ createdAt: -1 })
        .limit(6);
    } catch {
      recentAuditLogs = [];
    }

    const payload = {
      overview: {
        totalUsers,
        totalFreeUsers: freeUsersCount,
        totalProUsers: proUsersCount,
        totalEnterpriseUsers: enterpriseUsersCount,
        totalSiteScans,
        totalTargets,
        totalProjects,
        totalOrganizations,
        totalFindings,
        totalMalwareCases,
        totalOrders,
        pendingOrders,
        totalRevenue: totalRevenueAmount,
      },
      users: {
        total: totalUsers,
        active: activeUsers,
        suspended: suspendedUsers,
        totalFree: freeUsersCount,
        totalPro: proUsersCount,
        totalEnterprise: enterpriseUsersCount,
        bySubscriptionTier: {
          free: freeUsersCount,
          pro: proUsersCount,
          enterprise: enterpriseUsersCount,
        },
        bySubscriptionStatus: {
          active: activeSubCount,
          trial: trialSubCount,
          canceled: canceledSubCount,
          inactive: inactiveSubCount,
        },
        byRole: {
          admin: adminCount,
          security_engineer: secEngCount,
          developer: devCount,
          malware_analyst: malwareAnalystCount,
          client_owner: clientOwnerCount,
          client_member: clientMemberCount,
        },
      },
      subscriptions: {
        totalFreeUsers: freeUsersCount,
        totalProUsers: proUsersCount,
        totalEnterpriseUsers: enterpriseUsersCount,
        statusBreakdown: {
          active: activeSubCount,
          trial: trialSubCount,
          canceled: canceledSubCount,
          inactive: inactiveSubCount,
        },
        totalTransactions,
        successfulTransactions,
        totalRevenue: totalRevenueAmount,
        currency: "ETB",
      },
      scans: {
        total: totalSiteScans,
        engineScans: engineScanCount,
        assessmentScans: assessmentScanCount,
        byStatus: {
          running: runningScans,
          completed: completedScans,
          failed: failedScans,
        },
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
      },
      recentUsers: recentUsers.map((u) => ({
        id: String(u._id),
        name: u.name,
        email: u.email,
        role: u.role,
        subscriptionTier: u.subscriptionTier || "free",
        subscriptionStatus: u.subscriptionStatus || "active",
        status: u.isActive ? "active" : "suspended",
        createdAt: u.createdAt,
      })),
      recentAuditLogs,
      system: {
        status: "operational",
        uptimeSeconds: Math.floor(process.uptime()),
        nodeVersion: process.version,
        environment: process.env.NODE_ENV || "development",
        timestamp: new Date().toISOString(),
      },
    };

    return res.status(200).json({
      success: true,
      data: payload,
    });
  } catch (err) {
    console.error("[Admin] Failed to generate dashboard stats:", err);

    return res.status(500).json({
      success: false,
      error: "Failed to generate dashboard statistics",
    });
  }
};

/**
 * Get Client Portal Services availability status
 * Controls whether client_member and client_owner can access Service Orders & Project Workspaces
 */
export const getClientPortalStatus = async (req, res) => {
  try {
    const setting = await SystemSetting.findOne({ key: "client_portal_services_enabled" });
    const enabled = setting ? Boolean(setting.value) : true;

    return res.status(200).json({
      success: true,
      enabled,
      clientServicesEnabled: enabled,
    });
  } catch (err) {
    console.error("[SystemSetting] Error fetching portal status:", err);
    return res.status(200).json({
      success: true,
      enabled: true,
      clientServicesEnabled: true,
    });
  }
};

/**
 * Update Client Portal Services availability status (Admin only)
 */
export const updateClientPortalStatus = async (req, res) => {
  try {
    const { enabled } = req.body;
    const isEnabled = Boolean(enabled);

    await SystemSetting.findOneAndUpdate(
      { key: "client_portal_services_enabled" },
      {
        key: "client_portal_services_enabled",
        value: isEnabled,
        updatedBy: req.user._id,
      },
      { upsert: true, new: true }
    );

    return res.status(200).json({
      success: true,
      message: isEnabled
        ? "Client Portal Services enabled! Client members and owners can access orders and workspaces."
        : "Client Portal Services suspended! Service Orders and Project Workspaces are now unavailable for clients.",
      enabled: isEnabled,
      clientServicesEnabled: isEnabled,
    });
  } catch (err) {
    console.error("[SystemSetting] Error updating portal status:", err);
    return res.status(500).json({
      success: false,
      error: "Failed to update client portal status",
    });
  }
};
