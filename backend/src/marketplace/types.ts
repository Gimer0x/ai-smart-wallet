/**
 * Marketplace Type Definitions
 */

export interface EBook {
  id: string;
  title: string;
  author: string;
  price: number; // Price in USDC
  description: string;
  category?: string;
}

export interface PurchaseResult {
  success: boolean;
  ebook: EBook;
  transactionId?: string;
  transactionHash?: string;
  message: string;
}

export interface MarketplaceConfig {
  walletAddress: string; // Marketplace wallet address to receive payments
}