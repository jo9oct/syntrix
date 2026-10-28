// STATUS: UPDATED
// FILE: src/routes/admin.routes.js

import { Router } from "express";
import {
  getAllUser,
  getUsers,
  updateUser,
  createUser,
  getClientPortalStatus,
  updateClientPortalStatus,
} from "../controllers/admin.controller.js";
import { protect, authorize } from "../middleware/auth.js";
import { validate } from "../middleware/validation.middleware.js";
import { createUserSchema } from "../validators/admin.validator.js";

const router = Router();

// All admin routes require authentication and the admin role.
router.use(protect);
router.use(authorize("admin"));

// User Management APIs - Get All Users & Create User
router
  .route("/users")
  .get(getAllUser)
  .post(validate(createUserSchema, "body"), createUser);

// Get All Users endpoint
router.get("/get-all-user", getAllUser);

// Update User (Role / Status) endpoints
router.put("/update-user/:id", updateUser);
router.put("/update-user/:_id", updateUser);

// Client Portal Services Availability Toggle API
router
  .route("/settings/client-portal")
  .get(getClientPortalStatus)
  .put(updateClientPortalStatus);

router
  .route("/admin/settings/client-portal")
  .get(getClientPortalStatus)
  .put(updateClientPortalStatus);

export default router;
