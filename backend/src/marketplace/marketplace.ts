/**
 * Marketplace Logic
 * 
 * Handles e-book purchases and marketplace operations
 */

import dotenv from 'dotenv';
import { EBook, PurchaseResult } from './types';
import { findEbookById, getEbookPrice, EBOOK_CATALOG } from './catalog';
import * as walletManager from '../wallet/walletManager';

dotenv.config();

// Marketplace wallet address (where payments are sent)
// This should be set in .env or use a default testnet address
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
  return purchasedIds.map(id => findEbookById(id)).filter((ebook): ebook is EBook => ebook !== undefined);
}

/**
 * Process an e-book purchase
 * 
 * This function:
 * 1. Validates the e-book exists
 * 2. Checks the buyer's balance
 * 3. Transfers USDC to marketplace wallet
 * 4. Returns purchase confirmation
 */
export async function processPurchase(
  ebookId: string,
  buyerWalletId: string,
  tokenId: string
): Promise<PurchaseResult> {
  try {
    // 1. Validate e-book exists
    const ebook = findEbookById(ebookId);
    if (!ebook) {
      return {
        success: false,
        ebook: {} as EBook,
        message: `E-book with ID ${ebookId} not found in the marketplace.`,
      };
    }

    // 2. Get e-book price
    const price = getEbookPrice(ebookId);
    if (price === null) {
      return {
        success: false,
        ebook,
        message: `Could not retrieve price for e-book "${ebook.title}".`,
      };
    }

    // 3. Check buyer's balance
    const balances = await walletManager.getWalletBalance(buyerWalletId);
    const usdcBalance = balances?.find(
      (b: any) => b.token.id === tokenId
    );

    if (!usdcBalance) {
      return {
        success: false,
        ebook,
        message: `Token ID ${tokenId} not found in wallet balance. Please check your balance first.`,
      };
    }

    const balanceAmount = parseFloat(usdcBalance.amount);
    if (balanceAmount < price) {
      return {
        success: false,
        ebook,
        message: `Insufficient balance. Required: ${price} USDC, Available: ${balanceAmount} ${usdcBalance.token.symbol}`,
      };
    }

    // 4. Transfer USDC to marketplace wallet
    if (!MARKETPLACE_WALLET_ADDRESS || MARKETPLACE_WALLET_ADDRESS === '0x0000000000000000000000000000000000000000') {
      return {
        success: false,
        ebook,
        message: 'Marketplace wallet address not configured. Please set MARKETPLACE_WALLET_ADDRESS in .env',
      };
    }

    const transferResult = await walletManager.transferTokens(
      buyerWalletId,
      tokenId,
      MARKETPLACE_WALLET_ADDRESS,
      price.toString(),
      'MEDIUM' // Use medium fee level for purchases
    );

    const transactionId = transferResult?.id || 'Unknown';
    const transactionHash = (transferResult as any)?.transactionHash || 'Pending';

    // 5. Record the purchase
    recordPurchase(buyerWalletId, ebookId);

    // 6. Return purchase confirmation
    return {
      success: true,
      ebook,
      transactionId,
      transactionHash,
      message: `Successfully purchased "${ebook.title}" by ${ebook.author} for ${price} USDC. Transaction ID: ${transactionId}`,
    };
  } catch (error: any) {
    return {
      success: false,
      ebook: {} as EBook,
      message: `Purchase failed: ${error.message || 'Unknown error'}`,
    };
  }
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