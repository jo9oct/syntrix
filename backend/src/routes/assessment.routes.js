import { Router } from "express";
import {
  getAssessments,
  startAssessment,
  getAssessment,
} from "../controllers/assessment.controller.js";
import { protect, authorize } from "../middleware/auth.js";

const router = Router();

router.use(protect);

router
  .route("/")
  .get(getAssessments)
  .post(authorize("admin", "security_engineer"), startAssessment);

router.route("/:id").get(getAssessment);

export default router;
