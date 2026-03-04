import { Request } from "express";
import type { AppSession } from "../types/appSession";

/**
 * Get current request session with our app fields (googleSub, circleUserToken, etc.).
 */
export function getSession(req: Request): AppSession {
  return req.session as unknown as AppSession;
}
