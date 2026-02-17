/**
 * Circle user-controlled wallet proxy routes.
 * - POST /device-token: public, returns deviceToken + deviceEncryptionKey for SDK.
 * - POST /initialize-user: requires auth, stores userToken in session only; returns challengeId or alreadyInitialized.
 *   encryptionKey is never sent; it stays in client sessionStorage.
 */

import { Router, Request, Response } from "express";
import { createDeviceToken, initializeUser } from "../circleUser/circleUserClient";
import { getSession } from "../utils/getSession";
import { requireAuth } from "../middleware/requireAuth";

const router = Router();

/**
 * POST /api/circle/device-token
 * Body: { deviceId } - from Circle SDK getDeviceId(). No auth required.
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
    res.json({
      success: true,
      data: {
        deviceToken: data.data.deviceToken,
        deviceEncryptionKey: data.data.deviceEncryptionKey,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Device token failed";
    console.error("Circle device-token error:", message);
    res.status(500).json({ success: false, error: message });
  }
});

/**
 * POST /api/circle/initialize-user
 * Body: { userToken, blockchains?, accountType? }. Requires Google session. encryptionKey is never sent.
 */
router.post("/initialize-user", requireAuth, async (req: Request, res: Response) => {
  try {
    const { userToken, blockchains, accountType } = req.body;
    if (!userToken || typeof userToken !== "string") {
      return res.status(400).json({
        success: false,
        error: "userToken (string) is required in body",
      });
    }
    const session = getSession(req);

    try {
      const result = await initializeUser(userToken, {
        accountType: accountType === "SCA" ? "SCA" : "EOA",
        blockchains: Array.isArray(blockchains) ? blockchains : ["ARC-TESTNET"],
      });

      session.circleUserToken = userToken;
      await new Promise<void>((resolve, reject) => {
        req.session.save((err) => (err ? reject(err) : resolve()));
      });

      return res.json({
        success: true,
        data: {
          challengeId: result.data?.challengeId,
        },
      });
    } catch (err: unknown) {
      const code = (err as { code?: number }).code;
      if (code === 155106) {
        session.circleUserToken = userToken;
        await new Promise<void>((resolve, reject) => {
          req.session.save((err) => (err ? reject(err) : resolve()));
        });
        return res.json({
          success: true,
          data: { alreadyInitialized: true },
        });
      }
      throw err;
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Initialize user failed";
    console.error("Circle initialize-user error:", message);
    res.status(500).json({ success: false, error: message });
  }
});

export default router;
