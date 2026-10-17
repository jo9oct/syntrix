// STATUS: UPDATED
// File: src/routes/scope.routes.js

import { Router } from "express";

import { protect } from "../middleware/auth.js";

import {
  requireOwner,
  requireOwnerMatch,
} from "../middleware/authorization.middleware.js";

import {
  createScopeController,
  listScopesController,
  getScopeController,
  updateScopeController,
  deleteScopeController,
} from "../controllers/scope.controller.js";

const router = Router();

// Require a verified, authenticated, active registered user.
router.use(protect);

// Derive the owner identity from the authenticated user.
// Never trust x-owner-id or other client-supplied owner IDs.
router.use((req, res, next) => {
  const ownerId = req.user?._id;

  if (!ownerId) {
    return res.status(401).json({
      error: {
        code: "AUTHENTICATION_REQUIRED",
        message: "Authentication is required.",
      },
    });
  }

  req.auth = {
    ownerId: String(ownerId),
    userType: "user",
  };

  return next();
});

// Enforce authenticated owner identity and ownership matching.
router.use(requireOwner);
router.use(requireOwnerMatch);

// Scope endpoints.
router.post("/", createScopeController);
router.get("/", listScopesController);
router.get("/:scopeId", getScopeController);
router.patch("/:scopeId", updateScopeController);
router.delete("/:scopeId", deleteScopeController);

export default router;