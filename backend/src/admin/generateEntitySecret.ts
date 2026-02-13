/**
 * Generate Entity Secret Script
 * 
 * This script generates a new Entity Secret for Circle Developer-Controlled Wallets.
 * 
 * IMPORTANT: This is a ONE-TIME setup step. You generate the Entity Secret once
 * and reuse it for all API requests. The Circle SDK automatically creates a new
 * ciphertext for each API request - you don't need to generate a new Entity Secret.
 * 
 * Usage:
 *   npm run generate:entity-secret
 *   or
 *   tsx src/scripts/generateEntitySecret.ts
 * 
 * SECURITY: Store the generated Entity Secret securely (e.g., in a password manager).
 * Circle does not store your Entity Secret and cannot recover it for you.
 */

import { generateEntitySecret } from "@circle-fin/developer-controlled-wallets";

console.log("🔐 Generating Entity Secret...\n");

try {
  // The SDK function prints the Entity Secret directly to console
  generateEntitySecret();
  
  console.log("\n" + "=".repeat(60));
  console.log("⚠️  IMPORTANT INFORMATION:");
  console.log("=".repeat(60));
  console.log("   - This Entity Secret is generated ONCE and reused for all requests");
  console.log("   - The Circle SDK automatically creates a new ciphertext for each API call");
  console.log("   - You do NOT need to generate a new Entity Secret for each request");
  console.log("=".repeat(60));
  console.log("\n⚠️  SECURITY WARNING:");
  console.log("   - Store the Entity Secret above securely (e.g., password manager)");
  console.log("   - Never commit it to version control");
  console.log("   - Add it to your .env file as CIRCLE_ENTITY_SECRET");
  console.log("   - Circle does not store this and cannot recover it");
  console.log("=".repeat(60));
  console.log("\n📝 Next step: Add the Entity Secret to your .env file, then run:");
  console.log("   npm run register:entity-secret\n");
  
  process.exit(0);
} catch (error) {
  console.error("❌ Error generating Entity Secret:", error);
  process.exit(1);
}

