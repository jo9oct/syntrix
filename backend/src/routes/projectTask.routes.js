import { Router } from "express";
import {
  listProjectTasks,
  createProjectTask,
  getProjectTaskById,
  updateProjectTask,
  addProjectTaskComment,
} from "../controllers/projectTask.controller.js";
import { protect, authorize } from "../middleware/auth.js";

const router = Router();

// Require authentication for all task operations
router.use(protect);

// 1. List and create tasks
router.route("/")
  .get(listProjectTasks)
  .post(authorize("admin", "developer", "security_engineer", "malware_analyst", "client_owner"), createProjectTask);

// 2. Task details and updates
router.route("/:id")
  .get(getProjectTaskById)
  .patch(authorize("admin", "developer", "security_engineer", "malware_analyst", "client_owner"), updateProjectTask);

// 3. Discussion comments
router.post("/:id/comments", addProjectTaskComment);

export default router;

