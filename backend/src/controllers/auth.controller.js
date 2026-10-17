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

export const register = async (req, res) => {
  try {
    const { name, email, password, organization } = req.body;

    if (!name || !email || !password || !organization) {
      return res.status(400).json({
        success: false,
        error: "Please provide name, email, password, and organization",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const existing = await User.findOne({ email: normalizedEmail });

    if (existing) {
      return res.status(400).json({
        success: false,
        error: "Email already registered",
      });
    }

    const hashed = await bcrypt.hash(password, 12);

    let org = await Organization.findOne({ name: organization });

    if (!org) {
      const tempUser = new User({
        name,
        email: normalizedEmail,
        password: hashed,
        role: "client_owner",
        isActive: true,
      });

      await tempUser.save();

      try {
        org = await Organization.create({
          name: organization,
          ownerId: tempUser._id,
          members: [
            {
              userId: tempUser._id,
              role: "owner",
            },
          ],
        });

        tempUser.organizationId = org._id;
        await tempUser.save();
      } catch (error) {
        await User.deleteOne({ _id: tempUser._id });
        throw error;
      }

      const token = signToken(String(tempUser._id));

      return res.status(201).json({
        success: true,
        data: {
          token,
          user: {
            id: tempUser._id,
            name: tempUser.name,
            email: tempUser.email,
            role: tempUser.role,
          },
        },
      });
    }

    const user = await User.create({
      name,
      email: normalizedEmail,
      password: hashed,
      role: "client_member",
      organizationId: org._id,
      isActive: true,
    });

    const token = signToken(String(user._id));

    return res.status(201).json({
      success: true,
      data: {
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      },
    });
  } catch (error) {
    console.error("[Auth] Registration failed:", error);

    return res.status(500).json({
      success: false,
      error: "Registration failed",
    });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
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

    return res.status(200).json({
      success: true,
      data: {
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          organizationId: user.organizationId,
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

export const getMe = async (req, res) => {
  return res.status(200).json({
    success: true,
    data: req.user,
  });
};
