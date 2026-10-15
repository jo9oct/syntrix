import { Router } from "express";

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

// Scope management requires an explicit owner identity.
// Do not run guest-session authorization on these routes.
router.use((req, res, next) => {
  const ownerId = req.headers["x-owner-id"];

  if (typeof ownerId !== "string" || !ownerId.trim()) {
    return res.status(401).json({
      error: {
        code: "AUTHENTICATION_REQUIRED",
        message: "The x-owner-id header is required.",
      },
    });
  }

  req.auth = {
    ownerId: ownerId.trim(),
    userType: "user",
  };

  return next();
});

router.use(requireOwner);
router.use(requireOwnerMatch);

router.post("/", createScopeController);
router.get("/", listScopesController);
router.get("/:scopeId", getScopeController);
router.patch("/:scopeId", updateScopeController);
router.delete("/:scopeId", deleteScopeController);

export default router;
