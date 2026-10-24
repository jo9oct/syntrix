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
      .populate("testingFeedback.rejectedBy", "name email role")
      .populate("assignedMalwareAnalysts", "name email role")
      .populate("orderId", "orderNumber serviceType priority deadline")
      .lean();

    // Client protection: hide deliverables before admin officially delivers project
    const isClientRole = ["client_owner", "client_member", "user"].includes(user.role);
    const sanitizedProjects = projects.map((p) => {
      if (isClientRole && !p.isDeliveredToClient) {
        return {
          ...p,
          deliverables: [],
          deliverablesPendingRelease: true,
        };
      }
      return p;
    });

    return res.status(200).json({
      success: true,
      count: sanitizedProjects.length,
      data: sanitizedProjects,
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
      .populate("testingFeedback.rejectedBy", "name email role")
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

    // Client protection: hide deliverables before admin officially delivers project
    const isClientRole = ["client_owner", "client_member", "user"].includes(user.role);
    let sanitizedDeliverables = project.deliverables || [];
    let deliverablesPendingRelease = false;
    if (isClientRole && !project.isDeliveredToClient) {
      sanitizedDeliverables = [];
      deliverablesPendingRelease = true;
    }

    return res.status(200).json({
      success: true,
      data: {
        ...project,
        deliverables: sanitizedDeliverables,
        deliverablesPendingRelease,
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
    const { status, progress, developmentProgress, securityTestingProgress, progressStage, deadline } = req.body;

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

    const currentProject = await ServiceProject.findById(id);
    if (!currentProject) {
      return res.status(404).json({
        success: false,
        error: "Service project not found",
      });
    }

    const updateFields = {};

    if (developmentProgress !== undefined) {
      updateFields.developmentProgress = Math.min(100, Math.max(0, Number(developmentProgress)));
    }
    if (securityTestingProgress !== undefined) {
      updateFields.securityTestingProgress = Math.min(100, Math.max(0, Number(securityTestingProgress)));
    }

    if (progress !== undefined) {
      const numProg = Math.min(100, Math.max(0, Number(progress)));
      if (progressStage === "testing" || req.user.role === "security_engineer") {
        updateFields.securityTestingProgress = numProg;
        const devP = updateFields.developmentProgress !== undefined ? updateFields.developmentProgress : (currentProject.developmentProgress || 100);
        updateFields.progress = Math.round((devP * 0.5) + (numProg * 0.5));
      } else if (progressStage === "development" || req.user.role === "developer") {
        updateFields.developmentProgress = numProg;
        const testP = updateFields.securityTestingProgress !== undefined ? updateFields.securityTestingProgress : (currentProject.securityTestingProgress || 0);
        updateFields.progress = Math.round((numProg * 0.5) + (testP * 0.5));
      } else {
        updateFields.progress = numProg;
      }
    } else if (updateFields.developmentProgress !== undefined || updateFields.securityTestingProgress !== undefined) {
      const devP = updateFields.developmentProgress !== undefined ? updateFields.developmentProgress : (currentProject.developmentProgress || 0);
      const testP = updateFields.securityTestingProgress !== undefined ? updateFields.securityTestingProgress : (currentProject.securityTestingProgress || 0);
      updateFields.progress = Math.round((devP * 0.5) + (testP * 0.5));
    }

    if (status) {
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          error: `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
        });
      }
      // Non-admins cannot mark a project as completed without admin delivery
      if (status === "completed" && req.user.role !== "admin") {
        updateFields.status = "final_approval";
      } else {
        updateFields.status = status;
      }
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

    // Sync progress and phase to linked ServiceOrder if present
    const linkedOrderId = project.orderId || project.serviceOrderId;
    if (linkedOrderId) {
      try {
        const orderUpdate = {};
        if (updateFields.progress !== undefined) orderUpdate.progress = updateFields.progress;
        if (updateFields.status) {
          if (updateFields.status === "completed" && project.isDeliveredToClient) {
            orderUpdate.status = "completed";
            orderUpdate.phase = "Delivered to Client";
          } else {
            orderUpdate.status = "in_progress";
            orderUpdate.phase = (updateFields.progress && updateFields.progress >= 100) ? "Ready for Admin Review" : updateFields.status.replace(/_/g, " ");
          }
        }
        await ServiceOrder.findByIdAndUpdate(linkedOrderId, orderUpdate);
      } catch (syncErr) {
        console.warn("[ServiceProject] Failed to sync progress to ServiceOrder:", syncErr);
      }
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
      .populate("assignedSecurityEngineers", "name email role")
      .populate("testingFeedback.rejectedBy", "name email role");

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
    const { notes, repositoryUrl, buildUrl, assignedSecurityEngineerId } = req.body;

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

    // Assign chosen security tester if provided
    let testerId = assignedSecurityEngineerId;
    if (testerId) {
      const exists = project.assignedSecurityEngineers.some(
        (eng) => String(eng._id || eng) === String(testerId)
      );
      if (!exists) {
        project.assignedSecurityEngineers.push(testerId);
      }
    } else if (project.assignedSecurityEngineers.length > 0) {
      testerId = project.assignedSecurityEngineers[0];
    }

    // If returning from remediation, mark previous feedback as resolved
    if (Array.isArray(project.testingFeedback)) {
      project.testingFeedback.forEach((item) => {
        if (!item.resolved) {
          item.resolved = true;
          item.resolvedAt = new Date();
          item.resolutionNotes = notes || "Developer addressed security issues and submitted updated build for verification.";
        }
      });
    }

    project.developmentProgress = 100;
    project.securityTestingProgress = 0; // Fresh progress for security tester
    project.status = "in_security_testing";
    project.submittedByDeveloper = true;
    project.progress = 50; // 100% dev + 0% test = 50% overall
    await project.save();

    // Automatically spawn Security Audit Task for the chosen tester
    await ProjectTask.create({
      projectId: project._id,
      title: `Security Testing & Vulnerability Assessment: ${project.title}`,
      description: notes || "Review code artifacts, verify security controls, and perform penetration testing.",
      taskType: "security_audit",
      status: "todo",
      priority: "high",
      assignedTo: testerId || null,
      createdBy: req.user._id,
    });

    // Sync linked ServiceOrder
    const linkedOrderId = project.orderId || project.serviceOrderId;
    if (linkedOrderId) {
      try {
        await ServiceOrder.findByIdAndUpdate(linkedOrderId, {
          status: "in_progress",
          phase: "Under Security Testing",
          assignedTeam: "security_engineer",
          ...(testerId ? { assignedLead: testerId } : {}),
          $push: {
            comments: {
              sender: req.user._id,
              senderRole: req.user.role || "developer",
              senderName: req.user.name || "Developer",
              message: `🚀 [DEVELOPMENT DELIVERED FOR TESTING]\nDeveloper completed code updates (100%) and submitted build for security audit & penetration testing.${notes ? `\nSubmission Notes: ${notes}` : ''}`,
              createdAt: new Date(),
            },
          },
        });
      } catch (err) {
        console.warn("[ServiceProject] Failed to sync order on submit-for-testing:", err);
      }
    }

    const updated = await ServiceProject.findById(id)
      .populate("clientOwnerId", "name email role")
      .populate("assignedDevelopers", "name email role")
      .populate("assignedSecurityEngineers", "name email role")
      .populate("testingFeedback.rejectedBy", "name email role")
      .populate("assignedMalwareAnalysts", "name email role")
      .populate("testingFeedback.rejectedBy", "name email role")
      .lean();

    return res.status(200).json({
      success: true,
      message: `Project ${project.projectCode} development completed (100%) and delivered to Security Tester! Testing progress initialized.`,
      data: updated,
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
 * 5b. DevSecOps Quality Gate: Security Tester Reports Flaws & Returns Project to Developer
 * POST /api/v1/service-projects/:id/reject-to-development
 */
export const rejectToDevelopment = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason, notes, severity, attachments, resetDevProgress, assignedDeveloperId } = req.body;

    const findingSummary = (reason || notes || "").trim();
    if (!findingSummary) {
      return res.status(400).json({
        success: false,
        error: "Reason / finding description is required when returning work to development",
      });
    }

    const project = await ServiceProject.findById(id);
    if (!project) {
      return res.status(404).json({
        success: false,
        error: "Service project not found",
      });
    }

    // Normalized attachments array
    const cleanAttachments = Array.isArray(attachments)
      ? attachments.map((att) => ({
          name: att.name || att.fileName || "Vulnerability PoC / Finding Artifact",
          url: att.url || att.fileUrl || "",
          fileType: att.fileType || "document",
          fileSize: att.fileSize || "",
        }))
      : [];

    // Push feedback record
    if (!Array.isArray(project.testingFeedback)) {
      project.testingFeedback = [];
    }

    project.testingFeedback.push({
      rejectedBy: req.user._id,
      reason: findingSummary,
      notes: (notes || "").trim(),
      severity: ["critical", "high", "medium", "low"].includes(severity) ? severity : "high",
      attachments: cleanAttachments,
      resolved: false,
      createdAt: new Date(),
    });

    // Also attach to deliverables as an audit artifact if an attachment was provided
    cleanAttachments.forEach((att) => {
      if (att.url) {
        project.deliverables.push({
          title: `Testing Finding / PoC Artifact: ${att.name}`,
          description: `Attached by Security Tester (${req.user.name || 'Security Specialist'}) during testing rejection.`,
          url: att.url,
          fileName: att.name,
          fileUrl: att.url,
          fileType: att.fileType,
          fileSize: att.fileSize,
          submittedBy: req.user._id,
          submittedAt: new Date(),
        });
      }
    });

    const parsedDevProgress = typeof resetDevProgress === "number" && resetDevProgress >= 0 && resetDevProgress <= 100
      ? resetDevProgress
      : 50;

    project.status = "remediation_in_progress";
    project.developmentProgress = parsedDevProgress;
    project.securityTestingProgress = 0; // Testing resets until developer fixes flaws
    project.progress = Math.round((parsedDevProgress + 0) / 2);
    project.signOffs.securityLead.isApproved = false;

    // Pick developer to assign remediation task
    let devId = assignedDeveloperId;
    if (!devId && project.assignedDevelopers && project.assignedDevelopers.length > 0) {
      devId = project.assignedDevelopers[0];
    }
    if (devId && (!project.assignedDevelopers || !project.assignedDevelopers.some(d => String(d._id || d) === String(devId)))) {
      if (!Array.isArray(project.assignedDevelopers)) project.assignedDevelopers = [];
      project.assignedDevelopers.push(devId);
    }

    const isDirectSend = Boolean(
      req.body.isDirectSend ||
      (project.projectType === 'security_assessment' && !project.submittedByDeveloper)
    );
    const actionLabel = isDirectSend ? "SENT TO DEVELOPER" : "RETURNED TO DEVELOPER";
    const actionPhase = isDirectSend ? "Remediation Required: Sent to Developer" : "Remediation Required: Returned to Developer";
    const actionMessage = isDirectSend
      ? `Security findings logged! Project sent to Developer with ${cleanAttachments.length} attachment(s) for remediation.`
      : `Security flaws logged! Project returned to Developer with ${cleanAttachments.length} attachment(s) for remediation.`;

    await project.save();

    // Spawn remediation task for developer
    await ProjectTask.create({
      projectId: project._id,
      title: `${isDirectSend ? 'Fix Security Findings' : 'Remediate Security Findings'}: ${findingSummary.substring(0, 60)}`,
      description: `Security Tester Report:\n${findingSummary}\n\nRemediation Notes:\n${notes || "Please patch and verify all reported issues."}${cleanAttachments.length > 0 ? `\n\nAttached Findings / PoCs:\n` + cleanAttachments.map(a => `- ${a.name}: ${a.url}`).join('\n') : ''}`,
      taskType: "remediation",
      status: "todo",
      priority: severity || "high",
      assignedTo: devId || null,
      createdBy: req.user._id,
    });

    // Sync linked ServiceOrder
    const linkedOrderId = project.orderId || project.serviceOrderId;
    if (linkedOrderId) {
      try {
        const attachedNames = cleanAttachments.map(a => a.name).filter(Boolean).join(", ");
        const commentMsg = `⚠️ [SECURITY TESTING FINDINGS - ${actionLabel}]\nFinding: ${findingSummary}\nSeverity: ${(severity || 'high').toUpperCase()}${notes ? `\nDetails: ${notes}` : ''}${attachedNames ? `\nAttached Artifacts: ${attachedNames}` : ''}\nAction Required: Developer must resolve findings and submit for re-testing.`;

        await ServiceOrder.findByIdAndUpdate(linkedOrderId, {
          status: "in_progress",
          phase: actionPhase,
          assignedTeam: "developer",
          ...(devId ? { assignedLead: devId } : {}),
          $push: {
            comments: {
              sender: req.user._id,
              senderRole: req.user.role || "security_engineer",
              senderName: req.user.name || "Security Tester",
              message: commentMsg,
              createdAt: new Date(),
            },
          },
        });
      } catch (err) {
        console.warn("[ServiceProject] Failed to sync order on rejectToDevelopment:", err);
      }
    }

    const updated = await ServiceProject.findById(id)
      .populate("clientOwnerId", "name email role")
      .populate("assignedDevelopers", "name email role")
      .populate("assignedSecurityEngineers", "name email role")
      .populate("testingFeedback.rejectedBy", "name email role")
      .populate("assignedMalwareAnalysts", "name email role")
      .populate("testingFeedback.rejectedBy", "name email role")
      .lean();

    return res.status(200).json({
      success: true,
      message: actionMessage,
      data: updated,
    });
  } catch (err) {
    console.error("[ServiceProject] Error returning project to developer:", err);
    return res.status(500).json({
      success: false,
      error: "Failed to return project to developer",
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
    const { title, name, description, url, fileUrl, fileType, fileName, fileSize } = req.body;

    const deliverableName = (name || title || fileName || "").trim();
    const deliverableUrl = (fileUrl || url || "").trim();

    if (!deliverableName || !deliverableUrl) {
      return res.status(400).json({
        success: false,
        error: "Deliverable name and URL/file are required",
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
      title: deliverableName,
      name: deliverableName,
      fileName: fileName || deliverableName,
      fileSize: fileSize || "",
      description: description || "",
      url: deliverableUrl,
      fileUrl: deliverableUrl,
      fileType: fileType || "report",
      submittedBy: req.user._id,
      uploadedBy: req.user._id,
      submittedAt: new Date(),
      uploadedAt: new Date(),
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
 * 6b. Delete Deliverable Item (Internal Staff Only: Admin, Dev, Security, Malware)
 * DELETE /api/v1/service-projects/:id/deliverables/:deliverableId
 */
export const deleteDeliverable = async (req, res) => {
  try {
    const { id, deliverableId } = req.params;

    const project = await ServiceProject.findById(id);
    if (!project) {
      return res.status(404).json({
        success: false,
        error: "Service project not found",
      });
    }

    const initialLength = project.deliverables.length;
    project.deliverables = project.deliverables.filter(
      (item) => String(item._id) !== String(deliverableId)
    );

    if (project.deliverables.length === initialLength) {
      return res.status(404).json({
        success: false,
        error: "Deliverable item not found",
      });
    }

    await project.save();

    return res.status(200).json({
      success: true,
      message: "Deliverable deleted successfully",
      data: project.deliverables,
    });
  } catch (err) {
    console.error("[ServiceProject] Error deleting deliverable:", err);
    return res.status(500).json({
      success: false,
      error: "Failed to delete deliverable",
    });
  }
};

/**
 * 6c. Official Project Delivery to Client (Admin Only)
 * POST /api/v1/service-projects/:id/deliver
 */
export const deliverProjectToClient = async (req, res) => {
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

    project.isDeliveredToClient = true;
    project.deliveredAt = new Date();
    project.deliveredBy = req.user._id;
    project.deliveryNotes = notes || "Project completed and officially delivered to client with all verified artifacts.";
    project.status = "completed";
    project.progress = 100;
    await project.save();

    // Sync linked ServiceOrder to completed and delivered
    const linkedOrderId = project.orderId || project.serviceOrderId;
    if (linkedOrderId) {
      await ServiceOrder.findByIdAndUpdate(linkedOrderId, {
        status: "completed",
        isDelivered: true,
        deliveredAt: new Date(),
        phase: "Delivered to Client",
        progress: 100,
      });
    }

    const updated = await ServiceProject.findById(id)
      .populate("clientOwnerId", "name email role")
      .populate("assignedDevelopers", "name email role")
      .populate("assignedSecurityEngineers", "name email role")
      .populate("testingFeedback.rejectedBy", "name email role")
      .populate("assignedMalwareAnalysts", "name email role")
      .populate("deliveredBy", "name email role")
      .lean();

    return res.status(200).json({
      success: true,
      message: `Project ${project.projectCode} officially delivered to client! Deliverables and reports are now accessible to the client organization.`,
      data: updated,
    });
  } catch (err) {
    console.error("[ServiceProject] Error delivering project to client:", err);
    return res.status(500).json({
      success: false,
      error: "Failed to deliver project to client",
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
    const { notes, approved } = req.body;

    // If tester rejected, handle rejection
    if (approved === false) {
      return rejectToDevelopment(req, res);
    }

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

    project.securityTestingProgress = 100;
    project.developmentProgress = 100;
    project.status = "final_approval";
    project.progress = 100;
    await project.save();

    // Sync linked ServiceOrder
    const linkedOrderId = project.orderId || project.serviceOrderId;
    if (linkedOrderId) {
      try {
        await ServiceOrder.findByIdAndUpdate(linkedOrderId, {
          phase: "Ready for Admin Final Delivery",
          $push: {
            comments: {
              sender: req.user._id,
              senderRole: req.user.role || "security_engineer",
              senderName: req.user.name || "Security Tester",
              message: `✅ [SECURITY AUDIT SIGN-OFF COMPLETE]\nTechnical security testing finished (100%). Zero unmitigated critical/high vulnerabilities remain. Handed over to Admin for client delivery.${notes ? `\nSign-off Notes: ${notes}` : ''}`,
              createdAt: new Date(),
            },
          },
        });
      } catch (err) {
        console.warn("[ServiceProject] Failed to sync order on securitySignOff:", err);
      }
    }

    return res.status(200).json({
      success: true,
      message: `Technical security testing completed (100%) and signed off for ${project.projectCode}. Sent to Admin for final delivery to client.`,
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

