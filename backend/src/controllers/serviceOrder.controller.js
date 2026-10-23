import { ServiceOrder } from "../models/ServiceOrder.js";
import { ServiceProject } from "../models/ServiceProject.js";

/**
 * 1. Submit a new Service Order (Client)
 * POST /api/v1/service-orders
 */
export const createServiceOrder = async (req, res) => {
  try {
    const {
      title,
      description,
      serviceType,
      requirements,
      targetUrl,
      attachments,
      priority,
      deadline,
      estimatedBudget,
      budget,
    } = req.body;

    if (!title || !description || !serviceType) {
      return res.status(400).json({
        success: false,
        error: "Title, description, and serviceType are required fields",
      });
    }

    if (!["security_assessment", "secure_development"].includes(serviceType)) {
      return res.status(400).json({
        success: false,
        error: "serviceType must be 'security_assessment' or 'secure_development'",
      });
    }

    // Auto-generate clean sequential-style order number
    const count = await ServiceOrder.countDocuments();
    const orderNumber = `ORD-${new Date().getFullYear()}-${String(count + 1).padStart(4, "0")}`;

    // Safe deadline parser to prevent CastError with empty or invalid date strings
    let validDeadline = null;
    if (deadline && typeof deadline === "string" && deadline.trim() !== "") {
      const parsed = new Date(deadline);
      if (!isNaN(parsed.getTime())) {
        validDeadline = parsed;
      }
    } else if (deadline instanceof Date && !isNaN(deadline.getTime())) {
      validDeadline = deadline;
    }

    // Safe budget resolver supporting both budget and estimatedBudget formats
    const bAmt = estimatedBudget?.amount || estimatedBudget?.estimated || budget?.estimated || budget?.amount || 0;
    const bCurr = estimatedBudget?.currency || budget?.currency || "USD";

    // Safe requirements: format as clean string or accept array
    const formattedRequirements = Array.isArray(requirements)
      ? requirements.join("\n")
      : (typeof requirements === "string" ? requirements : "");

    const order = await ServiceOrder.create({
      orderNumber,
      clientId: req.user._id,
      organizationId: req.user.organizationId || null,
      serviceType,
      title: title.trim(),
      description: description.trim(),
      requirements: formattedRequirements,
      targetUrl: targetUrl ? targetUrl.trim() : "",
      attachments: Array.isArray(attachments) ? attachments : [],
      priority: priority || "medium",
      deadline: validDeadline,
      estimatedBudget: { amount: Number(bAmt) || 0, currency: bCurr },
      status: "submitted",
    });

    const populated = await ServiceOrder.findById(order._id)
      .populate("clientId", "name email role organizationId")
      .lean();

    return res.status(201).json({
      success: true,
      message: `Service order ${orderNumber} submitted successfully.`,
      data: {
        order: populated,
        ...populated,
      },
    });
  } catch (err) {
    console.error("[ServiceOrder] Error creating order:", err);
    return res.status(500).json({
      success: false,
      error: err.message || "Failed to submit service order",
    });
  }
};

/**
 * 2. List Service Orders (Role Scoped)
 * GET /api/v1/service-orders
 */
export const listServiceOrders = async (req, res) => {
  try {
    const user = req.user;
    const { status, serviceType, priority, search } = req.query;

    const query = {};

    // Role-based isolation
    if (user.role === "client_owner" || user.role === "client_member") {
      query.$or = [
        { clientId: user._id },
        ...(user.organizationId ? [{ organizationId: user.organizationId }] : []),
      ];
    } else if (user.role === "developer") {
      query.$or = [
        { assignedLead: user._id },
        { assignedTeam: { $in: ["developer", "development"] } },
        { serviceType: "secure_development" },
      ];
    } else if (user.role === "security_engineer") {
      query.$or = [
        { assignedLead: user._id },
        { assignedTeam: { $in: ["security_engineer", "security_engineering"] } },
        { serviceType: "security_assessment" },
      ];
    } else if (user.role === "malware_analyst") {
      query.$or = [
        { assignedLead: user._id },
        { assignedTeam: { $in: ["malware_analyst", "malware_analysis"] } },
        { serviceType: "malware_analysis" },
      ];
    }

    if (status) query.status = status;
    if (serviceType) query.serviceType = serviceType;
    if (priority) query.priority = priority;

    if (search) {
      query.$and = query.$and || [];
      query.$and.push({
        $or: [
          { orderNumber: { $regex: search, $options: "i" } },
          { title: { $regex: search, $options: "i" } },
          { targetUrl: { $regex: search, $options: "i" } },
        ],
      });
    }

    const orders = await ServiceOrder.find(query)
      .sort({ createdAt: -1 })
      .populate("clientId", "name email role organizationId")
      .populate("organizationId", "name")
      .populate("assignedLead", "name email role")
      .populate("projectId", "projectCode status progress")
      .lean();

    return res.status(200).json({
      success: true,
      count: orders.length,
      data: orders,
    });
  } catch (err) {
    console.error("[ServiceOrder] Error listing orders:", err);
    return res.status(500).json({
      success: false,
      error: "Failed to retrieve service orders",
    });
  }
};

/**
 * 3. Get Service Order by ID
 * GET /api/v1/service-orders/:id
 */
export const getServiceOrderById = async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;

    const order = await ServiceOrder.findById(id)
      .populate("clientId", "name email role organizationId")
      .populate("assignedLead", "name email role")
      .populate("projectId")
      .populate("infoRequests.requestedBy", "name email role")
      .lean();

    if (!order) {
      return res.status(404).json({
        success: false,
        error: "Service order not found",
      });
    }

    // Access authorization check
    if (user.role === "client_owner" || user.role === "client_member") {
      const isOwner = String(order.clientId?._id || order.clientId) === String(user._id);
      const isSameOrg =
        user.organizationId &&
        String(order.organizationId) === String(user.organizationId);

      if (!isOwner && !isSameOrg) {
        return res.status(403).json({
          success: false,
          error: "You are not authorized to view this service order",
        });
      }
    }

    return res.status(200).json({
      success: true,
      data: order,
    });
  } catch (err) {
    console.error("[ServiceOrder] Error fetching order details:", err);
    return res.status(500).json({
      success: false,
      error: "Failed to retrieve service order details",
    });
  }
};

/**
 * 4. Update Service Order Status (Admin Review)
 * PATCH /api/v1/service-orders/:id/status
 */
export const updateServiceOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, rejectionReason, estimatedBudget } = req.body;

    const validStatuses = [
      "submitted",
      "under_review",
      "info_requested",
      "accepted",
      "rejected",
      "converted_to_project",
      "in_progress",
      "completed",
      "canceled",
    ];

    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
      });
    }

    const updateFields = { status };
    if (status === "rejected" && rejectionReason) {
      updateFields.rejectionReason = rejectionReason;
    }
    if (estimatedBudget) {
      updateFields.estimatedBudget = estimatedBudget;
    }

    const order = await ServiceOrder.findByIdAndUpdate(id, updateFields, {
      new: true,
    })
      .populate("clientId", "name email role")
      .populate("assignedLead", "name email role");

    if (!order) {
      return res.status(404).json({
        success: false,
        error: "Service order not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: `Order ${order.orderNumber} status updated to '${status}'`,
      data: order,
    });
  } catch (err) {
    console.error("[ServiceOrder] Error updating status:", err);
    return res.status(500).json({
      success: false,
      error: "Failed to update service order status",
    });
  }
};

/**
 * 5. Request Additional Information from Client (Admin RFI)
 * POST /api/v1/service-orders/:id/info-request
 */
export const requestOrderInfo = async (req, res) => {
  try {
    const { id } = req.params;
    const { question } = req.body;

    if (!question || !question.trim()) {
      return res.status(400).json({
        success: false,
        error: "Information request question is required",
      });
    }

    const order = await ServiceOrder.findById(id);
    if (!order) {
      return res.status(404).json({
        success: false,
        error: "Service order not found",
      });
    }

    order.infoRequests.push({
      requestedBy: req.user._id,
      question: question.trim(),
      createdAt: new Date(),
    });
    order.status = "info_requested";
    await order.save();

    const populated = await ServiceOrder.findById(order._id)
      .populate("clientId", "name email")
      .populate("infoRequests.requestedBy", "name email role");

    return res.status(200).json({
      success: true,
      message: "Information request submitted to client",
      data: populated,
    });
  } catch (err) {
    console.error("[ServiceOrder] Error requesting info:", err);
    return res.status(500).json({
      success: false,
      error: "Failed to submit information request",
    });
  }
};

/**
 * 6. Client Responds to Information Request (Client)
 * POST /api/v1/service-orders/:id/info-response
 */
export const respondOrderInfo = async (req, res) => {
  try {
    const { id } = req.params;
    const { requestId, response } = req.body;

    if (!response || !response.trim()) {
      return res.status(400).json({
        success: false,
        error: "Response content is required",
      });
    }

    const order = await ServiceOrder.findById(id);
    if (!order) {
      return res.status(404).json({
        success: false,
        error: "Service order not found",
      });
    }

    // Verify ownership
    if (
      String(order.clientId) !== String(req.user._id) &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({
        success: false,
        error: "You are not authorized to respond to this order inquiry",
      });
    }

    // Update specific RFI item or latest pending item
    let targetRfi = null;
    if (requestId) {
      targetRfi = order.infoRequests.id(requestId);
    } else {
      targetRfi = order.infoRequests[order.infoRequests.length - 1];
    }

    if (targetRfi) {
      targetRfi.response = response.trim();
      targetRfi.respondedAt = new Date();
    }

    order.status = "under_review";
    await order.save();

    return res.status(200).json({
      success: true,
      message: "Information response recorded. Order status returned to review.",
      data: order,
    });
  } catch (err) {
    console.error("[ServiceOrder] Error responding to info request:", err);
    return res.status(500).json({
      success: false,
      error: "Failed to record information response",
    });
  }
};

/**
 * 7. Assign Order Lead & Specialist Team (Admin)
 * POST /api/v1/service-orders/:id/assign
 */
export const assignOrderTeam = async (req, res) => {
  try {
    const { id } = req.params;
    const { assignedLead, assignedTeam } = req.body;

    const order = await ServiceOrder.findById(id);
    if (!order) {
      return res.status(404).json({
        success: false,
        error: "Service order not found",
      });
    }

    if (assignedLead) order.assignedLead = assignedLead;
    if (assignedTeam) order.assignedTeam = assignedTeam;

    await order.save();

    const populated = await ServiceOrder.findById(id)
      .populate("assignedLead", "name email role")
      .populate("clientId", "name email");

    return res.status(200).json({
      success: true,
      message: `Specialist team updated for ${order.orderNumber}`,
      data: populated,
    });
  } catch (err) {
    console.error("[ServiceOrder] Error assigning team:", err);
    return res.status(500).json({
      success: false,
      error: "Failed to assign team to service order",
    });
  }
};

/**
 * 8. Convert Accepted Service Order to Active Project (Admin)
 * POST /api/v1/service-orders/:id/convert-to-project
 */
export const convertToProject = async (req, res) => {
  try {
    const { id } = req.params;
    const order = await ServiceOrder.findById(id);

    if (!order) {
      return res.status(404).json({
        success: false,
        error: "Service order not found",
      });
    }

    if (order.projectId) {
      const existingProject = await ServiceProject.findById(order.projectId);
      if (existingProject) {
        return res.status(200).json({
          success: true,
          message: "Project workspace already active for this order",
          data: existingProject,
        });
      }
    }

    // Auto-generate project code
    const projectCount = await ServiceProject.countDocuments();
    const projectCode = `PRJ-${new Date().getFullYear()}-${String(projectCount + 1).padStart(4, "0")}`;

    const isDev = ["developer", "development"].includes(order.assignedTeam) || req.user.role === "developer";
    const isSec = ["security_engineer", "security_engineering"].includes(order.assignedTeam) || req.user.role === "security_engineer";
    const isMal = ["malware_analyst", "malware_analysis"].includes(order.assignedTeam) || req.user.role === "malware_analyst";

    const assignedDevelopers = [];
    if (order.assignedLead && (order.assignedTeam === "developer" || order.assignedTeam === "development")) {
      assignedDevelopers.push(order.assignedLead);
    }
    if (req.user.role === "developer" && !assignedDevelopers.some(id => String(id) === String(req.user._id))) {
      assignedDevelopers.push(req.user._id);
    }

    const assignedSecurityEngineers = [];
    if (order.assignedLead && (order.assignedTeam === "security_engineer" || order.assignedTeam === "security_engineering")) {
      assignedSecurityEngineers.push(order.assignedLead);
    }
    if (req.user.role === "security_engineer" && !assignedSecurityEngineers.some(id => String(id) === String(req.user._id))) {
      assignedSecurityEngineers.push(req.user._id);
    }

    const assignedMalwareAnalysts = [];
    if (order.assignedLead && (order.assignedTeam === "malware_analyst" || order.assignedTeam === "malware_analysis")) {
      assignedMalwareAnalysts.push(order.assignedLead);
    }
    if (req.user.role === "malware_analyst" && !assignedMalwareAnalysts.some(id => String(id) === String(req.user._id))) {
      assignedMalwareAnalysts.push(req.user._id);
    }

    const project = await ServiceProject.create({
      projectCode,
      orderId: order._id,
      organizationId: order.organizationId || null,
      clientOwnerId: order.clientId,
      title: order.title,
      description: order.description,
      projectType: isMal ? "malware_analysis" : order.serviceType,
      status:
        order.serviceType === "secure_development"
          ? "in_development"
          : "in_security_testing",
      progress: 10,
      deadline: order.deadline || null,
      assignedDevelopers,
      assignedSecurityEngineers,
      assignedMalwareAnalysts,
    });

    order.status = "converted_to_project";
    order.projectId = project._id;
    await order.save();

    const populatedProject = await ServiceProject.findById(project._id)
      .populate("clientOwnerId", "name email role")
      .populate("assignedDevelopers", "name email role")
      .populate("assignedSecurityEngineers", "name email role")
      .populate("assignedMalwareAnalysts", "name email role")
      .populate("orderId", "orderNumber serviceType priority");

    return res.status(201).json({
      success: true,
      message: `Service order ${order.orderNumber} successfully converted to project ${projectCode}`,
      data: populatedProject,
    });
  } catch (err) {
    console.error("[ServiceOrder] Error converting to project:", err);
    return res.status(500).json({
      success: false,
      error: "Failed to convert service order into project workspace",
    });
  }
};

