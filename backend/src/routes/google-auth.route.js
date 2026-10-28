import express from "express";
import passport from "passport";
import isAuthenticated from "../middleware/isAuthenticated.js";
import {
  googleCallback,
  Profile,
  fail,
  isGoogleConfigured,
} from "../controllers/google-auth.controller.js";

const route = express.Router();

const initiateGoogleAuth = (req, res, next) => {
  if (!isGoogleConfigured()) {
    return res.status(503).json({
      success: false,
      message: "Google OAuth is not configured on this server.",
    });
  }

  const returnUrl = req.query.returnUrl || req.headers.referer || "";
  const state = returnUrl
    ? Buffer.from(JSON.stringify({ returnUrl })).toString("base64")
    : undefined;

  passport.authenticate("google", {
    scope: ["email", "profile"],
    state,
  })(req, res, next);
};

const handleGoogleCallback = (req, res, next) => {
  passport.authenticate("google", {
    session: false,
    failureRedirect: "/auth/google/fail",
  })(req, res, next);
};

// Initiation endpoints: support direct root of mounted router, /google, and /auth/google
route.get("/", initiateGoogleAuth);
route.get("/google", initiateGoogleAuth);
route.get("/auth/google", initiateGoogleAuth);

// Callback endpoints: support /callback, /google/callback, /auth/google/callback
route.get("/callback", handleGoogleCallback, googleCallback);
route.get("/google/callback", handleGoogleCallback, googleCallback);
route.get("/auth/google/callback", handleGoogleCallback, googleCallback);

// Profile and Failure endpoints
route.get("/profile", isAuthenticated, Profile);
route.get("/fail", fail);
route.get("/auth/google/fail", fail);

export default route;
