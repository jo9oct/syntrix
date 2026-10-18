import bcrypt from "bcryptjs";
import { User } from "../models/User.js";
import { Organization } from "../models/Organization.js";

export const getUsers = async (req, res) => {
  try {
    const users = await User.find()
      .populate("organizationId", "name")
      .sort({ createdAt: -1 });

    const formatted = users.map((user) => ({
      id: String(user._id),
      name: user.name,
      email: user.email,
      role: user.role,
      org: user.organizationId?.name || "Sentrix Operations",
      status: user.isActive ? "active" : "suspended",
      lastLogin: user.lastLogin
        ? new Date(user.lastLogin).toLocaleDateString()
        : "Never",
      createdAt: user.createdAt,
    }));

    return res.status(200).json({
      success: true,
      count: formatted.length,
      data: formatted,
    });
  } catch (err) {
    console.error("[Admin] Failed to retrieve users:", err);

    return res.status(500).json({
      success: false,
      error: "Failed to retrieve users",
    });
  }
};

export const createUser = async (req, res) => {
  try {
    const { name, email, password, role, organization } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({
        success: false,
        error: "Please provide name, email, password, and role",
      });
    }

    const existing = await User.findOne({ email });

    if (existing) {
      return res.status(400).json({
        success: false,
        error: "User with this email already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    let orgId;

    if (organization) {
      let org = await Organization.findOne({ name: organization });

      if (!org) {
        org = await Organization.create({
          name: organization,
          ownerId: req.user?._id,
        });
      }

      orgId = org._id;
    } else {
      let defaultOrg = await Organization.findOne();
      if (!defaultOrg) {
        defaultOrg = await Organization.create({
          name: "Sentrix Operations",
          ownerId: req.user?._id,
        });
      }
      orgId = defaultOrg?._id;
    }

    const newUser = await User.create({
      name,
      email,
      password: hashedPassword,
      role,
      organizationId: orgId,
      isActive: true,
    });

    return res.status(201).json({
      success: true,
      data: {
        id: String(newUser._id),
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        org: organization || "Sentrix Operations",
        status: "active",
        lastLogin: "Never",
      },
    });
  } catch (err) {
    console.error("[Admin] Failed to create user:", err);

    return res.status(500).json({
      success: false,
      error: "Failed to create user",
    });
  }
};

export const toggleUserStatus = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found",
      });
    }

    user.isActive = !user.isActive;
    await user.save();

    return res.status(200).json({
      success: true,
      data: {
        id: String(user._id),
        status: user.isActive ? "active" : "suspended",
      },
    });
  } catch (err) {
    console.error("[Admin] Failed to update user status:", err);

    return res.status(500).json({
      success: false,
      error: "Failed to update user status",
    });
  }
};
