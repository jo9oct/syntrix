import bcrypt from "bcryptjs";
import crypto from "crypto";
import Auth from "../models/auth.model.js";
import { Organization } from "../models/Organization.js";
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  changePasswordSchema,
  resetPasswordSchema,
  validatePasswordComplexity,
} from "../validators/auth.validation.js";
import generateTokenAndSetCookie from "../utils/token.utils.js";
import { sanitizeObject } from "../utils/sanitize.utils.js";
import {
  sendVerificationEmail,
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendResetSuccessEmail,
} from "../email/emails.js";

export const AuthRegister = async (req, res) => {
  // Sanitize all input fields using sanitizeObject
  const sanitizedData = sanitizeObject(req.body);
  const name = sanitizedData.name || sanitizedData.userName;
  let userName =
    sanitizedData.userName ||
    (sanitizedData.name
      ? sanitizedData.name.trim().replace(/\s+/g, "_").toLowerCase()
      : null) ||
    sanitizedData.email?.split("@")[0];
  const email = sanitizedData.email?.toLowerCase().trim();
  const password = sanitizedData.password;

  // Validate sanitized input with Joi
  const { error } = registerSchema.validate({
    ...sanitizedData,
    userName,
    name,
    email,
    password,
  });

  if (error) {
    const errorMsg = error.details?.[0]?.message || error.message;
    console.error("Validation error:", errorMsg);
    return res.status(400).json({ success: false, message: errorMsg });
  }

  try {
    const exitingUser = await Auth.findOne({ email });

    if (exitingUser) {
      return res
        .status(400)
        .json({ success: false, message: "User already exists" });
    }

    if (!sanitizedData.userName) {
      const exitingUserName = await Auth.findOne({ userName });
      if (exitingUserName) {
        userName = `${userName}_${Math.floor(1000 + Math.random() * 9000)}`;
      }
    } else {
      const exitingUserName = await Auth.findOne({ userName });
      if (exitingUserName) {
        return res
          .status(400)
          .json({ success: false, message: "UserName already taken" });
      }
    }

    // Role and owner status determined strictly by company / organization name:
    // - No company name entered -> client_member (isOwner: false)
    // - Company name entered and already registered before -> client_member (isOwner: false)
    // - Company name entered and NOT registered before -> client_owner (isOwner: true)
    const rawOrg =
      sanitizedData.organization ||
      sanitizedData.company ||
      sanitizedData.companyName ||
      "";
    const orgName = typeof rawOrg === "string" ? rawOrg.trim() : "";

    let role = "client_member";
    let isOwner = false;
    let organizationId = null;
    let finalOrgName = orgName;

    if (orgName) {
      const safeOrgRegex = new RegExp(
        `^${orgName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
        "i"
      );

      const existingOrg = await Organization.findOne({ name: safeOrgRegex });
      const existingAuthWithOrg = await Auth.findOne({
        organization: safeOrgRegex,
      });

      if (!existingOrg && !existingAuthWithOrg) {
        // Company name not registered before -> Take as client_owner
        role = "client_owner";
        isOwner = true;
      } else {
        // Company name is already registered before -> Take as client_member
        role = "client_member";
        isOwner = false;
        if (existingOrg) {
          organizationId = existingOrg._id;
          finalOrgName = existingOrg.name;
        }
      }
    } else {
      // No company name provided -> client_member
      role = "client_member";
      isOwner = false;
      finalOrgName = "";
    }

    const verificationToken = Math.floor(
      100000 + Math.random() * 900000
    ).toString();
    console.log("DEV VERIFICATION TOKEN:", verificationToken); // For testing without email
    const verificationTokenExpiresAt = new Date(
      Date.now() + 1 * 60 * 60 * 1000
    );
    const hashedPassword = await bcrypt.hash(password, 10);

    const newAuth = new Auth({
      userName,
      name,
      email,
      password: hashedPassword,
      role,
      organization: finalOrgName,
      organizationId,
      isOwner,
      organizationOnboarded: true,
      isSecurityResponsible: Boolean(sanitizedData.isSecurityResponsible),
      status: "inactive",
      isVerified: false,
      verificationToken,
      verificationTokenExpiresAt,
      verificationAttempts: 0,
    });

    await newAuth.save();

    // If new organization was registered, create Organization document
    if (isOwner && finalOrgName) {
      try {
        const createdOrg = await Organization.create({
          name: finalOrgName,
          ownerId: newAuth._id,
          members: [
            {
              userId: newAuth._id,
              role: "client_owner",
              joinedAt: new Date(),
            },
          ],
        });
        newAuth.organizationId = createdOrg._id;
        await newAuth.save();
      } catch (orgErr) {
        console.warn("Organization auto-create note:", orgErr.message);
      }
    } else if (organizationId) {
      // If user joined an existing organization, attach them to the organization members
      try {
        await Organization.findByIdAndUpdate(organizationId, {
          $addToSet: {
            members: {
              userId: newAuth._id,
              role: "client_member",
              joinedAt: new Date(),
            },
          },
        });
      } catch (orgMemberErr) {
        console.warn("Organization member add note:", orgMemberErr.message);
      }
    }

    const Token = generateTokenAndSetCookie(res, newAuth._id);
    newAuth.sessionToken = Token;

    await newAuth.save();

    const Support_Email = "jops7326@gmail.com";
    const year = new Date().getFullYear();
    const frontendBase =
      req.get("origin") ||
      (req.get("referer") ? new URL(req.get("referer")).origin : null) ||
      process.env.FRONTEND_BASE_URL ||
      process.env.FRONT_END_BASE_URL ||
      "http://localhost:5174";
    const explore_link = `${frontendBase}/verify`;
    let emailSent = true;
    try {
      await sendVerificationEmail(
        email,
        verificationToken,
        explore_link,
        userName,
        Support_Email,
        year
      );
    } catch (err) {
      console.log("Email Send Failed: " + (err.message || err));
      emailSent = false;
    }

    const { password: _, verificationToken: __, ...safeUser } =
      newAuth.toObject();
    safeUser.hasPassword = true;
    safeUser.provider = "local";

    res.status(201).json({
      success: true,
      message: emailSent
        ? "Registration successful. Verification email sent."
        : "Registration successful. Please check your email for the verification code.",
      token: Token,
      user: safeUser,
      data: {
        token: Token,
        user: safeUser,
      },
    });
  } catch (err) {
    console.error("Error during registration:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const VerifyAuth = async (req, res) => {
  const { verificationToken, email } = req.body;
  const cleanedCode = String(verificationToken || "").trim();
  const cleanedEmail = email ? String(email).toLowerCase().trim() : null;

  try {
    let findUser = null;

    if (cleanedEmail) {
      findUser = await Auth.findOne({ email: cleanedEmail });
    } else if (req.user?._id) {
      findUser = await Auth.findById(req.user._id);
    } else {
      findUser = await Auth.findOne({ verificationToken: cleanedCode });
    }

    if (!findUser) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired verification code.",
      });
    }

    // Check if token has expired by time
    if (
      !findUser.verificationTokenExpiresAt ||
      findUser.verificationTokenExpiresAt < Date.now()
    ) {
      return res.status(400).json({
        success: false,
        message: "Verification code has expired. Please request a new code.",
        codeExpired: true,
      });
    }

    // Check if max attempts reached (3 times)
    if ((findUser.verificationAttempts || 0) >= 3) {
      findUser.verificationToken = undefined;
      findUser.verificationTokenExpiresAt = undefined;
      findUser.verificationAttempts = 0;
      await findUser.save();
      return res.status(400).json({
        success: false,
        message: "Maximum 3 attempts exceeded. This verification code has expired. Please request a new code.",
        codeExpired: true,
      });
    }

    // Check code match
    if (findUser.verificationToken !== cleanedCode) {
      findUser.verificationAttempts = (findUser.verificationAttempts || 0) + 1;
      const remainingAttempts = 3 - findUser.verificationAttempts;

      if (findUser.verificationAttempts >= 3) {
        findUser.verificationToken = undefined;
        findUser.verificationTokenExpiresAt = undefined;
        findUser.verificationAttempts = 0;
        await findUser.save();
        return res.status(400).json({
          success: false,
          message: "Incorrect code. Maximum 3 failed attempts exceeded. Code has expired. Please request a new code.",
          codeExpired: true,
          remainingAttempts: 0,
        });
      }

      await findUser.save();
      return res.status(400).json({
        success: false,
        message: `Incorrect code. ${remainingAttempts} attempt${remainingAttempts === 1 ? "" : "s"} remaining before expiration.`,
        remainingAttempts,
      });
    }

    // Verification Success!
    findUser.status = "active";
    findUser.isVerified = true;
    findUser.verificationToken = undefined;
    findUser.verificationTokenExpiresAt = undefined;
    findUser.verificationAttempts = 0;

    const Token = generateTokenAndSetCookie(res, findUser._id);
    findUser.sessionToken = Token;

    await findUser.save();

    const logo = "../public/My-Logo.png";
    const explore_link = `${process.env.FRONTEND_BASE_URL || process.env.FRONT_END_BASE_URL || "http://localhost:5174"}/dashboard`;
    const support_email = "yohannishailye2039@gmail.com";
    const year = new Date().getFullYear();

    try {
      await sendWelcomeEmail(
        findUser.email,
        findUser.userName || findUser.name,
        logo,
        explore_link,
        support_email,
        year
      );
    } catch (emailErr) {
      console.error("Warning: Failed to send welcome email:", emailErr);
    }

    const { password, ...User } = findUser.toObject();

    res.status(200).json({
      success: true,
      message: "Email verified successfully. You are now logged in.",
      token: Token,
      user: User,
      data: {
        token: Token,
        user: User,
      },
    });
  } catch (err) {
    console.log("Server Error: " + err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

export const AuthLogin = async (req, res) => {
  // Sanitize all input fields using sanitizeObject
  const sanitizedData = sanitizeObject(req.body);
  const identifier = (
    sanitizedData.email ||
    sanitizedData.userName ||
    sanitizedData.identifier ||
    ""
  ).trim();
  const { password } = sanitizedData;

  // Validate sanitized input with Joi
  const { error } = loginSchema.validate(sanitizedData);
  if (error) {
    const errorMsg = error.details?.[0]?.message || error.message;
    console.error("Validation error:", errorMsg);
    return res.status(400).json({ success: false, message: errorMsg });
  }

  if (!identifier) {
    return res
      .status(400)
      .json({ success: false, message: "Email or username is required" });
  }

  try {
    const exitingUser = await Auth.findOne({
      $or: [
        { email: identifier.toLowerCase() },
        { userName: identifier },
      ],
    });

    if (!exitingUser) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid email or username" });
    }

    const isMatch = await bcrypt.compare(password, exitingUser.password);

    if (!isMatch) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid password" });
    }

    // Strict verification check: only verified users can log in
    const isUserVerified =
      exitingUser.isVerified === true ||
      (exitingUser.status === "active" && !exitingUser.verificationToken);

    if (!isUserVerified) {
      return res.status(403).json({
        success: false,
        isVerified: false,
        message:
          "Your email is not verified yet. Please enter the verification code to continue.",
        email: exitingUser.email,
      });
    }

    const Token = generateTokenAndSetCookie(res, exitingUser._id);
    if (!Token) {
      return res
        .status(401)
        .json({ success: false, message: "token not created" });
    }

    exitingUser.sessionToken = Token;
    exitingUser.lastLogin = new Date();

    await exitingUser.save();

    const { password: _, ...User } = exitingUser.toObject();
    User.hasPassword = true;

    res.status(200).json({
      success: true,
      message: "User login successfully",
      token: Token,
      user: User,
      data: {
        token: Token,
        user: User,
      },
    });
  } catch (err) {
    console.error("Error during login:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const checkAuth = async (req, res) => {
  try {
    const dbUser = await Auth.findById(req.user._id).select("+password provider googleId organizationOnboarded organization");
    const hasPassword = Boolean(dbUser?.password && dbUser.password.length > 0);
    const userObj = req.user.toObject ? req.user.toObject() : req.user;
    const { password, ...userWithoutPassword } = userObj;
    userWithoutPassword.hasPassword = hasPassword;
    userWithoutPassword.provider = dbUser?.provider || (dbUser?.googleId ? "google" : "local");
    userWithoutPassword.organizationOnboarded =
      dbUser?.organizationOnboarded !== undefined
        ? Boolean(dbUser.organizationOnboarded)
        : true;
    userWithoutPassword.organization = dbUser?.organization || "";

    res.status(200).json({
      success: true,
      user: userWithoutPassword,
      data: userWithoutPassword,
    });
  } catch (err) {
    console.error("Error in checkAuth:", err);
    res.status(500).json({
      success: false,
      message: "Server error. Please try again later.",
      error: err.message,
    });
  }
};

export const Logout = async (req, res) => {
  res.clearCookie("refreshToken");
  res.clearCookie("token");
  res.status(200).json({ success: true, message: "Logged out successfully." });
};

export const deleteAccount = async (req, res) => {
  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({
        success: false,
        message: "Password is required to delete account",
      });
    }

    const userPassword = req.user.password || req.user.Password;
    const isMatch = await bcrypt.compare(password, userPassword);
    if (!isMatch) {
      return res
        .status(401)
        .json({ success: false, message: "Incorrect password" });
    }

    // Delete user
    await req.user.deleteOne();

    // Clear auth token cookie
    res.clearCookie("token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "Strict",
    });
    res.clearCookie("refreshToken");

    return res
      .status(200)
      .json({ success: true, message: "Account deleted successfully" });
  } catch (err) {
    console.error("Error deleting account:", err.message);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export const resendVerificationEmail = async (req, res) => {
  try {
    const email = req.body?.email?.toLowerCase().trim();
    let user = null;

    if (req.user?._id) {
      user = await Auth.findById(req.user._id);
    }
    if (!user && email) {
      user = await Auth.findOne({ email });
    }

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    user.verificationToken = Math.floor(
      100000 + Math.random() * 900000
    ).toString();
    user.verificationAttempts = 0;
    console.log("DEV RESEND VERIFICATION TOKEN:", user.verificationToken);
    user.verificationTokenExpiresAt = new Date(
      Date.now() + 24 * 60 * 60 * 1000
    );
    await user.save();

    const Support_Email = "jops7326@gmail.com";
    const year = new Date().getFullYear();
    const frontendBase =
      req.get("origin") ||
      (req.get("referer") ? new URL(req.get("referer")).origin : null) ||
      process.env.FRONTEND_BASE_URL ||
      process.env.FRONT_END_BASE_URL ||
      "http://localhost:5174";
    const explore_link = `${frontendBase}/verify`;
    let emailSent = true;
    try {
      await sendVerificationEmail(
        user.email,
        user.verificationToken,
        explore_link,
        user.userName || user.name,
        Support_Email,
        year
      );
    } catch (emailErr) {
      console.warn("Email sending failed:", emailErr.message || emailErr);
      emailSent = false;
    }

    res.status(200).json({
      success: true,
      message: emailSent
        ? "Verification email resent successfully."
        : "A fresh verification code has been dispatched to your email.",
    });
  } catch (error) {
    console.error("Resend verification error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export const forgotPassword = async (req, res) => {
  // Sanitize all input fields using sanitizeObject
  const sanitizedData = sanitizeObject(req.body);
  const { email } = sanitizedData;

  // Validate sanitized input with Joi
  const { error } = forgotPasswordSchema.validate(sanitizedData);
  if (error) {
    const errorMsg = error.details?.[0]?.message || error.message;
    console.error("Validation error:", errorMsg);
    return res.status(400).json({ success: false, message: errorMsg });
  }

  try {
    const user = await Auth.findOne({ email });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "email not exists",
      });
    }

    const resetToken = crypto.randomBytes(20).toString("hex");
    const resetTokenExpiresAt = new Date(Date.now() + 1 * 60 * 60 * 1000); // 1 hour

    user.resetPasswordToken = resetToken;
    user.resetpasswordExpiresAt = resetTokenExpiresAt;

    await user.save();

    const logo = "../public/My-Logo.png";
    const support_email = "yohannishailye2039@gmail.com";
    const year = new Date().getFullYear();
    const frontendBase =
      req.get("origin") ||
      (req.get("referer") ? new URL(req.get("referer")).origin : null) ||
      process.env.FRONTEND_BASE_URL ||
      process.env.FRONT_END_BASE_URL ||
      "http://localhost:5174";
    const resetLink = `${frontendBase}/reset-password/${resetToken}`;

    let emailSent = true;
    try {
      await sendPasswordResetEmail(
        user.email,
        resetLink,
        user.userName || user.name,
        logo,
        support_email,
        year
      );
    } catch (emailErr) {
      console.log("Email Send Failed: " + (emailErr.message || emailErr));
      emailSent = false;
    }

    res.status(200).json({
      success: true,
      message: emailSent
        ? "Password reset email sent."
        : "Password reset request processed.",
    });
  } catch (err) {
    console.error("Error in forgotPassword:", err);
    return res.status(500).json({
      success: false,
      message: "Server error. Please try again later.",
      error: err.message,
    });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;

    // Sanitize all input fields using sanitizeObject
    const sanitizedData = sanitizeObject(req.body);
    const { password } = sanitizedData;

    // Validate sanitized input with Joi
    const { error } = resetPasswordSchema.validate(sanitizedData);
    if (error) {
      const errorMsg = error.details?.[0]?.message || error.message;
      console.error("Validation error:", errorMsg);
      return res.status(400).json({ success: false, message: errorMsg });
    }

    if (!password) {
      return res.status(400).json({
        success: false,
        message: "New password is required.",
      });
    }

    const user = await Auth.findOne({
      resetPasswordToken: token,
      resetpasswordExpiresAt: { $gt: Date.now() },
    });

    if (!user) {
      console.log("Invalid or expired reset token attempt:", token);
      return res.status(400).json({
        success: false,
        message: "Invalid or expired reset token.",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    user.password = hashedPassword;
    user.resetPasswordToken = undefined;
    user.resetpasswordExpiresAt = undefined;
    await user.save();

    const logo = "../public/My-Logo.png";
    const login_link = `${process.env.FRONTEND_BASE_URL || process.env.FRONT_END_BASE_URL || "http://localhost:5174"}/login`;
    const support_email = "yohannishailye2039@gmail.com";
    const year = new Date().getFullYear();
    try {
      await sendResetSuccessEmail(
        user.email,
        logo,
        user.userName || user.name,
        login_link,
        support_email,
        year
      );
    } catch (emailError) {
      console.error("Failed to send reset success email:", emailError);
    }

    return res.status(200).json({
      success: true,
      message: "Password reset successfully.",
    });
  } catch (err) {
    console.error("Error in resetPassword:", err);
    return res.status(500).json({
      success: false,
      message: "Server error. Please try again later.",
      error: err.message,
    });
  }
};

export const updateProfile = async (req, res) => {
  const _id = req.params._id || req.params.id || req.user?._id;

  // Sanitize all input fields using sanitizeObject
  const sanitizedData = sanitizeObject(req.body);
  delete sanitizedData.password;
  delete sanitizedData.role; // Role updates handled exclusively by admin

  if (sanitizedData.name !== undefined && sanitizedData.name.trim().length < 3) {
    return res
      .status(400)
      .json({ success: false, message: "Name must be at least 3 characters long" });
  }

  if (sanitizedData.userName !== undefined && sanitizedData.userName.trim().length < 3) {
    return res
      .status(400)
      .json({ success: false, message: "Username must be at least 3 characters long" });
  }

  try {
    const foundUser = await Auth.findByIdAndUpdate(
      _id,
      { ...sanitizedData },
      { new: true }
    ).select("-password");
    if (!foundUser) {
      return res
        .status(404)
        .json({ success: false, message: "User Not Found" });
    }
    res.status(200).json({
      success: true,
      message: "Profile Updated Successfully",
      user: foundUser,
      data: foundUser,
    });
  } catch (error) {
    console.log("Error:", error.message);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

export const changePassword = async (req, res) => {
  const _id = req.params._id || req.params.id || req.user?._id;

  // sanitize all input fields using sanitizeObject
  const sanitizedData = sanitizeObject(req.body);
  const targetNewPassword = sanitizedData.newPassword || sanitizedData.password;
  const oldPassword = sanitizedData.oldPassword;

  // validate input data using joi
  const { error } = changePasswordSchema.validate(sanitizedData);
  if (error) {
    const errorMsg = error.details?.[0]?.message || error.message;
    console.error("Validation error:", errorMsg);
    return res.status(400).json({ success: false, message: errorMsg });
  }

  if (!targetNewPassword) {
    return res
      .status(400)
      .json({ success: false, message: "New password is required" });
  }

  // Validate new password complexity
  const complexityResult = validatePasswordComplexity(targetNewPassword);
  if (!complexityResult.valid) {
    return res
      .status(400)
      .json({ success: false, message: complexityResult.message });
  }

  try {
    const foundUser = await Auth.findById(_id);
    if (!foundUser) {
      return res
        .status(404)
        .json({ success: false, message: "User Not Found" });
    }

    const hasExistingPassword = Boolean(foundUser.password);

    if (hasExistingPassword) {
      if (!oldPassword) {
        return res.status(400).json({
          success: false,
          message: "Current password is required to change your password.",
        });
      }

      const isMatch = await bcrypt.compare(oldPassword, foundUser.password);
      if (!isMatch) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid current password" });
      }
    }

    const hashedPassword = await bcrypt.hash(targetNewPassword, 10);
    foundUser.password = hashedPassword;
    await foundUser.save();

    res.status(200).json({
      success: true,
      message: hasExistingPassword
        ? "Password Changed Successfully"
        : "Password Created Successfully",
      hasPassword: true,
    });
  } catch (error) {
    console.log("Error:", error.message);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

export const completeOnboarding = async (req, res) => {
  const userId = req.user?._id;
  if (!userId) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }

  const sanitizedData = sanitizeObject(req.body);
  const rawOrg =
    sanitizedData.organization ||
    sanitizedData.company ||
    sanitizedData.companyName ||
    "";
  const hasNoOrganization = Boolean(sanitizedData.hasNoOrganization);
  const orgName =
    hasNoOrganization || typeof rawOrg !== "string" ? "" : rawOrg.trim();

  try {
    const user = await Auth.findById(userId);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    let role = "client_member";
    let isOwner = false;
    let organizationId = null;
    let finalOrgName = orgName;

    if (orgName) {
      const safeOrgRegex = new RegExp(
        "^" + orgName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "$",
        "i"
      );

      const existingOrg = await Organization.findOne({ name: safeOrgRegex });
      const existingAuthWithOrg = await Auth.findOne({
        organization: safeOrgRegex,
        _id: { $ne: user._id },
      });

      if (!existingOrg && !existingAuthWithOrg) {
        // Company name not registered before -> Take as client_owner
        role = "client_owner";
        isOwner = true;
      } else {
        // Company name is already registered before -> Take as client_member
        role = "client_member";
        isOwner = false;
        if (existingOrg) {
          organizationId = existingOrg._id;
          finalOrgName = existingOrg.name;
        }
      }
    } else {
      // No company name provided -> client_member
      role = "client_member";
      isOwner = false;
      finalOrgName = "";
    }

    user.organization = finalOrgName;
    user.organizationId = organizationId;
    user.isOwner = isOwner;
    user.role = role;
    user.isSecurityResponsible = Boolean(sanitizedData.isSecurityResponsible);
    user.organizationOnboarded = true;

    await user.save();

    // If new organization was registered, create Organization document
    if (isOwner && finalOrgName) {
      try {
        const createdOrg = await Organization.create({
          name: finalOrgName,
          ownerId: user._id,
          members: [
            {
              userId: user._id,
              role: "client_owner",
              joinedAt: new Date(),
            },
          ],
        });
        user.organizationId = createdOrg._id;
        await user.save();
      } catch (orgErr) {
        console.warn(
          "Organization auto-create note in onboarding:",
          orgErr.message
        );
      }
    } else if (organizationId) {
      try {
        await Organization.findByIdAndUpdate(organizationId, {
          $addToSet: {
            members: {
              userId: user._id,
              role: "client_member",
              joinedAt: new Date(),
            },
          },
        });
      } catch (orgMemberErr) {
        console.warn(
          "Organization member add note in onboarding:",
          orgMemberErr.message
        );
      }
    }

    const userObj = user.toObject ? user.toObject() : user;
    const { password, ...userWithoutPassword } = userObj;

    return res.status(200).json({
      success: true,
      message: "Organization profile configured successfully.",
      user: userWithoutPassword,
      data: userWithoutPassword,
    });
  } catch (err) {
    console.error("Error in completeOnboarding:", err);
    return res.status(500).json({
      success: false,
      message: "Server error during onboarding setup.",
      error: err.message,
    });
  }
};

