import express from "express";
import isAuthenticated from "../middleware/isAuthenticated.js";
import { optionalProtect } from "../middleware/auth.js";
import {
  AuthRegister,
  VerifyAuth,
  AuthLogin,
  checkAuth,
  Logout,
  deleteAccount,
  resendVerificationEmail,
  forgotPassword,
  resetPassword,
  updateProfile,
  changePassword,
  completeOnboarding,
} from "../controllers/auth.controller.js";

const router = express.Router();

router.post("/register", AuthRegister);
router.post("/verify", VerifyAuth);
router.post("/login", AuthLogin);
router.get("/check-auth", isAuthenticated, checkAuth);
router.get("/me", isAuthenticated, checkAuth);
router.post("/logout", isAuthenticated, Logout);
router.delete("/remove-account", isAuthenticated, deleteAccount);
router.delete("/delete-account", isAuthenticated, deleteAccount);
router.post(
  "/resend-verification-code",
  optionalProtect,
  resendVerificationEmail
);
router.post(
  "/resend-verification",
  optionalProtect,
  resendVerificationEmail
);
router.post("/forget-password", forgotPassword);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password/:token", resetPassword);
router.put("/update-profile/:id", isAuthenticated, updateProfile);
router.put("/update-profile/:_id", isAuthenticated, updateProfile);
router.put("/update-profile", isAuthenticated, updateProfile);
router.post("/change-password/:id", isAuthenticated, changePassword);
router.post("/change-password/:_id", isAuthenticated, changePassword);
router.post("/change-password", isAuthenticated, changePassword);
router.post("/onboarding", isAuthenticated, completeOnboarding);
router.put("/onboarding", isAuthenticated, completeOnboarding);

export default router;
