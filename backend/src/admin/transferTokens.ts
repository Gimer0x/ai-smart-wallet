/**
 * Transfer Tokens Script
 * 
 * Transfers tokens from one wallet to another.
 * 
 * Usage:
 *   npm run transfer:tokens <wallet-id> <token-id> <destination-address> <amount> [fee-level]
 * 
 * Examples:
 *   npm run transfer:tokens d72a977e-89fd-550a-8e19-5924ec395a74 7adb2b7d-c9cd-5164-b2d4-b73b088274dc 0x75f100ee75a0e529aacced263de7a8f0e9f9c2a2 0.1 MEDIUM
 *   npm run transfer:tokens d72a977e-89fd-550a-8e19-5924ec395a74 7adb2b7d-c9cd-5164-b2d4-b73b088274dc 0x75f100ee75a0e529aacced263de7a8f0e9f9c2a2 0.1
 */

import { transferTokens, getWalletBalance, getTransaction } from "../wallet/walletManager";
import dotenv from "dotenv";

dotenv.config();

async function main() {
  const args = process.argv.slice(2);
  const walletId = args[0];
  const tokenId = args[1];
  const destinationAddress = args[2];
  const amount = args[3];
  const feeLevel = (args[4] as "LOW" | "MEDIUM" | "HIGH") || "MEDIUM";

  if (!walletId || !tokenId || !destinationAddress || !amount) {
    console.error("❌ Error: Missing required parameters");
    console.log("\nUsage:");
    console.log("  npm run transfer:tokens <wallet-id> <token-id> <destination-address> <amount> [fee-level]");
    console.log("\nParameters:");
    console.log("  wallet-id: Source wallet ID (required)");
    console.log("  token-id: Token ID to transfer (required)");
    console.log("  destination-address: Destination wallet address (required)");
    console.log("  amount: Amount to transfer, e.g., '0.1' or '1' (required)");
    console.log("  fee-level: LOW, MEDIUM, or HIGH (optional, default: MEDIUM)");
    console.log("\nExample:");
    console.log("  npm run transfer:tokens d72a977e-89fd-550a-8e19-5924ec395a74 7adb2b7d-c9cd-5164-b2d4-b73b088274dc 0x75f100ee75a0e529aacced263de7a8f0e9f9c2a2 0.1 MEDIUM");
    console.log("\n💡 Tip: Get token ID from wallet balance:");
    console.log("   curl http://localhost:3001/api/wallets/<wallet-id>/balance");
    process.exit(1);
  }

  // Validate fee level
  if (feeLevel && !["LOW", "MEDIUM", "HIGH"].includes(feeLevel)) {
    console.error(`❌ Error: Invalid fee level '${feeLevel}'. Must be LOW, MEDIUM, or HIGH`);
    process.exit(1);
  }

  console.log("💸 Initiating token transfer...\n");
  console.log(`Source Wallet ID: ${walletId}`);
  console.log(`Token ID: ${tokenId}`);
  console.log(`Destination: ${destinationAddress}`);
  console.log(`Amount: ${amount}`);
  console.log(`Fee Level: ${feeLevel}\n`);

  try {
    // Check source wallet balance first
    console.log("📊 Checking source wallet balance...");
    const balances = await getWalletBalance(walletId);
    const tokenBalance = balances?.find((b: any) => b.token?.id === tokenId);
    
    if (tokenBalance) {
      console.log(`   Current balance: ${tokenBalance.amount} ${tokenBalance.token?.symbol || ""}`);
      const balanceNum = parseFloat(tokenBalance.amount);
      const amountNum = parseFloat(amount);
      
      if (balanceNum < amountNum) {
        console.warn(`   ⚠️  Warning: Insufficient balance! Trying to send ${amount} but only have ${tokenBalance.amount}`);
      }
    } else {
      console.warn(`   ⚠️  Warning: Token ID ${tokenId} not found in wallet balance`);
    }
    console.log();

    // Initiate transfer
    console.log("🚀 Creating transfer transaction...");
    const result = await transferTokens(
      walletId,
      tokenId,
      destinationAddress,
      amount,
      feeLevel
    );

    if (result) {
      const transactionId = result.id;
      const state = result.state;

      console.log("✅ Transfer transaction created!\n");
      console.log("=".repeat(60));
      console.log("TRANSACTION DETAILS:");
      console.log("=".repeat(60));
      console.log(`Transaction ID: ${transactionId}`);
      console.log(`State: ${state}`);
      console.log("=".repeat(60));
      console.log("\n⏳ Transaction is being processed...");
      console.log("   The transaction state will update as it progresses.");
      console.log("\n📝 To check transaction status:");
      console.log(`   npm run check:transactions ${walletId} OUTBOUND`);
      console.log(`   OR`);
      console.log(`   curl http://localhost:3001/api/wallets/transactions/${transactionId}\n`);

      // Poll for transaction completion (optional)
      if (state === "INITIATED" || String(state) === "PENDING") {
        console.log("🔄 Polling for transaction completion (this may take a moment)...\n");
        
        let attempts = 0;
        const maxAttempts = 30; // Poll for up to 30 seconds
        
        while (attempts < maxAttempts) {
          await new Promise((resolve) => setTimeout(resolve, 2000)); // Wait 2 seconds
          
          try {
            const transaction = await getTransaction(transactionId);
            
            if (transaction) {
              const currentState = transaction.state;
              console.log(`   Current state: ${currentState}`);
              
              if (currentState === "COMPLETE") {
                console.log("\n✅ Transfer completed successfully!\n");
                console.log("=".repeat(60));
                console.log("TRANSACTION COMPLETE:");
                console.log("=".repeat(60));
                console.log(`Transaction ID: ${transaction.id}`);
                console.log(`State: ${transaction.state}`);
                if (transaction.txHash) {
                  console.log(`Transaction Hash: ${transaction.txHash}`);
                  
                  // Generate blockchain explorer URL
                  let explorerUrl = "";
                  if (transaction.blockchain === "ARC-TESTNET") {
                    explorerUrl = `https://testnet.arcscan.app/tx/${transaction.txHash}`;
                  } else if (transaction.blockchain?.includes("MATIC")) {
                    explorerUrl = `https://amoy.polygonscan.com/tx/${transaction.txHash}`;
                  } else if (transaction.blockchain?.includes("ETH")) {
                    explorerUrl = `https://sepolia.etherscan.io/tx/${transaction.txHash}`;
                  }
                  if (explorerUrl) {
                    console.log(`Explorer: ${explorerUrl}`);
                  }
                }
                if (transaction.amounts) {
                  console.log(`Amount: ${transaction.amounts.join(", ")}`);
                }
                console.log("=".repeat(60));
                break;
              } else if (currentState === "FAILED") {
                console.log("\n❌ Transfer failed!");
                break;
              }
            }
          } catch (error) {
            // Continue polling
          }
          
          attempts++;
        }
        
        if (attempts >= maxAttempts) {
          console.log("\n⏱️  Transaction is still processing. Check status manually using the commands above.\n");
        }
      }
    } else {
      console.error("❌ Error: Transfer creation returned no data");
      process.exit(1);
    }
  } catch (error: any) {
    console.error("❌ Error transferring tokens:");
    console.error(`   ${error.message}\n`);
    console.log("Troubleshooting:");
    console.log("   - Verify your Wallet ID is correct");
    console.log("   - Verify your Token ID is correct (check wallet balance)");
    console.log("   - Verify destination address is correct");
    console.log("   - Ensure source wallet has sufficient balance");
    console.log("   - Check that you're using the correct environment (sandbox vs production)");
    console.log("   - For SCA wallets, ensure you have native tokens for gas fees\n");
    process.exit(1);
  }
}

main();