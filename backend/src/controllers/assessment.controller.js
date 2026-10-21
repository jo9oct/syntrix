// STATUS: UPDATED
// FILE: src/controllers/assessment.controller.js
// PURPOSE: Manage assessments without findings, mock engines, or mock scan results.

import mongoose from "mongoose";

import { Assessment } from "../models/Assessment.js";
import { Organization } from "../models/Organization.js";

export const getAssessments = async (req, res) => {
  try {
    const filter = {};

    if (req.user?.role !== "admin" && req.user?.role !== "security_engineer") {
      if (!req.user?.organizationId) {
        return res.status(403).json({
          success: false,
          error: "An organization is required to access assessments.",
        });
      }

      filter.organizationId = req.user.organizationId;
    }

    if (req.query.projectId) {
      if (!mongoose.isValidObjectId(req.query.projectId)) {
        return res.status(400).json({
          success: false,
          error: "Invalid project ID.",
        });
      }

      filter.projectId = req.query.projectId;
    }

    const assessments = await Assessment.find(filter).sort({
      createdAt: -1,
    });

    return res.status(200).json({
      success: true,
      count: assessments.length,
      data: assessments,
    });
  } catch (error) {
    console.error("[Assessment] Failed to retrieve assessments:", error);

    return res.status(500).json({
      success: false,
      error: "Failed to retrieve assessments.",
    });
  }
};

export const startAssessment = async (req, res) => {
  try {
    if (!req.user?._id) {
      return res.status(401).json({
        success: false,
        error: "Authentication is required.",
      });
    }

    let organizationId = req.user.organizationId;

    if (!organizationId) {
      if (req.user.role !== "admin") {
        return res.status(403).json({
          success: false,
          error: "An organization is required to start an assessment.",
        });
      }

      const defaultOrganization = await Organization.findOne().select("_id");
      organizationId = defaultOrganization?._id;
    }

    if (!organizationId) {
      return res.status(400).json({
        success: false,
        error: "No organization is available for this assessment.",
      });
    }

    const {
      projectId,
      targetType,
      targetUrl,
      environment,
      scanMode,
      selectedTests,
      intensity,
      authConfig,
    } = req.body;

    if (!mongoose.isValidObjectId(projectId)) {
      return res.status(400).json({
        success: false,
        error: "A valid project ID is required.",
      });
    }

    if (typeof targetUrl !== "string" || targetUrl.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: "A target URL is required.",
      });
    }

    const assessment = await Assessment.create({
      projectId,
      targetType,
      targetUrl: targetUrl.trim(),
      environment,
      ...(scanMode !== undefined && { scanMode }),
      ...(selectedTests !== undefined && { selectedTests }),
      ...(intensity !== undefined && { intensity }),
      ...(authConfig !== undefined && { authConfig }),
      organizationId,
      createdBy: req.user._id,
      status: "pending",
      progress: 0,
      totalTests: 0,
      completedTests: 0,
    });

    return res.status(201).json({
      success: true,
      message:
        "Assessment created. No scan has been executed by this endpoint.",
      data: assessment,
    });
  } catch (error) {
    console.error("[Assessment] Failed to create assessment:", error);

    if (error.name === "ValidationError" || error.name === "CastError") {
      return res.status(400).json({
        success: false,
        error: "Invalid assessment data.",
      });
    }

    return res.status(500).json({
      success: false,
      error: "Failed to create assessment.",
    });
  }
};

export const getAssessment = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        error: "Invalid assessment ID.",
      });
    }

    const filter = { _id: id };

    if (req.user?.role !== "admin" && req.user?.role !== "security_engineer") {
      if (!req.user?.organizationId) {
        return res.status(403).json({
          success: false,
          error: "An organization is required to access assessments.",
        });
      }

      filter.organizationId = req.user.organizationId;
    }

    const assessment = await Assessment.findOne(filter);

    if (!assessment) {
      return res.status(404).json({
        success: false,
        error: "Assessment not found.",
      });
    }

    return res.status(200).json({
      success: true,
      data: assessment,
    });
  } catch (error) {
    console.error("[Assessment] Failed to retrieve assessment:", error);

    return res.status(500).json({
      success: false,
      error: "Failed to retrieve assessment.",
    });
  }
};
