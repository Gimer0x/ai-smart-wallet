/**
 * Create Wallet Set Script
 * 
 * Creates a new wallet set for Circle Developer-Controlled Wallets.
 * A wallet set is a collection of wallets managed by a single cryptographic key.
 * 
 * Usage:
 *   npm run create:wallet-set
 *   or
 *   tsx src/scripts/createWalletSet.ts
 */

import { createWalletSet } from "../wallet/walletManager";
import dotenv from "dotenv";

dotenv.config();

async function main() {
  const walletSetName = process.argv[2] || "AI Agent Wallet Set";

  console.log("🔐 Creating Wallet Set...\n");
  console.log(`Name: ${walletSetName}\n`);

  try {
    const walletSet = await createWalletSet(walletSetName);

    if (walletSet) {
      console.log("✅ Wallet Set created successfully!\n");
      console.log("=".repeat(60));
      console.log("WALLET SET DETAILS:");
      console.log("=".repeat(60));
      console.log(`ID: ${walletSet.id}`);
      console.log(`Name: ${walletSetName}`);
      console.log(`Custody Type: ${walletSet.custodyType}`);
      console.log(`Created: ${walletSet.createDate}`);
      console.log(`Updated: ${walletSet.updateDate}`);
      console.log("=".repeat(60));
      console.log("\n📝 Next step: Create wallets using:");
      console.log(`   npm run create:wallets ${walletSet.id}\n`);
      console.log("💡 Save the Wallet Set ID - you'll need it to create wallets!\n");
    } else {
      console.error("❌ Error: Wallet set creation returned no data");
      process.exit(1);
    }
  } catch (error: any) {
    console.error("❌ Error creating wallet set:");
    console.error(`   ${error.message}\n`);
    console.log("Troubleshooting:");
    console.log("   - Verify your CIRCLE_API_KEY is correct");
    console.log("   - Verify your CIRCLE_ENTITY_SECRET is correct");
    console.log("   - Ensure your Entity Secret is registered");
    console.log("   - Check that you're using the correct environment (sandbox vs production)\n");
    process.exit(1);
  }
}

main();

