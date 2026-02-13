/**
 * Wallet API Routes (user-controlled only)
 *
 * All routes require session with Circle user (requireCircleUser).
 * Only the authenticated user's wallets are accessible; walletId is always verified against listWallets.
 */

import { Router, Request, Response } from "express";
import { requireCircleUser } from "../middleware/requireAuth";
import { getSession } from "../utils/getSession";
import {
  listWallets,
  getWallet,
  getWalletBalance,
  listTransactions,
  getTransaction,
  createTransferChallenge,
} from "../circleUser/circleUserClient";

const router = Router();

router.use(requireCircleUser);

async function assertUserOwnsWallet(
  userToken: string,
  walletId: string
): Promise<void> {
  const list = await listWallets(userToken);
  const owned = list.data.wallets.some((w) => w.id === walletId);
  if (!owned) {
    throw new Error("Wallet does not belong to the current user");
  }
}

/**
 * GET /api/wallets
 * List current user's wallets (no walletId in path).
 */
router.get("/", async (req: Request, res: Response) => {
  try {
    const userToken = getSession(req).circleUserToken!;
    const data = await listWallets(userToken);
    res.json({ success: true, data: data.data.wallets });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/wallets/transactions/all
 * List transactions for multiple wallets (walletIds must be subset of user's wallets).
 * Query: walletIds (comma-separated), transactionType, state
 */
router.get("/transactions/all", async (req: Request, res: Response) => {
    try {
      const userToken = getSession(req).circleUserToken!;
      const { walletIds, transactionType, state } = req.query;
      if (!walletIds || typeof walletIds !== "string") {
        return res
          .status(400)
          .json({ success: false, error: "walletIds query parameter is required" });
      }
      const walletIdsArray = walletIds.split(",").map((id) => id.trim());
      const list = await listWallets(userToken);
      const userWalletIds = new Set(list.data.wallets.map((w) => w.id));
      for (const id of walletIdsArray) {
        if (!userWalletIds.has(id)) {
          return res.status(403).json({
            success: false,
            error: `Wallet ${id} does not belong to the current user`,
          });
        }
      }
      const data = await listTransactions(userToken, {
        walletIds: walletIdsArray,
        txType: transactionType as "INBOUND" | "OUTBOUND" | undefined,
        state: state as string | undefined,
      });
      res.json({ success: true, data: data.data.transactions });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

/**
 * GET /api/wallets/transactions/:transactionId
 * Get a transaction by ID (must belong to one of user's wallets).
 */
router.get("/transactions/:transactionId", async (req: Request, res: Response) => {
    try {
      const userToken = getSession(req).circleUserToken!;
      const { transactionId } = req.params;
      const data = await getTransaction(userToken, transactionId);
      const tx = data.data.transaction;
      const list = await listWallets(userToken);
      const owned = list.data.wallets.some((w) => w.id === tx.walletId);
      if (!owned) {
        return res.status(403).json({
          success: false,
          error: "Transaction does not belong to the current user",
        });
      }
      res.json({ success: true, data: tx });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

/**
 * GET /api/wallets/:walletId
 * Get wallet details; walletId must belong to current user.
 */
router.get("/:walletId", async (req: Request, res: Response) => {
  try {
    const userToken = getSession(req).circleUserToken!;
    const { walletId } = req.params;
    await assertUserOwnsWallet(userToken, walletId);
    const data = await getWallet(userToken, walletId);
    res.json({ success: true, data: data.data.wallet });
  } catch (error: any) {
    if (error.message?.includes("does not belong")) {
      return res.status(403).json({ success: false, error: error.message });
    }
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/wallets/:walletId/balance
 * Get balance for wallet; walletId must belong to current user.
 */
router.get("/:walletId/balance", async (req: Request, res: Response) => {
    try {
      const userToken = getSession(req).circleUserToken!;
      const { walletId } = req.params;
      await assertUserOwnsWallet(userToken, walletId);
      const data = await getWalletBalance(userToken, walletId);
      res.json({ success: true, data: data.data.tokenBalances });
    } catch (error: any) {
      if (error.message?.includes("does not belong")) {
        return res.status(403).json({ success: false, error: error.message });
      }
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

/**
 * GET /api/wallets/:walletId/transactions
 * List transactions for wallet; walletId must belong to current user.
 * Query: transactionType (INBOUND | OUTBOUND), state
 */
router.get("/:walletId/transactions", async (req: Request, res: Response) => {
    try {
      const userToken = getSession(req).circleUserToken!;
      const { walletId } = req.params;
      const { transactionType, state } = req.query;
      await assertUserOwnsWallet(userToken, walletId);
      const data = await listTransactions(userToken, {
        walletIds: [walletId],
        txType: transactionType as "INBOUND" | "OUTBOUND" | undefined,
        state: state as string | undefined,
      });
      res.json({ success: true, data: data.data.transactions });
    } catch (error: any) {
      if (error.message?.includes("does not belong")) {
        return res.status(403).json({ success: false, error: error.message });
      }
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

/**
 * POST /api/wallets/:walletId/transfer
 * Prepare transfer: validate ownership and params, create Circle transfer challenge.
 * Returns { challengeId } for frontend to have user sign via Circle SDK.
 * Does NOT execute the transfer; user must sign in frontend.
 */
router.post("/:walletId/transfer", async (req: Request, res: Response) => {
    try {
      const userToken = getSession(req).circleUserToken!;
      const { walletId } = req.params;
      const { tokenId, destinationAddress, amount, feeLevel } = req.body;

      if (!tokenId || !destinationAddress || !amount) {
        return res.status(400).json({
          success: false,
          error: "Missing required fields: tokenId, destinationAddress, and amount are required",
        });
      }

      await assertUserOwnsWallet(userToken, walletId);

      const result = await createTransferChallenge(userToken, {
        walletId,
        tokenId,
        destinationAddress,
        amount: String(amount),
        feeLevel: feeLevel || "MEDIUM",
      });

      res.json({
        success: true,
        data: {
          challengeId: result.data.challengeId,
          message:
            "Use this challengeId with the Circle SDK to prompt the user to sign the transfer. The transfer is not executed until the user signs.",
        },
      });
    } catch (error: any) {
      if (error.message?.includes("does not belong")) {
        return res.status(403).json({ success: false, error: error.message });
      }
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

export default router;
