// STATUS: UPDATED
// FILE: src/routes/admin.routes.js

import { Router } from "express";
import {
  getUsers,
  createUser,
  toggleUserStatus,
  updateUserRole,
  getClientPortalStatus,
  updateClientPortalStatus,
} from "../controllers/admin.controller.js";
import { protect, authorize } from "../middleware/auth.js";
import { validate } from "../middleware/validation.middleware.js";
import {
  createUserSchema,
  updateUserRoleSchema,
  userIdParamSchema,
} from "../validators/admin.validator.js";

const router = Router();

// All admin routes require authentication and the admin role.
router.use(protect);
router.use(authorize("admin"));

// User Management APIs
router
  .route("/users")
  .get(getUsers)
  .post(validate(createUserSchema, "body"), createUser);

// User Status Toggle API
router
  .route("/users/:id/status")
  .put(validate(userIdParamSchema, "params"), toggleUserStatus);

// User Role Update APIs (PUT & PATCH)
router
  .route("/users/:id/role")
  .put(
    validate(userIdParamSchema, "params"),
    validate(updateUserRoleSchema, "body"),
    updateUserRole,
  )
  .patch(
    validate(userIdParamSchema, "params"),
    validate(updateUserRoleSchema, "body"),
    updateUserRole,
  );

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
