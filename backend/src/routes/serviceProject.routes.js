import { Router } from "express";
import {
  listServiceProjects,
  getServiceProjectById,
  updateProjectPhase,
  assignProjectTeam,
  submitForSecurityTesting,
  rejectToDevelopment,
  submitDeliverable,
  deleteDeliverable,
  deliverProjectToClient,
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
router.patch("/:id/phase", authorize("admin", "developer", "security_engineer", "malware_analyst"), updateProjectPhase);

// 4. Admin assigns project specialists
router.patch("/:id/assign", authorize("admin"), assignProjectTeam);

// 5. Developer submits work for security testing
router.post("/:id/submit-for-testing", authorize("developer", "admin"), submitForSecurityTesting);

// 5b. Security tester returns project to developer with feedback & attachments
router.post("/:id/reject-to-development", authorize("security_engineer", "admin"), rejectToDevelopment);
router.post("/:id/return-to-developer", authorize("security_engineer", "admin"), rejectToDevelopment);

// 6. Attach deliverable URL / repository
router.post("/:id/deliverables", authorize("developer", "security_engineer", "malware_analyst", "admin"), submitDeliverable);
router.post("/:id/deliverable", authorize("developer", "security_engineer", "malware_analyst", "admin"), submitDeliverable);
// Delete deliverable (admin & specialists only, hidden from client)
router.delete("/:id/deliverables/:deliverableId", authorize("developer", "security_engineer", "malware_analyst", "admin"), deleteDeliverable);
router.delete("/:id/deliverable/:deliverableId", authorize("developer", "security_engineer", "malware_analyst", "admin"), deleteDeliverable);

// Deliver project to client (Admin only)
router.post("/:id/deliver", authorize("admin"), deliverProjectToClient);
router.post("/:id/deliver-to-client", authorize("admin"), deliverProjectToClient);

// 7. Security lead technical approval
router.post("/:id/security-signoff", authorize("security_engineer", "admin"), securitySignOff);

// 8. Admin operations final delivery approval
router.post("/:id/admin-approval", authorize("admin"), adminApproval);

// 9. Client confirms delivery acceptance
router.post("/:id/client-acceptance", authorize("client_owner", "admin"), clientAcceptance);

export default router;

