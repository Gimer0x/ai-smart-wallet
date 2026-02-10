/**
 * Wallet Manager Module
 * 
 * Handles Circle Developer-Controlled Wallet operations.
 * The SDK automatically handles Entity Secret ciphertext rotation.
 */

import { initiateDeveloperControlledWalletsClient } from "@circle-fin/developer-controlled-wallets";
import dotenv from "dotenv";

dotenv.config();

const API_KEY = process.env.CIRCLE_API_KEY;
const ENTITY_SECRET = process.env.CIRCLE_ENTITY_SECRET;

if (!API_KEY || !ENTITY_SECRET) {
  throw new Error(
    "Missing required environment variables: CIRCLE_API_KEY and CIRCLE_ENTITY_SECRET must be set"
  );
}

// Initialize the Circle SDK client
// The SDK automatically handles Entity Secret ciphertext rotation for each request
export const circleClient = initiateDeveloperControlledWalletsClient({
  apiKey: API_KEY,
  entitySecret: ENTITY_SECRET,
});

/**
 * Create a new wallet set
 * A wallet set is a collection of wallets managed by a single cryptographic key
 */
export async function createWalletSet(name: string) {
  try {
    const response = await circleClient.createWalletSet({
      name,
    });
    return response.data?.walletSet;
  } catch (error: any) {
    throw new Error(`Failed to create wallet set: ${error.message || error}`);
  }
}

/**
 * Create wallets on a specific blockchain
 * @param walletSetId - The ID of the wallet set
 * @param blockchains - Array of blockchain codes (e.g., ["ARC-TESTNET"])
 * @param count - Number of wallets to create
 * @param accountType - "SCA" (Smart Contract Account) or "EOA" (Externally Owned Account)
 */
export async function createWallets(
  walletSetId: string,
  blockchains: string[],
  count: number = 1,
  accountType: "SCA" | "EOA" = "SCA"
) {
  try {
    const response = await circleClient.createWallets({
      walletSetId,
      blockchains: blockchains as any, // SDK expects specific blockchain types
      count,
      accountType,
    });
    return response.data?.wallets;
  } catch (error: any) {
    throw new Error(`Failed to create wallets: ${error.message || error}`);
  }
}

/**
 * Get wallet details by ID
 */
export async function getWallet(walletId: string) {
  try {
    const response = await circleClient.getWallet({
      id: walletId,
    });
    return response.data?.wallet;
  } catch (error: any) {
    throw new Error(`Failed to get wallet: ${error.message || error}`);
  }
}

/**
 * List all wallets in a wallet set
 */
export async function listWallets(walletSetId: string) {
  try {
    const response = await circleClient.listWallets({
      walletSetId,
    });
    return response.data?.wallets;
  } catch (error: any) {
    throw new Error(`Failed to list wallets: ${error.message || error}`);
  }
}

/**
 * Get wallet balance
 */
export async function getWalletBalance(walletId: string, tokenAddress?: string) {
  try {
    const response = await circleClient.getWalletTokenBalance({
      id: walletId,
      ...(tokenAddress && { tokenAddresses: [tokenAddress] }),
    });
    return response.data?.tokenBalances;
  } catch (error: any) {
    throw new Error(`Failed to get wallet balance: ${error.message || error}`);
  }
}

/**
 * List transactions for one or more wallets
 * @param walletIds - Array of wallet IDs to get transactions for
 * @param transactionType - Optional filter: "INBOUND" or "OUTBOUND"
 * @param state - Optional filter: transaction state (e.g., "COMPLETED", "CONFIRMED", "PENDING")
 */
export async function listTransactions(
  walletIds: string[],
  transactionType?: "INBOUND" | "OUTBOUND",
  state?: string
) {
  try {
    const response = await circleClient.listTransactions({
      walletIds,
      ...(transactionType && { transactionType: transactionType as any }), // SDK expects specific type
      ...(state && { state: state as any }), // SDK expects specific TransactionState type
    });
    return response.data?.transactions;
  } catch (error: any) {
    throw new Error(`Failed to list transactions: ${error.message || error}`);
  }
}

/**
 * Get a specific transaction by ID
 */
export async function getTransaction(transactionId: string) {
  try {
    const response = await circleClient.getTransaction({
      id: transactionId,
    });
    return response.data?.transaction;
  } catch (error: any) {
    throw new Error(`Failed to get transaction: ${error.message || error}`);
  }
}

/**
 * List all wallets (across all wallet sets)
 */
export async function listAllWallets() {
  try {
    const response = await circleClient.listWallets({});
    return response.data?.wallets;
  } catch (error: any) {
    throw new Error(`Failed to list wallets: ${error.message || error}`);
  }
}

/**
 * Transfer tokens from one wallet to another
 * @param walletId - Source wallet ID
 * @param tokenId - Token ID to transfer (from wallet balance)
 * @param destinationAddress - Destination wallet address
 * @param amount - Amount to transfer (as string, e.g., "0.01")
 * @param feeLevel - Fee level: "LOW", "MEDIUM", or "HIGH" (default: "MEDIUM")
 * @param idempotencyKey - Optional UUID v4 idempotency key (auto-generated if not provided)
 */
export async function transferTokens(
  walletId: string,
  tokenId: string,
  destinationAddress: string,
  amount: string,
  feeLevel: "LOW" | "MEDIUM" | "HIGH" = "MEDIUM",
  idempotencyKey?: string
) {
  try {
    // Generate idempotency key if not provided
    const idempotency = idempotencyKey || crypto.randomUUID();

    const response = await circleClient.createTransaction({
      walletId,
      tokenId,
      destinationAddress,
      amount: [amount], // SDK expects 'amount' (singular) as array
      fee: {
        type: "level",
        config: {
          feeLevel,
        },
      },
      idempotencyKey: idempotency,
    });
    return response.data;
  } catch (error: any) {
    throw new Error(`Failed to transfer tokens: ${error.message || error}`);
  }
}