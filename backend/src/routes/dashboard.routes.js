// STATUS: UPDATED
// FILE: backend/src/routes/dashboard.routes.js

import { Router } from "express";
import { getUserDashboardStats } from "../controllers/dashboard.controller.js";
import { getAdminDashboardStats } from "../controllers/admin.controller.js";
import { protect, authorize } from "../middleware/auth.js";

const router = Router();

// Protect all dashboard endpoints with JWT/actor authentication
router.use(protect);

// User dashboard endpoint: accessible by any authenticated user for their own user ID
router.get("/user", getUserDashboardStats);

// Admin dashboard endpoint: accessible ONLY if user has admin role
router.get("/admin", authorize("admin"), getAdminDashboardStats);

export default router;
