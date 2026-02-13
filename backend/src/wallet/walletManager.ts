/**
 * App wallet module (optional).
 *
 * Uses Circle Developer-Controlled Wallets with Entity Secret for ONE app wallet only
 * (e.g. marketplace treasury). All user flows use the Circle user API and session;
 * this module is NOT used for user wallets.
 *
 * If CIRCLE_ENTITY_SECRET is not set, the client is not initialized and any function
 * call will throw. Use only for admin/treasury operations (see backend/src/admin/).
 */

import { initiateDeveloperControlledWalletsClient } from "@circle-fin/developer-controlled-wallets";
import dotenv from "dotenv";

dotenv.config();

const API_KEY = process.env.CIRCLE_API_KEY;
const ENTITY_SECRET = process.env.CIRCLE_ENTITY_SECRET;

function getClient() {
  if (!API_KEY || !ENTITY_SECRET) {
    throw new Error(
      "App wallet requires CIRCLE_API_KEY and CIRCLE_ENTITY_SECRET. These are optional and only for app/treasury wallet. User flows use Circle user API."
    );
  }
  return initiateDeveloperControlledWalletsClient({
    apiKey: API_KEY,
    entitySecret: ENTITY_SECRET,
  });
}

/** Lazy client for app wallet only (do not use for user wallets) */
export function getCircleClient() {
  return getClient();
}

export async function createWalletSet(name: string) {
  const response = await getClient().createWalletSet({ name });
  return response.data?.walletSet;
}

export async function createWallets(
  walletSetId: string,
  blockchains: string[],
  count: number = 1,
  accountType: "SCA" | "EOA" = "SCA"
) {
  const response = await getClient().createWallets({
    walletSetId,
    blockchains: blockchains as any,
    count,
    accountType,
  });
  return response.data?.wallets;
}

export async function getWallet(walletId: string) {
  const response = await getClient().getWallet({ id: walletId });
  return response.data?.wallet;
}

export async function listWallets(walletSetId: string) {
  const response = await getClient().listWallets({ walletSetId });
  return response.data?.wallets;
}

export async function getWalletBalance(walletId: string, tokenAddress?: string) {
  const response = await getClient().getWalletTokenBalance({
    id: walletId,
    ...(tokenAddress && { tokenAddresses: [tokenAddress] }),
  });
  return response.data?.tokenBalances;
}

export async function listTransactions(
  walletIds: string[],
  transactionType?: "INBOUND" | "OUTBOUND",
  state?: string
) {
  const response = await getClient().listTransactions({
    walletIds,
    ...(transactionType && { transactionType: transactionType as any }),
    ...(state && { state: state as any }),
  });
  return response.data?.transactions;
}

export async function getTransaction(transactionId: string) {
  const response = await getClient().getTransaction({ id: transactionId });
  return response.data?.transaction;
}

export async function listAllWallets() {
  const response = await getClient().listWallets({});
  return response.data?.wallets;
}

export async function transferTokens(
  walletId: string,
  tokenId: string,
  destinationAddress: string,
  amount: string,
  feeLevel: "LOW" | "MEDIUM" | "HIGH" = "MEDIUM",
  idempotencyKey?: string
) {
  const idempotency = idempotencyKey || crypto.randomUUID();
  const response = await getClient().createTransaction({
    walletId,
    tokenId,
    destinationAddress,
    amount: [amount],
    fee: { type: "level", config: { feeLevel } },
    idempotencyKey: idempotency,
  });
  return response.data;
}
