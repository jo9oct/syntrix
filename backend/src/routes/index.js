import { Router } from "express";
import authRoutes from "./auth.routes.js";
import projectRoutes from "./projects.routes.js";
import malwareRoutes from "./malware.routes.js";
import assessmentRoutes from "./assessment.routes.js";
import paymentRoutes from "./payment.routes.js";
import adminRoutes from "./admin.routes.js";

const router = Router();

router.get("/", (req, res) => {
  res.status(200).json({
    status: "ok",
    service: "sentrix-cybersecurity-platform-api",
    version: "1.0.0",
    endpoints: {
      health: "/api/health",
      auth: "/api/auth",
      admin: "/api/admin",
      projects: "/api/projects",
      malware: "/api/malware",
      assessments: "/api/assessments",
      payment: "/api/payment",
    },
  });
});

router.use("/auth", authRoutes);
router.use("/admin", adminRoutes);
router.use("/projects", projectRoutes);
router.use("/malware", malwareRoutes);
router.use("/assessments", assessmentRoutes);
router.use("/payment", paymentRoutes);

export default router;
