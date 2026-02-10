/**
 * Check Transactions Script
 * 
 * Lists transactions for one or more wallets to check for inbound transfers.
 * 
 * Usage:
 *   npm run check:transactions <wallet-id>
 *   npm run check:transactions <wallet-id-1>,<wallet-id-2>
 *   npm run check:transactions --all
 * 
 * Examples:
 *   npm run check:transactions d72a977e-89fd-550a-8e19-5924ec395a74
 *   npm run check:transactions d72a977e-89fd-550a-8e19-5924ec395a74,9e70628e-d11b-58a5-ab2e-c52a89548b1a
 *   npm run check:transactions --all
 */

import { listAllWallets, listTransactions } from "../wallet/walletManager";
import dotenv from "dotenv";

dotenv.config();

async function main() {
  const args = process.argv.slice(2);
  
  // Check if --all flag is present (npm passes it as a separate argument)
  const allFlagIndex = args.findIndex((arg) => arg === "--all" || arg === "all");
  const hasAllFlag = allFlagIndex !== -1;
  
  // Remove --all from args if present
  const filteredArgs = args.filter((arg, idx) => idx !== allFlagIndex);
  
  const walletIdsArg = hasAllFlag ? "--all" : filteredArgs[0];
  const transactionType = filteredArgs[hasAllFlag ? 0 : 1] as "INBOUND" | "OUTBOUND" | undefined;
  const state = filteredArgs[hasAllFlag ? 1 : 2] as string | undefined;

  try {
    let walletIds: string[] = [];

    if (walletIdsArg === "--all" || hasAllFlag) {
      // List all wallets and get their transactions
      console.log("📋 Fetching all wallets...\n");
      const wallets = await listAllWallets();
      
      if (!wallets || wallets.length === 0) {
        console.log("❌ No wallets found. Create wallets first using:");
        console.log("   npm run create:wallets <wallet-set-id>\n");
        process.exit(1);
      }

      walletIds = wallets.map((w) => w.id);
      console.log(`Found ${wallets.length} wallet(s)\n`);
    } else if (walletIdsArg) {
      // Use provided wallet IDs (comma-separated)
      walletIds = walletIdsArg.split(",").map((id) => id.trim());
    } else {
      console.error("❌ Error: Wallet ID(s) required");
      console.log("\nUsage:");
      console.log("  npm run check:transactions <wallet-id>");
      console.log("  npm run check:transactions <wallet-id-1>,<wallet-id-2>");
      console.log("  npm run check:transactions --all");
      console.log("\nOptional filters:");
      console.log("  Add 'INBOUND' or 'OUTBOUND' as second argument");
      console.log("  Add state (e.g., 'COMPLETED', 'CONFIRMED') as third argument");
      console.log("\nExamples:");
      console.log("  npm run check:transactions d72a977e-89fd-550a-8e19-5924ec395a74");
      console.log("  npm run check:transactions d72a977e-89fd-550a-8e19-5924ec395a74 INBOUND");
      console.log("  npm run check:transactions --all INBOUND COMPLETED");
      process.exit(1);
    }

    console.log("🔍 Checking transactions...\n");
    console.log(`Wallet IDs: ${walletIds.join(", ")}`);
    if (transactionType) console.log(`Transaction Type: ${transactionType}`);
    if (state) console.log(`State: ${state}`);
    console.log();

    const transactions = await listTransactions(walletIds, transactionType, state);

    if (!transactions || transactions.length === 0) {
      console.log("📭 No transactions found");
      if (transactionType || state) {
        console.log("   Try removing filters to see all transactions\n");
      } else {
        console.log("   Make sure you've sent testnet tokens to your wallet addresses\n");
      }
      process.exit(0);
    }

    console.log(`✅ Found ${transactions.length} transaction(s)\n`);
    console.log("=".repeat(80));

    transactions.forEach((tx, index) => {
      console.log(`\nTransaction ${index + 1}:`);
      console.log(`  ID: ${tx.id}`);
      console.log(`  Type: ${tx.transactionType}`);
      console.log(`  State: ${tx.state}`);
      console.log(`  Blockchain: ${tx.blockchain}`);
      console.log(`  Wallet ID: ${tx.walletId}`);
      
      if (tx.sourceAddress) {
        console.log(`  From: ${tx.sourceAddress}`);
      }
      if (tx.destinationAddress) {
        console.log(`  To: ${tx.destinationAddress}`);
      }
      
      if (tx.amounts && tx.amounts.length > 0) {
        console.log(`  Amounts: ${tx.amounts.join(", ")}`);
      }
      
      if (tx.txHash) {
        console.log(`  Transaction Hash: ${tx.txHash}`);
        // Generate blockchain explorer URL
        let explorerUrl = "";
        if (tx.blockchain === "ARC-TESTNET") {
          explorerUrl = `https://testnet.arcscan.app/tx/${tx.txHash}`;
        } else if (tx.blockchain?.includes("MATIC")) {
          explorerUrl = `https://amoy.polygonscan.com/tx/${tx.txHash}`;
        } else if (tx.blockchain?.includes("ETH")) {
          explorerUrl = `https://sepolia.etherscan.io/tx/${tx.txHash}`;
        }
        if (explorerUrl) {
          console.log(`  Explorer: ${explorerUrl}`);
        }
      }
      
      if (tx.blockHeight) {
        console.log(`  Block Height: ${tx.blockHeight}`);
      }
      
      if (tx.networkFee) {
        console.log(`  Network Fee: ${tx.networkFee}`);
      }
      
      console.log(`  Created: ${tx.createDate}`);
      console.log(`  Updated: ${tx.updateDate}`);
    });

    console.log("\n" + "=".repeat(80));
    console.log("\n💡 Tip: Use the transaction hash to view details on the blockchain explorer\n");
  } catch (error: any) {
    console.error("❌ Error checking transactions:");
    console.error(`   ${error.message}\n`);
    console.log("Troubleshooting:");
    console.log("   - Verify your Wallet ID(s) are correct");
    console.log("   - Verify your CIRCLE_API_KEY is correct");
    console.log("   - Verify your CIRCLE_ENTITY_SECRET is correct");
    console.log("   - Check that you're using the correct environment (sandbox vs production)\n");
    process.exit(1);
  }
}

main();

