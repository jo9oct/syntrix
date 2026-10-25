/*
 * STATUS: UPDATED
 * File: src/controllers/auth.controller.js
 */

import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { User } from "../models/User.js";
import { Organization } from "../models/Organization.js";

const signToken = (id) => {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error("JWT_SECRET is not configured");
  }

  return jwt.sign({ id }, secret, {
    expiresIn: "7d",
  });
};

const normalizeOrganizationName = (value) => {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();

  if (!normalized || normalized.toLowerCase() === "null") {
    return null;
  }

  return normalized;
};

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const setAuthCookie = (res, token) => {
  const isProduction = process.env.NODE_ENV === "production";
  res.cookie("sentrix_token", token, {
    httpOnly: false,
    secure: isProduction,
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: "/",
  });
};

const createAuthResponse = (user, statusCode, res) => {
  const token = signToken(String(user._id));

  setAuthCookie(res, token);

  return res.status(statusCode).json({
    success: true,
    data: {
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        organizationId: user.organizationId ?? null,
      },
    },
  });
};

export const register = async (req, res) => {
  let createdUserId = null;

  try {
    const { name, email, password, organization, role } = req.body;

    if (
      typeof name !== "string" ||
      !name.trim() ||
      typeof email !== "string" ||
      !email.trim() ||
      typeof password !== "string" ||
      !password
    ) {
      return res.status(400).json({
        success: false,
        error: "Please provide name, email, and password",
      });
    }

    const normalizedName = name.trim();
    const normalizedEmail = email.trim().toLowerCase();
    const organizationName = normalizeOrganizationName(organization);

    const validRoles = [
      "admin",
      "security_engineer",
      "developer",
      "malware_analyst",
      "client_owner",
      "client_member",
    ];
    const normalizedRole =
      typeof role === "string"
        ? role.trim().toLowerCase().replace(/\s+/g, "_")
        : null;
    const requestedRole = validRoles.includes(normalizedRole)
      ? normalizedRole
      : null;

    const existingUser = await User.findOne({
      email: normalizedEmail,
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: "Email already registered",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    // No company: register as a member without an organization.
    if (!organizationName) {
      const user = await User.create({
        name: normalizedName,
        email: normalizedEmail,
        password: hashedPassword,
        role: requestedRole || "client_member",
        isActive: true,
      });

      createdUserId = user._id;

      return createAuthResponse(user, 201, res);
    }

    // Match existing organization names without case sensitivity.
    const organizationRegex = new RegExp(
      `^${escapeRegex(organizationName)}$`,
      "i",
    );

    let org = await Organization.findOne({
      name: organizationRegex,
    });

    // Existing company: register as a member.
    if (org) {
      const user = await User.create({
        name: normalizedName,
        email: normalizedEmail,
        password: hashedPassword,
        role: requestedRole || "client_member",
        organizationId: org._id,
        isActive: true,
      });

      createdUserId = user._id;

      try {
        if (!Array.isArray(org.members)) {
          org.members = [];
        }

        org.members.push({
          userId: user._id,
          role: "member",
        });

        await org.save();
      } catch (error) {
        await User.deleteOne({ _id: user._id });
        createdUserId = null;
        throw error;
      }

      return createAuthResponse(user, 201, res);
    }

    // New company: create the user as its owner.
    const owner = await User.create({
      name: normalizedName,
      email: normalizedEmail,
      password: hashedPassword,
      role: requestedRole || "client_owner",
      isActive: true,
    });

    createdUserId = owner._id;

    try {
      org = await Organization.create({
        name: organizationName,
        ownerId: owner._id,
        members: [
          {
            userId: owner._id,
            role: "owner",
          },
        ],
      });

      owner.organizationId = org._id;
      await owner.save();
    } catch (error) {
      await Organization.deleteOne({
        ownerId: owner._id,
        _id: org?._id,
      }).catch(() => {});

      await User.deleteOne({ _id: owner._id });
      createdUserId = null;

      throw error;
    }

    return createAuthResponse(owner, 201, res);
  } catch (error) {
    console.error("[Auth] Registration failed:", error);

    // Clean up a user left behind by an unexpected registration failure.
    if (createdUserId) {
      await User.deleteOne({ _id: createdUserId }).catch(() => {});
    }

    if (error?.code === 11000) {
      return res.status(409).json({
        success: false,
        error: "Email or organization already exists",
      });
    }

    return res.status(500).json({
      success: false,
      error: "Registration failed",
    });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (
      typeof email !== "string" ||
      !email.trim() ||
      typeof password !== "string" ||
      !password
    ) {
      return res.status(400).json({
        success: false,
        error: "Please provide email and password",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const user = await User.findOne({
      email: normalizedEmail,
    }).select("+password");

    if (!user || !user.password) {
      return res.status(401).json({
        success: false,
        error: "Invalid credentials",
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        error: "Account is suspended",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: "Invalid credentials",
      });
    }

    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    const token = signToken(String(user._id));

    setAuthCookie(res, token);

    return res.status(200).json({
      success: true,
      data: {
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          organizationId: user.organizationId ?? null,
        },
      },
    });
  } catch (error) {
    console.error("[Auth] Login failed:", error);

    return res.status(500).json({
      success: false,
      error: "Login failed",
    });
  }
};

export const logout = async (req, res) => {
  const isProduction = process.env.NODE_ENV === "production";
  res.clearCookie("sentrix_token", {
    path: "/",
    secure: isProduction,
    sameSite: "lax",
  });

  return res.status(200).json({
    success: true,
    message: "Logged out successfully",
  });
};

export const getMe = async (req, res) => {
  return res.status(200).json({
    success: true,
    data: req.user,
  });
};
