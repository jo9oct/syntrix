import jwt from "jsonwebtoken";
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

const isAuthenticated = async (req, res, next) => {
  try {
    let token = null;

    if (req.cookies && (req.cookies.refreshToken || req.cookies.token)) {
      token = req.cookies.refreshToken || req.cookies.token;
    } else if (req.headers.cookie) {
      const cookies = parseCookies(req.headers.cookie);
      token = cookies.refreshToken || cookies.token || cookies.sentrix_token;
    }

    if (!token && req.headers.authorization?.startsWith("Bearer ")) {
      token = req.headers.authorization.slice(7).trim();
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized - no token provided",
      });
    }

    const secret =
      process.env.Refresh_Secret_Key ||
      process.env.JWT_SECRET ||
      "Car-Rental-Secret-Key-123@";

    let decoded;
    try {
      decoded = jwt.verify(token, secret);
    } catch {
      try {
        decoded = jwt.verify(
          token,
          process.env.JWT_SECRET || "Car-Rental-Secret-Key-123@"
        );
      } catch {
        return res.status(401).json({
          success: false,
          message: "Invalid or expired token",
        });
      }
    }

    const userId = decoded.userID || decoded.id;
    const user = await Auth.findById(userId).select("-password");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found",
      });
    }

    req.user = user;
    next();
  } catch (err) {
    console.error("Auth middleware error:", err);
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    });
  }
};

export default isAuthenticated;
