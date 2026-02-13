/**
 * Circle user-controlled wallet proxy routes.
 * Frontend never sees CIRCLE_API_KEY; backend calls Circle on behalf of the user.
 */

import { Router, Request, Response } from "express";
import {
  createDeviceToken,
  initializeUser,
  listWallets,
  getWalletBalance,
} from "../circleUser/circleUserClient";
import { requireAuth, requireCircleUser } from "../middleware/requireAuth";
import { getSession } from "../utils/getSession";
import { setCircleUserForGoogleSub } from "../store/circleUserStore";

const router = Router();

/**
 * POST /api/circle/device-token
 * Body: { deviceId }
 * Returns: { deviceToken, deviceEncryptionKey } for use with Circle SDK (no auth required).
 */
router.post("/device-token", async (req: Request, res: Response) => {
  try {
    const { deviceId } = req.body;
    if (!deviceId || typeof deviceId !== "string") {
      return res.status(400).json({
        success: false,
        error: "deviceId (string) is required in body",
      });
    }
    const data = await createDeviceToken(deviceId);
    res.json({ success: true, data: data.data });
  } catch (error: any) {
    console.error("Circle device-token error:", error.message);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to create device token",
    });
  }
});

/**
 * POST /api/circle/initialize-user
 * Body: { userToken, encryptionKey [, blockchains, accountType ] }
 * Requires: authenticated session (Google login).
 * Stores userToken and encryptionKey in session; returns challengeId for frontend to execute wallet creation.
 */
/** Circle error code: user already initialized (wallet already exists) */
const CIRCLE_ALREADY_INITIALIZED = 155106;

router.post("/initialize-user", requireAuth, async (req: Request, res: Response) => {
  try {
    const { userToken, encryptionKey, blockchains, accountType } = req.body;
    if (!userToken || typeof userToken !== "string") {
      return res.status(400).json({
        success: false,
        error: "userToken (string) is required in body",
      });
    }
    let result: Awaited<ReturnType<typeof initializeUser>>;
    try {
      result = await initializeUser(userToken, {
        accountType: accountType === "SCA" ? "SCA" : "EOA",
        blockchains: Array.isArray(blockchains) ? blockchains : ["ARC-TESTNET"],
      });
    } catch (error: any) {
      if (error?.code === CIRCLE_ALREADY_INITIALIZED) {
        const session = getSession(req);
        session.circleUserToken = userToken;
        if (encryptionKey != null) session.circleEncryptionKey = String(encryptionKey);
        if (session.googleSub && encryptionKey != null) {
          setCircleUserForGoogleSub(session.googleSub, userToken, String(encryptionKey));
        }
        await new Promise<void>((resolve, reject) => {
          req.session.save((err) => (err ? reject(err) : resolve()));
        });
        return res.json({
          success: true,
          data: { alreadyInitialized: true, challengeId: undefined },
        });
      }
      throw error;
    }
    const session = getSession(req);
    session.circleUserToken = userToken;
    if (encryptionKey != null) session.circleEncryptionKey = String(encryptionKey);
    if (session.googleSub && encryptionKey != null) {
      setCircleUserForGoogleSub(session.googleSub, userToken, String(encryptionKey));
    }
    await new Promise<void>((resolve, reject) => {
      req.session.save((err) => (err ? reject(err) : resolve()));
    });
    res.json({ success: true, data: result.data });
  } catch (error: any) {
    console.error("Circle initialize-user error:", error.message);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to initialize user",
    });
  }
});

/**
 * GET /api/circle/wallets
 * Requires: session with circleUserToken (user has completed initialize-user).
 * Returns: list of wallets for the current user.
 */
router.get("/wallets", requireCircleUser, async (req: Request, res: Response) => {
  try {
    const userToken = getSession(req).circleUserToken!;
    const data = await listWallets(userToken);
    res.json({ success: true, data: data.data.wallets });
  } catch (error: any) {
    console.error("Circle list wallets error:", error.message);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to list wallets",
    });
  }
});

/**
 * GET /api/circle/wallets/:walletId/balance
 * Requires: session with circleUserToken. Verifies walletId belongs to current user.
 */
router.get("/wallets/:walletId/balance", requireCircleUser, async (req: Request, res: Response) => {
  try {
    const userToken = getSession(req).circleUserToken!;
    const { walletId } = req.params;
    const list = await listWallets(userToken);
    const owned = list.data.wallets.some((w) => w.id === walletId);
    if (!owned) {
      return res.status(403).json({
        success: false,
        error: "Wallet does not belong to the current user",
      });
    }
    const data = await getWalletBalance(userToken, walletId);
    res.json({ success: true, data: data.data.tokenBalances });
  } catch (error: any) {
    console.error("Circle wallet balance error:", error.message);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to get wallet balance",
    });
  }
});

export default router;
