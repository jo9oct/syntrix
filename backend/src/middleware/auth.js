import jwt from "jsonwebtoken";
import { User } from "../models/User.js";

export const protect = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7).trim()
    : null;

  if (!token) {
    return res.status(401).json({
      success: false,
      error: "Not authorized to access this route",
    });
  }

  const secret = process.env.JWT_SECRET;

  if (!secret) {
    console.error("[Auth] JWT_SECRET is not configured.");

    return res.status(500).json({
      success: false,
      error: "Authentication service is not configured",
    });
  }

  try {
    const decoded = jwt.verify(token, secret);

    if (typeof decoded !== "object" || !decoded.id) {
      return res.status(401).json({
        success: false,
        error: "Not authorized to access this route",
      });
    }

    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({
        success: false,
        error: "User no longer exists",
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        error: "Account is suspended",
      });
    }

    req.user = user;

    return next();
  } catch {
    return res.status(401).json({
      success: false,
      error: "Not authorized to access this route",
    });
  }
};

export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: `User role ${req.user?.role || "unknown"} is not authorized to access this route`,
      });
    }

    return next();
  };
};
