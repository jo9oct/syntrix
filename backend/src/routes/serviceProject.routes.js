import { Router } from "express";
import {
  listServiceProjects,
  getServiceProjectById,
  updateProjectPhase,
  assignProjectTeam,
  submitForSecurityTesting,
  submitDeliverable,
  securitySignOff,
  adminApproval,
  clientAcceptance,
} from "../controllers/serviceProject.controller.js";
import { protect, authorize } from "../middleware/auth.js";

const router = Router();

// Require authentication for all project operations
router.use(protect);

// 1. List projects
router.get("/", listServiceProjects);

// 2. Project details
router.get("/:id", getServiceProjectById);

// 3. Update project phase / progress
router.patch("/:id/phase", authorize("admin", "developer", "security_engineer"), updateProjectPhase);

// 4. Admin assigns project specialists
router.patch("/:id/assign", authorize("admin"), assignProjectTeam);

// 5. Developer submits work for security testing
router.post("/:id/submit-for-testing", authorize("developer", "admin"), submitForSecurityTesting);

// 6. Attach deliverable URL / repository
router.post("/:id/deliverables", authorize("developer", "security_engineer", "admin"), submitDeliverable);

// 7. Security lead technical approval
router.post("/:id/security-signoff", authorize("security_engineer", "admin"), securitySignOff);

// 8. Admin operations final delivery approval
router.post("/:id/admin-approval", authorize("admin"), adminApproval);

// 9. Client confirms delivery acceptance
router.post("/:id/client-acceptance", authorize("client_owner", "admin"), clientAcceptance);

export default router;

