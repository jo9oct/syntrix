import { Project } from "../models/Project.js";
import { Organization } from "../models/Organization.js";

export const getProjects = async (req, res) => {
  try {
    const filter =
      req.user?.role === "admin" ||
      req.user?.role === "security_engineer" ||
      !req.user?.organizationId
        ? {}
        : { organizationId: req.user.organizationId };

    const projects = await Project.find(filter)
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: projects.length,
      data: projects,
    });
  } catch (err) {
    console.error("[Projects] Failed to retrieve projects:", err);

    return res.status(500).json({
      success: false,
      error: "Failed to retrieve projects",
    });
  }
};

export const createProject = async (req, res) => {
  try {
    let orgId = req.user?.organizationId;

    if (!orgId) {
      const defaultOrg = await Organization.findOne();
      orgId = defaultOrg?._id;
    }

    if (!orgId) {
      return res.status(400).json({
        success: false,
        error: "An organization is required to create a project",
      });
    }

    const { name, description, serviceType, status, assignedTo } = req.body;

    const project = await Project.create({
      name,
      description,
      serviceType,
      ...(status !== undefined && { status }),
      ...(assignedTo !== undefined && { assignedTo }),
      organizationId: orgId,
      createdBy: req.user._id,
    });

    return res.status(201).json({
      success: true,
      data: project,
    });
  } catch (err) {
    console.error("[Projects] Failed to create project:", err);

    return res.status(400).json({
      success: false,
      error: "Failed to create project",
    });
  }
};

export const getProject = async (req, res) => {
  try {
    const filter = { _id: req.params.id };

    if (req.user?.role !== "admin" && req.user?.role !== "security_engineer") {
      if (!req.user?.organizationId) {
        return res.status(403).json({
          success: false,
          error: "An organization is required to access this project",
        });
      }

      filter.organizationId = req.user.organizationId;
    }

    const project = await Project.findOne(filter);

    if (!project) {
      return res.status(404).json({
        success: false,
        error: "Project not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: project,
    });
  } catch (err) {
    console.error("[Projects] Failed to retrieve project:", err);

    return res.status(500).json({
      success: false,
      error: "Failed to retrieve project",
    });
  }
};

export const updateProject = async (req, res) => {
  try {
    const filter = { _id: req.params.id };

    if (req.user?.role !== "admin" && req.user?.role !== "security_engineer") {
      if (!req.user?.organizationId) {
        return res.status(403).json({
          success: false,
          error: "An organization is required to update this project",
        });
      }

      filter.organizationId = req.user.organizationId;
    }

    // Only allow updates to these project fields.
    const allowedFields = [
      "name",
      "description",
      "serviceType",
      "status",
      "assignedTo",
    ];

    const updates = {};

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        error: "No valid project fields provided for update",
      });
    }

    const project = await Project.findOneAndUpdate(filter, updates, {
      new: true,
      runValidators: true,
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        error: "Project not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: project,
    });
  } catch (err) {
    console.error("[Projects] Failed to update project:", err);

    return res.status(400).json({
      success: false,
      error: "Failed to update project",
    });
  }
};

export const deleteProject = async (req, res) => {
  try {
    const filter = { _id: req.params.id };

    if (req.user?.role !== "admin") {
      if (!req.user?.organizationId) {
        return res.status(403).json({
          success: false,
          error: "An organization is required to delete this project",
        });
      }

      filter.organizationId = req.user.organizationId;
    }

    const project = await Project.findOneAndDelete(filter);

    if (!project) {
      return res.status(404).json({
        success: false,
        error: "Project not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: {},
    });
  } catch (err) {
    console.error("[Projects] Failed to delete project:", err);

    return res.status(500).json({
      success: false,
      error: "Failed to delete project",
    });
  }
};
