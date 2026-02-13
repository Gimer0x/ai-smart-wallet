/**
 * Create Wallets Script
 * 
 * Creates developer-controlled wallets on ARC testnet.
 * 
 * Usage:
 *   npm run create:wallets <wallet-set-id>
 *   or
 *   tsx src/scripts/createWallets.ts <wallet-set-id>
 * 
 * Example:
 *   npm run create:wallets 0189bc61-7fe4-70f3-8a1b-0d14426397cb
 */

import { createWallets } from "../wallet/walletManager";
import dotenv from "dotenv";

dotenv.config();

async function main() {
  const walletSetId = process.argv[2];
  const count = parseInt(process.argv[3]) || 2;
  const accountType = (process.argv[4] as "SCA" | "EOA") || "SCA";

  if (!walletSetId) {
    console.error("❌ Error: Wallet Set ID is required");
    console.log("\nUsage:");
    console.log("  npm run create:wallets <wallet-set-id> [count] [accountType]");
    console.log("\nExample:");
    console.log("  npm run create:wallets 0189bc61-7fe4-70f3-8a1b-0d14426397cb 2 SCA");
    console.log("\nParameters:");
    console.log("  wallet-set-id: The ID of the wallet set (required)");
    console.log("  count: Number of wallets to create (default: 2)");
    console.log("  accountType: SCA or EOA (default: SCA)");
    process.exit(1);
  }

  // ARC Testnet blockchain code
  const blockchains = ["ARC-TESTNET"];

  console.log("🔐 Creating Wallets on ARC Testnet...\n");
  console.log(`Wallet Set ID: ${walletSetId}`);
  console.log(`Blockchain: ${blockchains.join(", ")}`);
  console.log(`Count: ${count}`);
  console.log(`Account Type: ${accountType}\n`);

  try {
    const wallets = await createWallets(walletSetId, blockchains, count, accountType);

    if (wallets && wallets.length > 0) {
      console.log(`✅ Successfully created ${wallets.length} wallet(s)!\n`);
      console.log("=".repeat(60));
      console.log("WALLET DETAILS:");
      console.log("=".repeat(60));

      wallets.forEach((wallet, index) => {
        console.log(`\nWallet ${index + 1}:`);
        console.log(`  ID: ${wallet.id}`);
        console.log(`  Address: ${wallet.address}`);
        console.log(`  Blockchain: ${wallet.blockchain}`);
        console.log(`  Account Type: ${(wallet as { accountType?: string }).accountType ?? "N/A"}`);
        console.log(`  State: ${wallet.state}`);
        console.log(`  Created: ${wallet.createDate}`);
      });

      console.log("\n" + "=".repeat(60));
      console.log("\n📝 Next steps:");
      console.log("   1. Fund your wallets with testnet USDC from the faucet:");
      console.log("      https://faucet.circle.com/");
      console.log("   2. Use the wallet addresses above to receive testnet tokens");
      console.log("   3. Continue with wallet operations (transfers, etc.)\n");
    } else {
      console.error("❌ Error: Wallet creation returned no data");
      process.exit(1);
    }
  } catch (error: any) {
    console.error("❌ Error creating wallets:");
    console.error(`   ${error.message}\n`);
    console.log("Troubleshooting:");
    console.log("   - Verify your Wallet Set ID is correct");
    console.log("   - Verify your CIRCLE_API_KEY is correct");
    console.log("   - Verify your CIRCLE_ENTITY_SECRET is correct");
    console.log("   - Ensure your Entity Secret is registered");
    console.log("   - Check that you're using the correct environment (sandbox vs production)\n");
    process.exit(1);
  }
}

main();

