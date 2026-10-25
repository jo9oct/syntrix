
import cors from "cors";

const frontendBaseUrl = process.env.FRONTEND_BASE_URL?.trim().replace(/\/+$/, "");

if (!frontendBaseUrl) {
  throw new Error("FRONTEND_BASE_URL is required");
}

const allowedOrigins = new Set([frontendBaseUrl]);

if (process.env.NODE_ENV !== "production") {
  allowedOrigins.add("http://localhost:5173");
}

const corsOptions = {
  origin(origin, callback) {
    // Requests without an Origin header are not browser CORS requests.
    if (!origin || allowedOrigins.has(origin)) {
      return callback(null, true);
    }

    // Do not grant CORS access to unapproved origins.
    return callback(null, false);
  },

  methods: ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],

  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Requested-With",
  ],

  credentials: true,

  maxAge: 600,
};

export default cors(corsOptions);
