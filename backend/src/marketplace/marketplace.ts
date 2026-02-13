/**
 * Marketplace Logic
 *
 * User flows: preparePurchase (create challenge) + confirmPurchase (record after user signs).
 * Payments are sent to MARKETPLACE_WALLET_ADDRESS (any address you control). User wallets are 100% user-controlled.
 */

import dotenv from 'dotenv';
import { EBook } from './types';
import { findEbookById, getEbookPrice, EBOOK_CATALOG } from './catalog';

dotenv.config();

/** Marketplace treasury address (receives USDC from user purchases). Can be a dev-controlled wallet. */
const MARKETPLACE_WALLET_ADDRESS = process.env.MARKETPLACE_WALLET_ADDRESS || '0x0000000000000000000000000000000000000000';

/**
 * Purchase History Storage
 * In-memory storage for MVP (can be replaced with database later)
 * Format: Map<walletId, Set<ebookId>>
 */
const purchaseHistory = new Map<string, Set<string>>();

/**
 * Record a purchase
 */
function recordPurchase(walletId: string, ebookId: string) {
  if (!purchaseHistory.has(walletId)) {
    purchaseHistory.set(walletId, new Set());
  }
  purchaseHistory.get(walletId)!.add(ebookId);
}

/**
 * Check if an e-book has been purchased by a wallet
 */
export function isEbookPurchased(walletId: string, ebookId: string): boolean {
  return purchaseHistory.get(walletId)?.has(ebookId) || false;
}

/**
 * Get all purchased e-books for a wallet
 */
export function getPurchasedEbooks(walletId: string): EBook[] {
  const purchasedIds = Array.from(purchaseHistory.get(walletId) || []);
  return purchasedIds.map((id) => findEbookById(id)).filter((ebook): ebook is EBook => ebook !== undefined);
}

/**
 * Get marketplace configuration
 */
export function getMarketplaceConfig() {
  return {
    walletAddress: MARKETPLACE_WALLET_ADDRESS,
    totalEbooks: EBOOK_CATALOG.length,
  };
}

/**
 * Prepare purchase (user-controlled): validate e-book and balance, create transfer challenge.
 * Returns challengeId for frontend to have user sign. Does NOT execute or record purchase.
 */
export interface PreparePurchaseResult {
  success: boolean;
  challengeId?: string;
  ebook?: EBook;
  amount?: number;
  message: string;
}

export async function preparePurchase(
  ebookId: string,
  walletId: string,
  userToken: string
): Promise<PreparePurchaseResult> {
  const circleUser = await import("../circleUser/circleUserClient");
  const { getWalletBalance, createTransferChallenge } = circleUser;

  const ebook = findEbookById(ebookId);
  if (!ebook) {
    return { success: false, message: `E-book with ID ${ebookId} not found.` };
  }
  const price = getEbookPrice(ebookId);
  if (price === null) {
    return { success: false, ebook, message: `Could not get price for "${ebook.title}".` };
  }
  if (!MARKETPLACE_WALLET_ADDRESS || MARKETPLACE_WALLET_ADDRESS === "0x0000000000000000000000000000000000000000") {
    return { success: false, ebook, message: "Marketplace wallet not configured." };
  }
  const balanceRes = await getWalletBalance(userToken, walletId);
  const usdcBalance = balanceRes.data.tokenBalances?.find(
    (b: { token: { symbol: string } }) => b.token.symbol === "USDC" || b.token.symbol === "USDC-TESTNET"
  );
  if (!usdcBalance) {
    return { success: false, ebook, message: "No USDC balance. Use check_wallet_balance to get token ID." };
  }
  const balanceAmount = parseFloat(usdcBalance.amount);
  if (balanceAmount < price) {
    return {
      success: false,
      ebook,
      message: `Insufficient balance. Required: ${price} USDC, Available: ${balanceAmount} ${usdcBalance.token.symbol}`,
    };
  }
  try {
    const challenge = await createTransferChallenge(userToken, {
      walletId,
      tokenId: usdcBalance.token.id,
      destinationAddress: MARKETPLACE_WALLET_ADDRESS,
      amount: price.toString(),
      feeLevel: "MEDIUM",
    });
    return {
      success: true,
      challengeId: challenge.data.challengeId,
      ebook,
      amount: price,
      message: `Purchase prepared. User must sign in the app to complete payment of ${price} USDC for "${ebook.title}". Challenge ID: ${challenge.data.challengeId}`,
    };
  } catch (error: any) {
    return { success: false, ebook, message: `Failed to prepare transfer: ${error.message || "Unknown error"}` };
  }
}

/**
 * Confirm purchase (record only). Call after frontend has user sign and payment is sent.
 * Does not verify on-chain; caller is responsible for ensuring payment was completed.
 */
export function confirmPurchase(walletId: string, ebookId: string): void {
  recordPurchase(walletId, ebookId);
}