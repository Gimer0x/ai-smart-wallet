/**
 * Wallet API Routes
 */

import { Router, Request, Response } from "express";
import {
  listAllWallets,
  getWallet,
  listTransactions,
  getTransaction,
  getWalletBalance,
  transferTokens,
} from "../wallet/walletManager";
import { apiKeyAuth } from "../middleware/auth";

const router = Router();

// Apply API key authentication to all wallet routes
router.use(apiKeyAuth);

/**
 * GET /api/wallets
 * List all wallets
 */
router.get("/", async (req: Request, res: Response) => {
  try {
    const wallets = await listAllWallets();
    res.json({ success: true, data: wallets });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/wallets/:walletId
 * Get wallet details by ID
 */
router.get("/:walletId", async (req: Request, res: Response) => {
  try {
    const { walletId } = req.params;
    const wallet = await getWallet(walletId);
    res.json({ success: true, data: wallet });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/wallets/:walletId/balance
 * Get wallet balance
 */
router.get("/:walletId/balance", async (req: Request, res: Response) => {
  try {
    const { walletId } = req.params;
    const { tokenAddress } = req.query;
    const balance = await getWalletBalance(
      walletId,
      tokenAddress as string | undefined
    );
    res.json({ success: true, data: balance });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/wallets/:walletId/transactions
 * List transactions for a wallet
 * Query params:
 *   - transactionType: "INBOUND" | "OUTBOUND"
 *   - state: transaction state filter
 */
router.get("/:walletId/transactions", async (req: Request, res: Response) => {
  try {
    const { walletId } = req.params;
    const { transactionType, state } = req.query;

    const transactions = await listTransactions(
      [walletId],
      transactionType as "INBOUND" | "OUTBOUND" | undefined,
      state as string | undefined
    );
    res.json({ success: true, data: transactions });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/transactions
 * List transactions for multiple wallets
 * Query params:
 *   - walletIds: comma-separated wallet IDs
 *   - transactionType: "INBOUND" | "OUTBOUND"
 *   - state: transaction state filter
 */
router.get("/transactions/all", async (req: Request, res: Response) => {
  try {
    const { walletIds, transactionType, state } = req.query;

    if (!walletIds) {
      return res
        .status(400)
        .json({ success: false, error: "walletIds query parameter is required" });
    }

    const walletIdsArray = (walletIds as string).split(",").map((id) => id.trim());

    const transactions = await listTransactions(
      walletIdsArray,
      transactionType as "INBOUND" | "OUTBOUND" | undefined,
      state as string | undefined
    );
    res.json({ success: true, data: transactions });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/transactions/:transactionId
 * Get a specific transaction by ID
 */
router.get("/transactions/:transactionId", async (req: Request, res: Response) => {
  try {
    const { transactionId } = req.params;
    const transaction = await getTransaction(transactionId);
    res.json({ success: true, data: transaction });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/wallets/:walletId/transfer
 * Transfer tokens from a wallet to another address
 * Body:
 *   - tokenId: Token ID to transfer
 *   - destinationAddress: Destination wallet address
 *   - amount: Amount to transfer (as string)
 *   - feeLevel: "LOW", "MEDIUM", or "HIGH" (optional, default: "MEDIUM")
 *   - idempotencyKey: Optional UUID v4 (auto-generated if not provided)
 */
router.post("/:walletId/transfer", async (req: Request, res: Response) => {
  try {
    const { walletId } = req.params;
    const { tokenId, destinationAddress, amount, feeLevel, idempotencyKey } = req.body;

    // Validate required fields
    if (!tokenId || !destinationAddress || !amount) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: tokenId, destinationAddress, and amount are required",
      });
    }

    const result = await transferTokens(
      walletId,
      tokenId,
      destinationAddress,
      amount,
      feeLevel || "MEDIUM",
      idempotencyKey
    );

    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;