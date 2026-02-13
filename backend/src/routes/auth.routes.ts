/**
 * Auth routes: Google OAuth (verify ID token, create session).
 */

import { Router, Request, Response } from "express";
import { OAuth2Client } from "google-auth-library";
import { getSession } from "../utils/getSession";
import { getCircleUserByGoogleSub } from "../store/circleUserStore";

const router = Router();
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || process.env.GOOGLE_WEB_CLIENT_ID;

/**
 * POST /api/auth/google
 * Body: { idToken } - Google ID token from frontend (e.g. after Google Sign-In button).
 * Verifies the token, extracts sub/email, creates session.
 */
router.post("/google", async (req: Request, res: Response) => {
  try {
    const { idToken } = req.body;
    if (!idToken || typeof idToken !== "string") {
      return res.status(400).json({
        success: false,
        error: "idToken (string) is required in body",
      });
    }
    if (!GOOGLE_CLIENT_ID) {
      console.error("GOOGLE_CLIENT_ID (or GOOGLE_WEB_CLIENT_ID) is not set in backend .env");
      return res.status(500).json({
        success: false,
        error:
          "Server auth configuration missing. Set GOOGLE_CLIENT_ID (or GOOGLE_WEB_CLIENT_ID) in the backend .env file with the same Google OAuth client ID used by the frontend.",
      });
    }
    const client = new OAuth2Client(GOOGLE_CLIENT_ID);
    const ticket = await client.verifyIdToken({
      idToken,
      audience: GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    if (!payload?.sub) {
      return res.status(401).json({
        success: false,
        error: "Invalid Google token",
      });
    }
    const session = getSession(req);
    session.googleSub = payload.sub;
    session.email = payload.email ?? undefined;
    const stored = getCircleUserByGoogleSub(payload.sub);
    if (stored) {
      session.circleUserToken = stored.circleUserToken;
      session.circleEncryptionKey = stored.circleEncryptionKey;
    }
    await new Promise<void>((resolve, reject) => {
      req.session.save((err) => (err ? reject(err) : resolve()));
    });
    res.json({
      success: true,
      data: {
        sub: payload.sub,
        email: payload.email,
      },
    });
  } catch (error: any) {
    console.error("Google auth error:", error.message);
    res.status(401).json({
      success: false,
      error: error.message || "Google sign-in failed",
    });
  }
});

/**
 * POST /api/auth/logout
 * Destroys the session.
 */
router.post("/logout", (req: Request, res: Response) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ success: false, error: "Logout failed" });
    }
    res.clearCookie("wallet-ai.sid");
    res.json({ success: true });
  });
});

/**
 * GET /api/auth/me
 * Returns current session user. Restores Circle credentials from store if this Google user already has a wallet.
 */
router.get("/me", async (req: Request, res: Response) => {
  const session = getSession(req);
  if (!session?.googleSub) {
    return res.status(401).json({ success: false, error: "Not authenticated" });
  }
  if (!session.circleUserToken) {
    const stored = getCircleUserByGoogleSub(session.googleSub);
    if (stored) {
      session.circleUserToken = stored.circleUserToken;
      session.circleEncryptionKey = stored.circleEncryptionKey;
      await new Promise<void>((resolve, reject) => {
        req.session.save((err) => (err ? reject(err) : resolve()));
      });
    }
  }
  res.json({
    success: true,
    data: {
      googleSub: session.googleSub,
      email: session.email,
      hasCircleUser: !!session.circleUserToken,
    },
  });
});

export default router;
