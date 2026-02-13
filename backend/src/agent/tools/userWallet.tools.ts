/**
 * Wallet tools that use Circle user API (user-controlled wallets).
 * Created per-request with the session's userToken so the agent only accesses that user's wallets.
 */

import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import {
  getWalletBalance,
  getWallet,
  listTransactions,
  getTransaction,
} from "../../circleUser/circleUserClient";
import { PENDING_ACTION_MARKER } from "../types";

export function createUserWalletTools(userToken: string) {
  const checkWalletBalanceTool = new DynamicStructuredTool({
    name: "check_wallet_balance",
    description:
      "Check the current USDC balance in the wallet. Returns the balance amount and token information.",
    schema: z.object({
      walletId: z.string().describe("The wallet ID to check balance for"),
    }),
    func: async ({ walletId }) => {
      try {
        const res = await getWalletBalance(userToken, walletId);
        const balances = res.data.tokenBalances;
        const usdcBalance = balances?.find(
          (b: { token: { symbol: string } }) => b.token.symbol === "USDC" || b.token.symbol === "USDC-TESTNET"
        );
        if (!usdcBalance) {
          return `No USDC balance found. Available tokens: ${balances?.map((b: { token: { symbol: string } }) => b.token.symbol).join(", ") || "none"}`;
        }
        return `Wallet balance: ${usdcBalance.amount} ${usdcBalance.token.symbol}. Token ID: ${usdcBalance.token.id}`;
      } catch (error: any) {
        return `Error checking balance: ${error.message || "Unknown error"}`;
      }
    },
  });

  const getWalletInfoTool = new DynamicStructuredTool({
    name: "get_wallet_info",
    description:
      "Get detailed information about a wallet including address and blockchain.",
    schema: z.object({
      walletId: z.string().describe("The wallet ID to get information for"),
    }),
    func: async ({ walletId }) => {
      try {
        const res = await getWallet(userToken, walletId);
        const w = res.data.wallet;
        return `Wallet Info:
- Address: ${w.address}
- Blockchain: ${w.blockchain}
- Type: ${w.accountType || "N/A"}
- State: ${w.state}
- Wallet Set ID: ${w.walletSetId || "N/A"}`;
      } catch (error: any) {
        return `Error getting wallet info: ${error.message || "Unknown error"}`;
      }
    },
  });

  const listTransactionsTool = new DynamicStructuredTool({
    name: "list_transactions",
    description:
      "Get transaction history for a wallet. Can filter by transaction type (INBOUND/OUTBOUND) and state.",
    schema: z.object({
      walletId: z.string().describe("The wallet ID to get transactions for"),
      transactionType: z.enum(["INBOUND", "OUTBOUND"]).optional().describe("Filter by type"),
      state: z.string().optional().describe("Filter by transaction state"),
    }),
    func: async ({ walletId, transactionType, state }) => {
      try {
        const res = await listTransactions(userToken, {
          walletIds: [walletId],
          txType: transactionType,
          state,
        });
        const transactions = res.data.transactions || [];
        if (transactions.length === 0) {
          return "No transactions found for this wallet.";
        }
        const list = transactions
          .map(
            (tx: { transactionType: string; amounts: string[]; blockchain: string; state: string; sourceAddress?: string; destinationAddress?: string; createDate: string; id: string }, i: number) =>
              `${i + 1}. ${tx.transactionType} - ${tx.amounts.join(", ")} ${tx.blockchain}\n   State: ${tx.state}\n   From: ${tx.sourceAddress || "N/A"}\n   To: ${tx.destinationAddress || "N/A"}\n   Date: ${new Date(tx.createDate).toLocaleString()}\n   Transaction ID: ${tx.id}`
          )
          .join("\n\n");
        return `Transactions (${transactions.length}):\n\n${list}`;
      } catch (error: any) {
        return `Error listing transactions: ${error.message || "Unknown error"}`;
      }
    },
  });

  const getTransactionTool = new DynamicStructuredTool({
    name: "get_transaction",
    description:
      "Get detailed information about a specific transaction by its transaction ID.",
    schema: z.object({
      transactionId: z.string().describe("The transaction ID to get details for"),
    }),
    func: async ({ transactionId }) => {
      try {
        const res = await getTransaction(userToken, transactionId);
        const tx = res.data.transaction;
        const txHash = tx.txHash
          ? `\nTransaction Hash: ${tx.txHash}\nExplorer: https://testnet.arcscan.app/tx/${tx.txHash}`
          : "";
        return `Transaction Details:
ID: ${tx.id}
Type: ${tx.transactionType}
State: ${tx.state}
Blockchain: ${tx.blockchain}
Amount: ${tx.amounts.join(", ")}
From: ${tx.sourceAddress || "N/A"}
To: ${tx.destinationAddress || "N/A"}
Created: ${new Date(tx.createDate).toLocaleString()}
Updated: ${new Date(tx.updateDate).toLocaleString()}${txHash}
Wallet ID: ${tx.walletId}`;
      } catch (error: any) {
        return `Error getting transaction: ${error.message || "Unknown error"}`;
      }
    },
  });

  const transferTokensTool = new DynamicStructuredTool({
    name: "transfer_tokens",
    description:
      "Prepare a USDC transfer from the wallet to another address. Validates balance; returns a pending action so the user can sign in the app. Does not execute until the user signs.",
    schema: z.object({
      walletId: z.string().describe("The source wallet ID to transfer from"),
      tokenId: z.string().describe("The token ID (from check_wallet_balance - Token ID for USDC)"),
      destinationAddress: z.string().describe("The destination address (0x format)"),
      amount: z.string().describe("The amount to transfer (e.g. '0.1')"),
      feeLevel: z.enum(["LOW", "MEDIUM", "HIGH"]).optional().describe("Fee level (default: MEDIUM)"),
    }),
    func: async ({ walletId, tokenId, destinationAddress, amount, feeLevel = "MEDIUM" }) => {
      try {
        const res = await getWalletBalance(userToken, walletId);
        const usdcBalance = res.data.tokenBalances?.find((b: { token: { id: string } }) => b.token.id === tokenId);
        if (!usdcBalance) {
          return `Error: Token ID ${tokenId} not found in wallet balance. Use check_wallet_balance to get the correct token ID.`;
        }
        const balanceAmount = parseFloat(usdcBalance.amount);
        const transferAmount = parseFloat(amount);
        if (balanceAmount < transferAmount) {
          return `Error: Insufficient balance. Current: ${usdcBalance.amount} ${usdcBalance.token.symbol}. Requested: ${amount}`;
        }
        const pendingAction = {
          type: "transfer" as const,
          walletId,
          tokenId,
          destinationAddress,
          amount,
          feeLevel,
        };
        const payload = `${PENDING_ACTION_MARKER}${JSON.stringify(pendingAction)}${PENDING_ACTION_MARKER}\n\nTransfer of ${amount} USDC to ${destinationAddress.slice(0, 10)}... prepared. Please confirm in the app to complete.`;
        return payload;
      } catch (error: any) {
        return `Error preparing transfer: ${error.message || "Unknown error"}`;
      }
    },
  });

  return [
    checkWalletBalanceTool,
    getWalletInfoTool,
    listTransactionsTool,
    getTransactionTool,
    transferTokensTool,
  ];
}
