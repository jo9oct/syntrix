import { Router } from "express";
import {
  createServiceOrder,
  listServiceOrders,
  getServiceOrderById,
  updateServiceOrderStatus,
  requestOrderInfo,
  respondOrderInfo,
  assignOrderTeam,
  convertToProject,
  addOrderComment,
  getOrderComments,
} from "../controllers/serviceOrder.controller.js";
import { getClientPortalStatus, updateClientPortalStatus } from "../controllers/admin.controller.js";
import { protect, authorize } from "../middleware/auth.js";

const router = Router();

// 0. Client Portal Status check (public so client tabs can query immediately)
router.get("/portal-status", getClientPortalStatus);
router.put("/portal-status", protect, authorize("admin"), updateClientPortalStatus);

// Require authentication for all service order operations
router.use(protect);

// 1. Submit and List orders
router.route("/")
  .post(createServiceOrder)
  .get(listServiceOrders);

// 2. Order details
router.route("/:id")
  .get(getServiceOrderById);

// 3. Status update (Admin or assigned specialist accepting/starting work)
router.patch("/:id/status", authorize("admin", "developer", "security_engineer", "malware_analyst"), updateServiceOrderStatus);

// 4. Admin Request for Information (RFI)
router.post("/:id/info-request", authorize("admin"), requestOrderInfo);

// 5. Client response to RFI
router.post("/:id/info-response", authorize("client_owner", "client_member", "admin"), respondOrderInfo);

// 6. Admin assigns specialist team
router.post("/:id/assign", authorize("admin"), assignOrderTeam);

// 7. Convert approved order to active project (Admin or assigned specialist)
router.post("/:id/convert-to-project", authorize("admin", "developer", "security_engineer", "malware_analyst"), convertToProject);

// 8. Order comments / communication thread (Admin, Specialist, and Client User)
router.route("/:id/comments")
  .get(getOrderComments)
  .post(addOrderComment);

export default router;

