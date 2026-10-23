import { ProjectTask } from "../models/ProjectTask.js";
import { ServiceProject } from "../models/ServiceProject.js";

/**
 * 1. List Tasks for a Project or User
 * GET /api/v1/project-tasks
 */
export const listProjectTasks = async (req, res) => {
  try {
    const { projectId, status, taskType, assignedTo } = req.query;

    const query = {};
    if (projectId) query.projectId = projectId;
    if (status) query.status = status;
    if (taskType) query.taskType = taskType;
    if (assignedTo) query.assignedTo = assignedTo;

    // Specialist users can view assigned tasks or tasks in projects they belong to
    if (req.user.role === "developer" && !projectId) {
      query.$or = [{ assignedTo: req.user._id }, { taskType: "vulnerability_fix" }];
    } else if (req.user.role === "security_engineer" && !projectId) {
      query.$or = [{ assignedTo: req.user._id }, { taskType: "security_audit" }];
    }

    const tasks = await ProjectTask.find(query)
      .sort({ createdAt: -1 })
      .populate("assignedTo", "name email role")
      .populate("createdBy", "name email role")
      .populate("findingId", "title severity status scannerId")
      .lean();

    return res.status(200).json({
      success: true,
      count: tasks.length,
      data: tasks,
    });
  } catch (err) {
    console.error("[ProjectTask] Error listing tasks:", err);
    return res.status(500).json({
      success: false,
      error: "Failed to retrieve project tasks",
    });
  }
};

/**
 * 2. Create Project Task (Admin, Developer, Security Engineer)
 * POST /api/v1/project-tasks
 */
export const createProjectTask = async (req, res) => {
  try {
    const {
      projectId,
      title,
      description,
      taskType,
      status,
      priority,
      assignedTo,
      dueDate,
      findingId,
    } = req.body;

    if (!projectId || !title) {
      return res.status(400).json({
        success: false,
        error: "projectId and title are required fields",
      });
    }

    const project = await ServiceProject.findById(projectId);
    if (!project) {
      return res.status(404).json({
        success: false,
        error: "Parent service project not found",
      });
    }

    const task = await ProjectTask.create({
      projectId,
      title: title.trim(),
      description: description || "",
      taskType: taskType || "development",
      status: status || "todo",
      priority: priority || "medium",
      assignedTo: assignedTo || null,
      createdBy: req.user._id,
      dueDate: dueDate ? new Date(dueDate) : null,
      findingId: findingId || null,
    });

    const populated = await ProjectTask.findById(task._id)
      .populate("assignedTo", "name email role")
      .populate("createdBy", "name email role")
      .populate("findingId", "title severity status");

    return res.status(201).json({
      success: true,
      message: "Project task created successfully",
      data: populated,
    });
  } catch (err) {
    console.error("[ProjectTask] Error creating task:", err);
    return res.status(500).json({
      success: false,
      error: "Failed to create project task",
    });
  }
};

/**
 * 3. Get Project Task by ID
 * GET /api/v1/project-tasks/:id
 */
export const getProjectTaskById = async (req, res) => {
  try {
    const { id } = req.params;

    const task = await ProjectTask.findById(id)
      .populate("assignedTo", "name email role")
      .populate("createdBy", "name email role")
      .populate("findingId")
      .populate("comments.authorId", "name email role")
      .lean();

    if (!task) {
      return res.status(404).json({
        success: false,
        error: "Project task not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: task,
    });
  } catch (err) {
    console.error("[ProjectTask] Error fetching task:", err);
    return res.status(500).json({
      success: false,
      error: "Failed to retrieve project task",
    });
  }
};

/**
 * 4. Update Project Task Status & Details
 * PATCH /api/v1/project-tasks/:id
 */
export const updateProjectTask = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, status, priority, assignedTo, dueDate, findingId } =
      req.body;

    const updateFields = {};
    if (title) updateFields.title = title.trim();
    if (description !== undefined) updateFields.description = description;
    if (status) updateFields.status = status;
    if (priority) updateFields.priority = priority;
    if (assignedTo !== undefined) updateFields.assignedTo = assignedTo;
    if (dueDate) updateFields.dueDate = new Date(dueDate);
    if (findingId !== undefined) updateFields.findingId = findingId;

    const task = await ProjectTask.findByIdAndUpdate(id, updateFields, {
      new: true,
    })
      .populate("assignedTo", "name email role")
      .populate("createdBy", "name email role")
      .populate("findingId", "title severity status");

    if (!task) {
      return res.status(404).json({
        success: false,
        error: "Project task not found",
      });
    }

    // Automatically recalculate project progress if status changes
    if (status && task.projectId) {
      const allTasks = await ProjectTask.find({ projectId: task.projectId });
      if (allTasks.length > 0) {
        const doneTasks = allTasks.filter((t) => t.status === "done").length;
        const progress = Math.round((doneTasks / allTasks.length) * 100);
        await ServiceProject.findByIdAndUpdate(task.projectId, { progress });
      }
    }

    return res.status(200).json({
      success: true,
      message: "Task updated successfully",
      data: task,
    });
  } catch (err) {
    console.error("[ProjectTask] Error updating task:", err);
    return res.status(500).json({
      success: false,
      error: "Failed to update project task",
    });
  }
};

/**
 * 5. Add Collaboration Comment to Task
 * POST /api/v1/project-tasks/:id/comments
 */
export const addProjectTaskComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { message, attachments } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({
        success: false,
        error: "Comment message is required",
      });
    }

    const task = await ProjectTask.findById(id);
    if (!task) {
      return res.status(404).json({
        success: false,
        error: "Project task not found",
      });
    }

    task.comments.push({
      authorId: req.user._id,
      authorName: req.user.name,
      authorRole: req.user.role,
      message: message.trim(),
      attachments: attachments || [],
      createdAt: new Date(),
    });

    await task.save();

    const updatedTask = await ProjectTask.findById(id)
      .populate("comments.authorId", "name email role")
      .lean();

    return res.status(201).json({
      success: true,
      message: "Comment added successfully",
      data: updatedTask.comments[updatedTask.comments.length - 1],
    });
  } catch (err) {
    console.error("[ProjectTask] Error adding comment:", err);
    return res.status(500).json({
      success: false,
      error: "Failed to add comment to project task",
    });
  }
};

