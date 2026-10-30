import crypto from "node:crypto";
import axios from "axios";
import Auth from "../models/auth.model.js";
import generateTokenAndSetCookie from "../utils/token.utils.js";
import dotenv from "dotenv";

dotenv.config();

// Helper to generate unique username
function makeUniqueUsername(baseName) {
  const nameStr = String(baseName || "user");
  const cleaned = nameStr.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
  const randomNum = Math.floor(Math.random() * 10000);
  return `${cleaned || "user"}${randomNum}`;
}

export const isGithubConfigured = () =>
  Boolean(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET);

const getClientId = () => process.env.GITHUB_CLIENT_ID;
const getClientSecret = () => process.env.GITHUB_CLIENT_SECRET;

const getFrontendUrl = () =>
  process.env.FRONTEND_BASE_URL ||
  process.env.FRONT_END_BASE_URL ||
  "http://localhost:5174";

const getCallbackUrl = (req) => {
  if (process.env.GITHUB_REDIRECT_URI) {
    return process.env.GITHUB_REDIRECT_URI;
  }
  const host = req.get("host") || "localhost:5000";
  const protocol = req.protocol || "http";
  return `${protocol}://${host}/api/v1/github/callback`;
};

/**
 * Initiates GitHub OAuth authorization flow
 */
export const initiateGithubAuth = (req, res) => {
  if (!isGithubConfigured()) {
    return res.status(503).json({
      success: false,
      message: "GitHub authentication is not configured on this server.",
    });
  }

  try {
    const clientId = getClientId();
    const callbackUrl = getCallbackUrl(req);

    const returnUrl = req.query.returnUrl || req.headers.referer || "";
    const statePayload = {
      returnUrl,
      nonce: crypto.randomBytes(16).toString("hex"),
      ts: Date.now(),
    };
    const state = Buffer.from(JSON.stringify(statePayload)).toString("base64url");

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: callbackUrl,
      scope: "read:user user:email",
      state: state,
      allow_signup: "true",
    });

    const authorizeUrl = `https://github.com/login/oauth/authorize?${params.toString()}`;
    return res.redirect(authorizeUrl);
  } catch (error) {
    console.error("GitHub auth initiation error:", error);
    const frontendURL = getFrontendUrl();
    return res.redirect(
      `${frontendURL}/login?error=${encodeURIComponent("Could not initiate GitHub sign-in.")}`
    );
  }
};

/**
 * Handles GitHub OAuth callback, exchanges code for access token,
 * fetches user & emails from GitHub API, provisions/updates user,
 * and redirects to frontend /auth/callback.
 */
export const githubCallback = async (req, res) => {
  const frontendURL = getFrontendUrl();

  // 1. Handle error response from GitHub
  if (req.query.error) {
    console.warn("GitHub returned OAuth error:", req.query.error, req.query.error_description);
    const desc = req.query.error_description || req.query.error || "GitHub authorization was canceled.";
    return res.redirect(`${frontendURL}/login?error=${encodeURIComponent(desc)}`);
  }

  const code = req.query.code;
  if (!code) {
    return res.redirect(
      `${frontendURL}/login?error=${encodeURIComponent("No authorization code received from GitHub.")}`
    );
  }

  let returnUrl = "";
  if (req.query.state) {
    try {
      const parsed = JSON.parse(
        Buffer.from(req.query.state, "base64url").toString("utf-8")
      );
      if (parsed.returnUrl) {
        returnUrl = parsed.returnUrl;
      }
    } catch {
      // ignore state parsing issues
    }
  }

  const clientId = getClientId();
  const clientSecret = getClientSecret();
  const callbackUrl = getCallbackUrl(req);

  // 2. Exchange authorization code for access token
  let accessToken = null;
  try {
    const tokenResponse = await axios.post(
      "https://github.com/login/oauth/access_token",
      {
        client_id: clientId,
        client_secret: clientSecret,
        code: code,
        redirect_uri: callbackUrl,
      },
      {
        headers: {
          Accept: "application/json",
          "User-Agent": "Sentrix-Security-Platform",
        },
        timeout: 10000,
      }
    );

    if (tokenResponse.data?.error) {
      console.error("GitHub token exchange returned error:", tokenResponse.data);
      const errMsg = tokenResponse.data.error_description || tokenResponse.data.error;
      return res.redirect(`${frontendURL}/login?error=${encodeURIComponent(errMsg)}`);
    }

    accessToken = tokenResponse.data?.access_token;
  } catch (err) {
    console.error("GitHub token request failure:", err.response?.data || err.message);
    return res.redirect(
      `${frontendURL}/login?error=${encodeURIComponent("Failed to exchange authentication token with GitHub.")}`
    );
  }

  if (!accessToken) {
    return res.redirect(
      `${frontendURL}/login?error=${encodeURIComponent("No access token received from GitHub.")}`
    );
  }

  // 3. Fetch user profile from GitHub API
  let githubUser = null;
  try {
    const userRes = await axios.get("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "User-Agent": "Sentrix-Security-Platform",
      },
      timeout: 8000,
    });
    githubUser = userRes.data;
  } catch (userErr) {
    console.error("GitHub user profile fetch error:", userErr.response?.data || userErr.message);
    return res.redirect(
      `${frontendURL}/login?error=${encodeURIComponent("Failed to retrieve profile data from GitHub.")}`
    );
  }

  // 4. Resolve primary verified email
  let email = githubUser.email;
  if (!email) {
    try {
      const emailsRes = await axios.get("https://api.github.com/user/emails", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "User-Agent": "Sentrix-Security-Platform",
        },
        timeout: 8000,
      });

      if (Array.isArray(emailsRes.data) && emailsRes.data.length > 0) {
        const primary = emailsRes.data.find((e) => e.primary && e.verified) || emailsRes.data[0];
        email = primary?.email;
      }
    } catch (emailsErr) {
      console.warn("GitHub user emails fetch warning:", emailsErr.response?.data || emailsErr.message);
    }
  }

  if (!email) {
    email = `${githubUser.login}@users.noreply.github.com`;
  }
  email = email.toLowerCase().trim();

  const githubId = String(githubUser.id);
  const displayName = githubUser.name || githubUser.login || "GitHub User";
  const avatarUrl = githubUser.avatar_url || "";

  // 5. Query or Provision User in Database
  try {
    let user = await Auth.findOne({
      $or: [{ githubId }, { email }],
    });
    let isNewUser = false;

    if (user) {
      if (!user.githubId) {
        user.githubId = githubId;
      }
      user.provider = user.provider || "github";
      user.name = user.name || displayName;
      user.status = "active";
      user.isVerified = true;
      if (avatarUrl && !user.profilePicture) {
        user.profilePicture = avatarUrl;
      }
      if (!user.role || user.role === "user") {
        user.role = "client_member";
      }
      await user.save();
    } else {
      isNewUser = true;
      const username = makeUniqueUsername(githubUser.login || displayName);

      user = await Auth.create({
        githubId: githubId,
        provider: "github",
        email: email,
        userName: username,
        name: displayName,
        profilePicture: avatarUrl,
        status: "active",
        role: "client_member",
        isVerified: true,
        isOwner: false,
        organizationOnboarded: false,
      });

      await user.save();
    }

    // 6. Generate Session Token and Cookie
    const refreshToken = generateTokenAndSetCookie(res, user._id);
    user.sessionToken = refreshToken;
    await user.save();

    // Determine target frontend URL
    let targetFrontend = frontendURL;
    if (returnUrl) {
      try {
        const u = new URL(returnUrl);
        targetFrontend = `${u.protocol}//${u.host}`;
      } catch {
        // use default targetFrontend
      }
    }

    const newQuery = isNewUser ? "&isNew=1" : "";
    return res.redirect(
      `${targetFrontend}/auth/callback?token=${encodeURIComponent(refreshToken)}${newQuery}`
    );
  } catch (dbErr) {
    console.error("GitHub auth database error:", dbErr);
    return res.redirect(
      `${frontendURL}/login?error=${encodeURIComponent("Failed to establish authorized session in Sentrix database.")}`
    );
  }
};

export const fail = (req, res) => {
  const frontendURL = getFrontendUrl();
  return res.redirect(
    `${frontendURL}/login?error=${encodeURIComponent("GitHub authentication was canceled or failed.")}`
  );
};

