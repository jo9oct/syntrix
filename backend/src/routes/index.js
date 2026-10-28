import { Router } from "express";
import authRoutes from "./auth.route.js";
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
      payment: "/api/payment",
    },
  });
});

router.use("/auth", authRoutes);
router.use("/admin", adminRoutes);
router.use("/payment", paymentRoutes);

export default router;
