import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth2";
import Auth from "../models/auth.model.js";
import generateTokenAndSetCookie from "../utils/token.utils.js";
import dotenv from "dotenv";

dotenv.config();

const PORT = process.env.PORT || 3001;

// Helper to generate unique username
function makeUniqueUsername(baseName) {
  const nameStr = String(baseName || "user");
  const cleaned = nameStr.replace(/\s+/g, "").toLowerCase();
  const randomNum = Math.floor(Math.random() * 10000);
  return `${cleaned}${randomNum}`;
}

export const isGoogleConfigured = () =>
  Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

if (isGoogleConfigured()) {
  const callbackURL =
    process.env.GOOGLE_CALLBACK_URL ||
    `http://localhost:5000/auth/google/callback`;

  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL,
        passReqToCallback: true,
      },
      async (request, accessToken, refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value?.toLowerCase();
          const photo = profile.photos?.[0]?.value;
          const name = profile.displayName || "user";

          if (!email) {
            return done(new Error("No email found in Google profile"), null);
          }

          let user = await Auth.findOne({ email });
          let isNewUser = false;

          if (user) {
            // Update Google info if missing
            if (!user.googleId) {
              user.googleId = profile.id;
            }
            user.provider = user.provider || "google";
            user.name = user.name || name;
            user.status = "active";
            user.isVerified = true;
            if (photo && !user.profilePicture) {
              user.profilePicture = photo;
            }
            if (!user.role || user.role === "user") {
              user.role = "client_member";
            }
            await user.save();
          } else {
            isNewUser = true;
            // Create new user with platform default role
            const username = makeUniqueUsername(name);

            user = await Auth.create({
              googleId: profile.id,
              provider: "google",
              email: email,
              userName: username,
              name: name,
              profilePicture: photo || "",
              status: "active",
              role: "client_member",
              isVerified: true,
              isOwner: false,
              organizationOnboarded: false,
            });

            await user.save();
          }

          user._isNewUser = isNewUser;
          return done(null, user);
        } catch (err) {
          console.error("GoogleStrategy verification error:", err);
          return done(err, null);
        }
      }
    )
  );
}

// Routes
export const intro = (req, res) => {
  res.send("<a href='/auth/google'>Authenticate with Google</a>");
};

export const googleCallback = async (req, res) => {
  try {
    if (!req.user) {
      const frontendURL =
        process.env.FRONTEND_BASE_URL ||
        process.env.FRONT_END_BASE_URL ||
        "http://localhost:5174";
      return res.redirect(
        `${frontendURL}/login?error=${encodeURIComponent("Google authentication failed: no user data returned")}`
      );
    }

    const refreshToken = generateTokenAndSetCookie(res, req.user._id);

    req.user.sessionToken = refreshToken;
    await req.user.save();

    let frontendURL =
      process.env.FRONTEND_BASE_URL ||
      process.env.FRONT_END_BASE_URL ||
      "http://localhost:5174";

    if (req.query.state) {
      try {
        const parsedState = JSON.parse(
          Buffer.from(req.query.state, "base64").toString("utf-8")
        );
        if (parsedState.returnUrl) {
          const urlObj = new URL(parsedState.returnUrl);
          frontendURL = `${urlObj.protocol}//${urlObj.host}`;
        }
      } catch (e) {
        // use default frontendURL
      }
    }

    const isNew = Boolean(req.user?._isNewUser);
    const newQuery = isNew ? "&isNew=1" : "";

    // Redirect to frontend dedicated auth callback handler
    return res.redirect(
      `${frontendURL}/auth/callback?token=${encodeURIComponent(refreshToken)}${newQuery}`
    );
  } catch (error) {
    console.error("googleCallback error:", error);
    const frontendURL =
      process.env.FRONTEND_BASE_URL ||
      process.env.FRONT_END_BASE_URL ||
      "http://localhost:5174";
    return res.redirect(
      `${frontendURL}/login?error=${encodeURIComponent("An error occurred during Google sign-in.")}`
    );
  }
};

export const Profile = (req, res) => {
  res.send("Welcome " + (req.user.userName || req.user.name));
};

export const fail = (req, res) => {
  let frontendURL =
    process.env.FRONTEND_BASE_URL ||
    process.env.FRONT_END_BASE_URL ||
    "http://localhost:5174";

  if (req.query.state) {
    try {
      const parsedState = JSON.parse(
        Buffer.from(req.query.state, "base64").toString("utf-8")
      );
      if (parsedState.returnUrl) {
        const urlObj = new URL(parsedState.returnUrl);
        frontendURL = `${urlObj.protocol}//${urlObj.host}`;
      }
    } catch (e) {
      // use default frontendURL
    }
  }

  return res.redirect(
    `${frontendURL}/login?error=${encodeURIComponent("Google authentication was canceled or failed.")}`
  );
};
