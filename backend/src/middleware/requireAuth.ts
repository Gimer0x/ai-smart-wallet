/**
 * Require authenticated session (Google login).
 */

import { Request, Response, NextFunction } from "express";
import { getSession } from "../utils/getSession";

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const session = getSession(req);
  if (!session?.googleSub) {
    res.status(401).json({
      success: false,
      error: "Authentication required. Please sign in with Google.",
    });
    return;
  }
  next();
}

/**
 * Require session to have Circle user token (user has completed initialize-user).
 * Use for /api/circle/wallets and /api/circle/wallets/:walletId/balance.
 */
export function requireCircleUser(req: Request, res: Response, next: NextFunction): void {
  const session = getSession(req);
  if (!session?.googleSub) {
    res.status(401).json({
      success: false,
      error: "Authentication required. Please sign in with Google.",
    });
    return;
  }
  if (!session?.circleUserToken) {
    res.status(403).json({
      success: false,
      error: "Circle user not initialized. Complete wallet setup (initialize user and create wallet) first.",
    });
    return;
  }
  next();
}
