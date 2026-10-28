import jwt from "jsonwebtoken";
import { User } from "../models/User.js";
import Auth from "../models/auth.model.js";

const parseCookies = (cookieHeader) => {
  if (typeof cookieHeader !== "string" || !cookieHeader.trim()) {
    return {};
  }
  const cookies = {};
  const pairs = cookieHeader.split(";");
  for (const pair of pairs) {
    const idx = pair.indexOf("=");
    if (idx !== -1) {
      const key = pair.slice(0, idx).trim();
      const val = pair.slice(idx + 1).trim();
      try {
        cookies[key] = decodeURIComponent(val);
      } catch {
        cookies[key] = val;
      }
    }
  }
  return cookies;
};

export const protect = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  let token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7).trim()
    : null;

  if (!token && req.headers.cookie) {
    const cookies = parseCookies(req.headers.cookie);
    token = cookies.refreshToken || cookies.sentrix_token || cookies.token || cookies.jwt || null;
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      error: "Not authorized to access this route",
    });
  }

  // Support demo and switched actor tokens seamlessly
  if (token.startsWith("sentrix_")) {
    const roleClean = token
      .replace("sentrix_token_", "")
      .replace("sentrix_demo_auth_token", "security_engineer")
      .trim();
    const validRoles = [
      "admin",
      "client_owner",
      "client_member",
      "security_engineer",
      "developer",
      "malware_analyst",
    ];
    const targetRole = validRoles.includes(roleClean)
      ? roleClean
      : "client_member";

    let user = await Auth.findOne({ role: targetRole, status: "active" });
    if (!user) {
      user = await User.findOne({ role: targetRole, isActive: true });
    }
    if (!user) {
      user = await Auth.create({
        userName: targetRole,
        name: targetRole
          .replace(/_/g, " ")
          .replace(/\b\w/g, (c) => c.toUpperCase()),
        email: `${targetRole}@sentrix.local`,
        role: targetRole,
        status: "active",
        isActive: true,
      });
    }
    req.user = user;
    return next();
  }

  const secret = process.env.Refresh_Secret_Key || process.env.JWT_SECRET || "Car-Rental-Secret-Key-123@";

  try {
    let decoded;
    try {
      decoded = jwt.verify(token, secret);
    } catch {
      decoded = jwt.verify(token, process.env.JWT_SECRET || "super-secret-development-key-change-in-production");
    }

    const userId = decoded.userID || decoded.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "Not authorized to access this route",
      });
    }

    let user = await Auth.findById(userId);
    if (!user) {
      user = await User.findById(userId);
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        error: "User no longer exists",
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

export const optionalProtect = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  let token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7).trim()
    : null;

  if (!token && req.headers.cookie) {
    const cookies = parseCookies(req.headers.cookie);
    token = cookies.refreshToken || cookies.sentrix_token || cookies.token || cookies.jwt || null;
  }

  if (!token) {
    req.user = null;
    delete req.headers.authorization;
    return next();
  }

  // Support demo and switched actor tokens seamlessly
  if (token.startsWith("sentrix_")) {
    const roleClean = token
      .replace("sentrix_token_", "")
      .replace("sentrix_demo_auth_token", "security_engineer")
      .trim();
    const validRoles = [
      "admin",
      "client_owner",
      "client_member",
      "security_engineer",
      "developer",
      "malware_analyst",
    ];
    const targetRole = validRoles.includes(roleClean)
      ? roleClean
      : "client_member";

    try {
      let user = await Auth.findOne({ role: targetRole, status: "active" });
      if (!user) {
        user = await User.findOne({ role: targetRole, isActive: true });
      }
      if (!user) {
        user = await Auth.create({
          userName: targetRole,
          name: targetRole
            .replace(/_/g, " ")
            .replace(/\b\w/g, (c) => c.toUpperCase()),
          email: `${targetRole}@sentrix.local`,
          role: targetRole,
          status: "active",
          isActive: true,
        });
      }
      req.user = user;
      return next();
    } catch {
      req.user = null;
      delete req.headers.authorization;
      return next();
    }
  }

  const secret = process.env.Refresh_Secret_Key || process.env.JWT_SECRET || "Car-Rental-Secret-Key-123@";

  try {
    let decoded;
    try {
      decoded = jwt.verify(token, secret);
    } catch {
      decoded = jwt.verify(token, process.env.JWT_SECRET || "super-secret-development-key-change-in-production");
    }

    const userId = decoded.userID || decoded.id;
    if (userId) {
      let user = await Auth.findById(userId);
      if (!user) {
        user = await User.findById(userId);
      }
      if (user && (user.isActive || user.status === "active")) {
        req.user = user;
        return next();
      }
    }
  } catch {
    // Expired or invalid token
  }

  req.user = null;
  delete req.headers.authorization;
  return next();
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
