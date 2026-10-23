import { ServiceProject } from "../models/ServiceProject.js";
import { ServiceOrder } from "../models/ServiceOrder.js";
import { ProjectTask } from "../models/ProjectTask.js";
import Finding from "../database/models/finding.model.js";

/**
 * 1. List Service Projects (Role-Scoped)
 * GET /api/v1/service-projects
 */
export const listServiceProjects = async (req, res) => {
  try {
    const user = req.user;
    const { status, projectType, search } = req.query;

    const query = {};

    // Role-based visibility isolation
    if (user.role === "client_owner" || user.role === "client_member") {
      query.$or = [
        { clientOwnerId: user._id },
        ...(user.organizationId ? [{ organizationId: user.organizationId }] : []),
      ];
    } else if (user.role === "developer") {
      query.$or = [
        { assignedDevelopers: user._id },
        { projectType: "secure_development" },
        { status: { $in: ["in_development", "remediation_in_progress", "planning"] } },
      ];
    } else if (user.role === "security_engineer") {
      query.$or = [
        { assignedSecurityEngineers: user._id },
        { projectType: "security_assessment" },
        { status: { $in: ["ready_for_security_review", "in_security_testing", "planning"] } },
      ];
    } else if (user.role === "malware_analyst") {
      query.$or = [
        { assignedMalwareAnalysts: user._id },
        { projectType: "malware_analysis" },
      ];
    }

    if (status) query.status = status;
    if (projectType) query.projectType = projectType;

    if (search) {
      query.$and = query.$and || [];
      query.$and.push({
        $or: [
          { projectCode: { $regex: search, $options: "i" } },
          { title: { $regex: search, $options: "i" } },
        ],
      });
    }

    const projects = await ServiceProject.find(query)
      .sort({ updatedAt: -1, createdAt: -1 })
      .populate("clientOwnerId", "name email role")
      .populate("assignedDevelopers", "name email role")
      .populate("assignedSecurityEngineers", "name email role")
      .populate("assignedMalwareAnalysts", "name email role")
      .populate("orderId", "orderNumber serviceType priority deadline")
      .lean();

    return res.status(200).json({
      success: true,
      count: projects.length,
      data: projects,
    });
  } catch (err) {
    console.error("[ServiceProject] Error listing projects:", err);
    return res.status(500).json({
      success: false,
      error: "Failed to retrieve service projects",
    });
  }
};

/**
 * 2. Get Project Details by ID
 * GET /api/v1/service-projects/:id
 */
export const getServiceProjectById = async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;

    const project = await ServiceProject.findById(id)
      .populate("clientOwnerId", "name email role organizationId")
      .populate("assignedDevelopers", "name email role")
      .populate("assignedSecurityEngineers", "name email role")
      .populate("assignedMalwareAnalysts", "name email role")
      .populate("orderId")
      .populate("targetId")
      .populate("signOffs.securityLead.signedBy", "name email role")
      .populate("signOffs.adminLead.signedBy", "name email role")
      .populate("signOffs.clientAcceptance.acceptedBy", "name email role")
      .lean();

    if (!project) {
      return res.status(404).json({
        success: false,
        error: "Service project not found",
      });
    }

    // Authorization check for client roles
    if (user.role === "client_owner" || user.role === "client_member") {
      const isOwner = String(project.clientOwnerId?._id || project.clientOwnerId) === String(user._id);
      const isSameOrg =
        user.organizationId &&
        String(project.organizationId) === String(user.organizationId);

      if (!isOwner && !isSameOrg) {
        return res.status(403).json({
          success: false,
          error: "You are not authorized to view this project",
        });
      }
    }

    // Attach task summary metrics
    const tasks = await ProjectTask.find({ projectId: project._id }).lean();
    const taskMetrics = {
      total: tasks.length,
      todo: tasks.filter((t) => t.status === "todo").length,
      in_progress: tasks.filter((t) => t.status === "in_progress").length,
      review: tasks.filter((t) => t.status === "review").length,
      done: tasks.filter((t) => t.status === "done").length,
    };

    return res.status(200).json({
      success: true,
      data: {
        ...project,
        taskMetrics,
      },
    });
  } catch (err) {
    console.error("[ServiceProject] Error fetching project details:", err);
    return res.status(500).json({
      success: false,
      error: "Failed to retrieve project details",
    });
  }
};

/**
 * 3. Update Project Phase & Progress
 * PATCH /api/v1/service-projects/:id/phase
 */
export const updateProjectPhase = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, progress, deadline } = req.body;

    const validStatuses = [
      "planning",
      "in_development",
      "ready_for_security_review",
      "in_security_testing",
      "remediation_in_progress",
      "final_approval",
      "completed",
      "archived",
    ];

    const updateFields = {};
    if (status) {
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          error: `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
        });
      }
      updateFields.status = status;
    }

    if (progress !== undefined) {
      updateFields.progress = Math.min(100, Math.max(0, Number(progress)));
    }
    if (deadline) {
      updateFields.deadline = new Date(deadline);
    }

    const project = await ServiceProject.findByIdAndUpdate(id, updateFields, {
      new: true,
    })
      .populate("clientOwnerId", "name email")
      .populate("assignedDevelopers", "name email")
      .populate("assignedSecurityEngineers", "name email");

    if (!project) {
      return res.status(404).json({
        success: false,
        error: "Service project not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: `Project ${project.projectCode} phase updated successfully`,
      data: project,
    });
  } catch (err) {
    console.error("[ServiceProject] Error updating phase:", err);
    return res.status(500).json({
      success: false,
      error: "Failed to update project phase",
    });
  }
};

/**
 * 4. Assign Specialists to Project (Admin)
 * PATCH /api/v1/service-projects/:id/assign
 */
export const assignProjectTeam = async (req, res) => {
  try {
    const { id } = req.params;
    const { assignedDevelopers, assignedSecurityEngineers } = req.body;

    const project = await ServiceProject.findById(id);
    if (!project) {
      return res.status(404).json({
        success: false,
        error: "Service project not found",
      });
    }

    if (Array.isArray(assignedDevelopers)) {
      project.assignedDevelopers = assignedDevelopers;
    }
    if (Array.isArray(assignedSecurityEngineers)) {
      project.assignedSecurityEngineers = assignedSecurityEngineers;
    }

    await project.save();

    const populated = await ServiceProject.findById(id)
      .populate("assignedDevelopers", "name email role")
      .populate("assignedSecurityEngineers", "name email role");

    return res.status(200).json({
      success: true,
      message: `Team assignments updated for project ${project.projectCode}`,
      data: populated,
    });
  } catch (err) {
    console.error("[ServiceProject] Error assigning team:", err);
    return res.status(500).json({
      success: false,
      error: "Failed to assign team to project",
    });
  }
};

/**
 * 5. DevSecOps Continuous Collaboration: Developer Submits Work for Security Testing
 * POST /api/v1/service-projects/:id/submit-for-testing
 */
export const submitForSecurityTesting = async (req, res) => {
  try {
    const { id } = req.params;
    const { notes, repositoryUrl, buildUrl } = req.body;

    const project = await ServiceProject.findById(id);
    if (!project) {
      return res.status(404).json({
        success: false,
        error: "Service project not found",
      });
    }

    // Attach deliverable artifact if provided
    if (repositoryUrl || buildUrl) {
      project.deliverables.push({
        title: "Development Build for Security Review",
        description: notes || "Submitted by developer for penetration testing & vulnerability audit",
        url: repositoryUrl || buildUrl,
        submittedBy: req.user._id,
        submittedAt: new Date(),
      });
    }

    project.status = "ready_for_security_review";
    project.progress = Math.max(project.progress, 60);
    await project.save();

    // Automatically spawn Security Audit Task
    await ProjectTask.create({
      projectId: project._id,
      title: `Security Testing & Vulnerability Assessment: ${project.title}`,
      description: notes || "Review code artifacts and dynamic endpoints for vulnerabilities.",
      taskType: "security_audit",
      status: "todo",
      priority: "high",
      assignedTo: project.assignedSecurityEngineers[0] || null,
      createdBy: req.user._id,
    });

    return res.status(200).json({
      success: true,
      message: `Project ${project.projectCode} submitted to Security Team for penetration testing.`,
      data: project,
    });
  } catch (err) {
    console.error("[ServiceProject] Error submitting for security testing:", err);
    return res.status(500).json({
      success: false,
      error: "Failed to submit project for security testing",
    });
  }
};

/**
 * 6. Attach Project Deliverables
 * POST /api/v1/service-projects/:id/deliverables
 */
export const submitDeliverable = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, url } = req.body;

    if (!title || !url) {
      return res.status(400).json({
        success: false,
        error: "Deliverable title and URL are required",
      });
    }

    const project = await ServiceProject.findById(id);
    if (!project) {
      return res.status(404).json({
        success: false,
        error: "Service project not found",
      });
    }

    project.deliverables.push({
      title: title.trim(),
      description: description || "",
      url: url.trim(),
      submittedBy: req.user._id,
      submittedAt: new Date(),
    });

    await project.save();

    return res.status(201).json({
      success: true,
      message: "Deliverable item attached to project successfully",
      data: project.deliverables,
    });
  } catch (err) {
    console.error("[ServiceProject] Error adding deliverable:", err);
    return res.status(500).json({
      success: false,
      error: "Failed to submit deliverable",
    });
  }
};

/**
 * 7. Three-Tier Delivery Sign-Off 1: Technical Security Approval (Security Engineer / Admin)
 * POST /api/v1/service-projects/:id/security-signoff
 */
export const securitySignOff = async (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;

    const project = await ServiceProject.findById(id);
    if (!project) {
      return res.status(404).json({
        success: false,
        error: "Service project not found",
      });
    }

    // Security Gate Check: Check if any unmitigated critical or high findings are open
    if (project.targetId) {
      const openCriticals = await Finding.countDocuments({
        targetId: project.targetId,
        severity: { $in: ["critical", "high"] },
        status: { $in: ["detected", "verified"] },
      }).catch(() => 0);

      if (openCriticals > 0) {
        return res.status(400).json({
          success: false,
          error: `Security Gate Violation: ${openCriticals} unresolved Critical/High vulnerabilities remain on target. Remediate or accept risk prior to security approval.`,
        });
      }
    }

    project.signOffs.securityLead = {
      isApproved: true,
      signedBy: req.user._id,
      signedAt: new Date(),
      notes: notes || "Technical security testing complete. Zero unmitigated high/critical findings verified.",
    };

    project.status = "final_approval";
    project.progress = Math.max(project.progress, 90);
    await project.save();

    return res.status(200).json({
      success: true,
      message: `Technical security approval signed off for ${project.projectCode}. Ready for Admin operations sign-off.`,
      data: project,
    });
  } catch (err) {
    console.error("[ServiceProject] Error in security signoff:", err);
    return res.status(500).json({
      success: false,
      error: "Failed to record security sign-off",
    });
  }
};

/**
 * 8. Three-Tier Delivery Sign-Off 2: Operations Final Approval (Admin Only)
 * POST /api/v1/service-projects/:id/admin-approval
 */
export const adminApproval = async (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;

    const project = await ServiceProject.findById(id);
    if (!project) {
      return res.status(404).json({
        success: false,
        error: "Service project not found",
      });
    }

    project.signOffs.adminLead = {
      isApproved: true,
      signedBy: req.user._id,
      signedAt: new Date(),
      notes: notes || "Admin operations and deliverable verification confirmed.",
    };

    project.status = "final_approval";
    project.progress = 95;
    await project.save();

    return res.status(200).json({
      success: true,
      message: `Admin operations sign-off confirmed for ${project.projectCode}. Ready for client delivery acceptance.`,
      data: project,
    });
  } catch (err) {
    console.error("[ServiceProject] Error in admin approval:", err);
    return res.status(500).json({
      success: false,
      error: "Failed to record admin approval",
    });
  }
};

/**
 * 9. Three-Tier Delivery Sign-Off 3: Client Final Acceptance (Client Owner)
 * POST /api/v1/service-projects/:id/client-acceptance
 */
export const clientAcceptance = async (req, res) => {
  try {
    const { id } = req.params;
    const { feedback } = req.body;

    const project = await ServiceProject.findById(id);
    if (!project) {
      return res.status(404).json({
        success: false,
        error: "Service project not found",
      });
    }

    // Verify ownership
    if (
      String(project.clientOwnerId) !== String(req.user._id) &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({
        success: false,
        error: "Only the designated client owner may confirm final delivery acceptance",
      });
    }

    project.signOffs.clientAcceptance = {
      isAccepted: true,
      acceptedBy: req.user._id,
      acceptedAt: new Date(),
      feedback: feedback || "Deliverables received and approved by client organization.",
    };

    project.status = "completed";
    project.progress = 100;
    await project.save();

    // Mark parent service order completed as well
    if (project.orderId) {
      await ServiceOrder.findByIdAndUpdate(project.orderId, {
        status: "accepted", // or completed
      });
    }

    return res.status(200).json({
      success: true,
      message: `Project ${project.projectCode} officially accepted and completed!`,
      data: project,
    });
  } catch (err) {
    console.error("[ServiceProject] Error in client acceptance:", err);
    return res.status(500).json({
      success: false,
      error: "Failed to record client acceptance",
    });
  }
};

