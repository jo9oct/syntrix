import { Router } from "express";
import {
  getUsers,
  createUser,
  toggleUserStatus,
} from "../controllers/admin.controller.js";
import { protect, authorize } from "../middleware/auth.js";

const router = Router();

// All admin routes require authentication and the admin role.
router.use(protect);
router.use(authorize("admin"));

router.route("/users").get(getUsers).post(createUser);

router.route("/users/:id/status").put(toggleUserStatus);

export default router;
