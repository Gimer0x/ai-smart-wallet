/**
 * Wallet Tools for the AI Agent
 * 
 * Tools that allow the agent to interact with the wallet
 */

import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import * as walletManager from "../../wallet/walletManager";

/**
 * Tool to check wallet balance
 */
export const checkWalletBalanceTool = new DynamicStructuredTool({
  name: "check_wallet_balance",
  description: "Check the current USDC balance in the wallet. Returns the balance amount and token information.",
  schema: z.object({
    walletId: z.string().describe("The wallet ID to check balance for"),
  }),
  func: async ({ walletId }) => {
    try {
      const balances = await walletManager.getWalletBalance(walletId);
      
      // Find USDC balance
      const usdcBalance = balances?.find(
        (b: any) => b.token.symbol === "USDC" || b.token.symbol === "USDC-TESTNET"
      );

      if (!usdcBalance) {
        return `No USDC balance found. Available tokens: ${balances?.map((b: any) => b.token.symbol).join(", ") || "none"}`;
      }

      return `Wallet balance: ${usdcBalance.amount} ${usdcBalance.token.symbol}. Token ID: ${usdcBalance.token.id}`;
    } catch (error: any) {
      return `Error checking balance: ${error.message || "Unknown error"}`;
    }
  },
});

/**
 * Tool to get wallet information
 */
export const getWalletInfoTool = new DynamicStructuredTool({
  name: "get_wallet_info",
  description: "Get detailed information about a wallet including address and blockchain.",
  schema: z.object({
    walletId: z.string().describe("The wallet ID to get information for"),
  }),
  func: async ({ walletId }) => {
    try {
      const wallet = await walletManager.getWallet(walletId);
      
      if (!wallet) {
        return "Wallet not found.";
      }

      const walletData = wallet as any;
      return `Wallet Info:
- Address: ${walletData.address}
- Blockchain: ${walletData.blockchain}
- Type: ${walletData.accountType || 'N/A'}
- State: ${walletData.state}
- Wallet Set ID: ${walletData.walletSetId}`;
    } catch (error: any) {
      return `Error getting wallet info: ${error.message || "Unknown error"}`;
    }
  },
});

/**
 * Tool to list transactions with optional filters
 */
export const listTransactionsTool = new DynamicStructuredTool({
  name: "list_transactions",
  description: "Get transaction history for a wallet. Can filter by transaction type (INBOUND/OUTBOUND) and state. Returns detailed transaction information.",
  schema: z.object({
    walletId: z.string().describe("The wallet ID to get transactions for"),
    transactionType: z.enum(["INBOUND", "OUTBOUND"]).optional().describe("Filter by transaction type: INBOUND (received) or OUTBOUND (sent)"),
    state: z.string().optional().describe("Filter by transaction state (e.g., COMPLETE, CONFIRMED, PENDING)"),
  }),
  func: async ({ walletId, transactionType, state }) => {
    try {
      const transactions = await walletManager.listTransactions(
        [walletId],
        transactionType,
        state
      );
      
      if (!transactions || transactions.length === 0) {
        return "No transactions found for this wallet.";
      }

      const transactionList = transactions.map((tx: any, index: number) => {
        const txHash = tx.txHash ? `\n   Hash: ${tx.txHash}` : '';
        const explorerLink = tx.txHash ? `\n   Explorer: https://testnet.arcscan.app/tx/${tx.txHash}` : '';
        return `${index + 1}. ${tx.transactionType} - ${tx.amounts.join(", ")} ${tx.blockchain}
   State: ${tx.state}
   From: ${tx.sourceAddress || "N/A"}
   To: ${tx.destinationAddress || "N/A"}${txHash}${explorerLink}
   Date: ${new Date(tx.createDate).toLocaleString()}
   Transaction ID: ${tx.id}`;
      }).join("\n\n");

      return `Transactions (${transactions.length}):\n\n${transactionList}`;
    } catch (error: any) {
      return `Error listing transactions: ${error.message || "Unknown error"}`;
    }
  },
});

/**
 * Tool to get a specific transaction by ID
 */
export const getTransactionTool = new DynamicStructuredTool({
  name: "get_transaction",
  description: "Get detailed information about a specific transaction by its transaction ID. Returns complete transaction details including hash, addresses, amounts, and status.",
  schema: z.object({
    transactionId: z.string().describe("The transaction ID to get details for"),
  }),
  func: async ({ transactionId }) => {
    try {
      const transaction = await walletManager.getTransaction(transactionId);
      
      if (!transaction) {
        return "Transaction not found.";
      }

      const tx = transaction as any;
      const txHash = tx.txHash ? `\nTransaction Hash: ${tx.txHash}\nExplorer: https://testnet.arcscan.app/tx/${tx.txHash}` : '';

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

/**
 * Tool to transfer tokens (send USDC)
 */
export const transferTokensTool = new DynamicStructuredTool({
  name: "transfer_tokens",
  description: "Transfer USDC tokens from the wallet to another address. Requires wallet ID, token ID (from balance), destination address, and amount. Always check balance first to ensure sufficient funds and get the correct token ID.",
  schema: z.object({
    walletId: z.string().describe("The source wallet ID to transfer from"),
    tokenId: z.string().describe("The token ID to transfer (get this from check_wallet_balance tool - it's the Token ID for USDC)"),
    destinationAddress: z.string().describe("The destination wallet address (0x format) to send tokens to"),
    amount: z.string().describe("The amount to transfer as a string (e.g., '0.1' for 0.1 USDC)"),
    feeLevel: z.enum(["LOW", "MEDIUM", "HIGH"]).optional().describe("Transaction fee level (default: MEDIUM)"),
  }),
  func: async ({ walletId, tokenId, destinationAddress, amount, feeLevel = "MEDIUM" }) => {
    try {
      // First, check balance to ensure sufficient funds
      const balances = await walletManager.getWalletBalance(walletId);
      const usdcBalance = balances?.find(
        (b: any) => b.token.id === tokenId
      );

      if (!usdcBalance) {
        return `Error: Token ID ${tokenId} not found in wallet balance. Please use check_wallet_balance to get the correct token ID.`;
      }

      const balanceAmount = parseFloat(usdcBalance.amount);
      const transferAmount = parseFloat(amount);

      if (balanceAmount < transferAmount) {
        return `Error: Insufficient balance. Current balance: ${usdcBalance.amount} ${usdcBalance.token.symbol}. Attempted transfer: ${amount} ${usdcBalance.token.symbol}`;
      }

      // Execute the transfer
      const result = await walletManager.transferTokens(
        walletId,
        tokenId,
        destinationAddress,
        amount,
        feeLevel
      );

      const transactionId = result?.id || "Unknown";
      const state = result?.state || "INITIATED";

      return `Transfer initiated successfully!
Transaction ID: ${transactionId}
State: ${state}
Amount: ${amount} ${usdcBalance.token.symbol}
From: ${walletId}
To: ${destinationAddress}
Fee Level: ${feeLevel}

Note: The transaction is ${state}. It may take a few moments to complete. Use get_transaction with ID ${transactionId} to check the status.`;
    } catch (error: any) {
      return `Error transferring tokens: ${error.message || "Unknown error"}`;
    }
  },
});

// Export all wallet tools
export const walletTools = [
  checkWalletBalanceTool,
  getWalletInfoTool,
  listTransactionsTool,
  getTransactionTool,
  transferTokensTool,
];