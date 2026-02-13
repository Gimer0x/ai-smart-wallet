/**
 * Express session configuration for auth and Circle user context.
 */

import session = require("express-session");
import dotenv from "dotenv";

dotenv.config();

const SESSION_SECRET = process.env.SESSION_SECRET || "wallet-integrated-ai-session-secret-change-in-production";

export const sessionMiddleware = session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 1 day
    sameSite: "lax",
  },
  name: "wallet-ai.sid",
});
