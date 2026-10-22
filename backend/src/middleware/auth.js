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

  // Support demo and switched actor tokens seamlessly
  if (token.startsWith("sentrix_")) {
    const roleClean = token.replace("sentrix_token_", "").replace("sentrix_demo_auth_token", "security_engineer").trim();
    const validRoles = ["admin", "client_owner", "client_member", "security_engineer", "developer", "malware_analyst"];
    const targetRole = validRoles.includes(roleClean) ? roleClean : "client_member";

    let user = await User.findOne({ role: targetRole, isActive: true });
    if (!user) {
      user = await User.create({
        name: targetRole.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
        email: `${targetRole}@sentrix.local`,
        role: targetRole,
        isActive: true,
      });
    }
    req.user = user;
    return next();
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
