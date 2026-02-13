/**
 * Register Entity Secret Script
 * 
 * This script registers your Entity Secret with Circle.
 * The SDK automatically handles encryption and registration.
 * 
 * Prerequisites:
 *   1. Generate an Entity Secret using generateEntitySecret.ts
 *   2. Set CIRCLE_API_KEY in your .env file
 *   3. Set CIRCLE_ENTITY_SECRET in your .env file
 * 
 * Usage:
 *   npm run register:entity-secret
 *   or
 *   tsx src/scripts/registerEntitySecret.ts
 * 
 * IMPORTANT: Save the recovery file in a safe, separate location.
 * This is the only way to reset your Entity Secret if it's lost.
 */

import { registerEntitySecretCiphertext } from "@circle-fin/developer-controlled-wallets";
import dotenv from "dotenv";
import * as path from "path";
import * as fs from "fs";

dotenv.config();

const API_KEY = process.env.CIRCLE_API_KEY;
const ENTITY_SECRET = process.env.CIRCLE_ENTITY_SECRET;
const RECOVERY_FILE_PATH_ENV = process.env.CIRCLE_RECOVERY_FILE_PATH || "./recovery/circle_recovery_file.dat";

async function registerEntitySecret() {
  console.log("🔐 Registering Entity Secret with Circle...\n");

  // Validate environment variables
  if (!API_KEY) {
    console.error("❌ Error: CIRCLE_API_KEY is not set in .env file");
    console.log("\nPlease add your Circle API key to the .env file:");
    console.log("CIRCLE_API_KEY=your_api_key_here\n");
    process.exit(1);
  }

  if (!ENTITY_SECRET) {
    console.error("❌ Error: CIRCLE_ENTITY_SECRET is not set in .env file");
    console.log("\nPlease:");
    console.log("1. Generate an Entity Secret: npm run generate:entity-secret");
    console.log("2. Add it to your .env file: CIRCLE_ENTITY_SECRET=your_entity_secret_here\n");
    process.exit(1);
  }

  // Handle recovery file path - ensure it's a file path, not a directory
  let RECOVERY_FILE_PATH = RECOVERY_FILE_PATH_ENV;
  
  // Normalize the path
  RECOVERY_FILE_PATH = path.normalize(RECOVERY_FILE_PATH);
  
  // Check if the path is a directory or doesn't have a filename
  if (RECOVERY_FILE_PATH.endsWith(path.sep) || 
      (!path.extname(RECOVERY_FILE_PATH) && fs.existsSync(RECOVERY_FILE_PATH) && fs.statSync(RECOVERY_FILE_PATH).isDirectory())) {
    // It's a directory, append default filename
    RECOVERY_FILE_PATH = path.join(RECOVERY_FILE_PATH, 'circle_recovery_file.dat');
  } else if (!path.extname(RECOVERY_FILE_PATH)) {
    // No extension, might be intended as directory, append filename
    RECOVERY_FILE_PATH = path.join(RECOVERY_FILE_PATH, 'circle_recovery_file.dat');
  }

  // Ensure recovery file directory exists BEFORE calling SDK
  const recoveryDir = path.dirname(RECOVERY_FILE_PATH);
  if (recoveryDir !== "." && recoveryDir !== "" && !fs.existsSync(recoveryDir)) {
    console.log(`📁 Creating recovery directory: ${recoveryDir}`);
    fs.mkdirSync(recoveryDir, { recursive: true });
  }

  // Convert to absolute path for saving the recovery file
  // Note: SDK's recoveryFileDownloadPath should be empty string - we save the file ourselves
  const absoluteRecoveryPath = path.isAbsolute(RECOVERY_FILE_PATH) 
    ? RECOVERY_FILE_PATH 
    : path.resolve(process.cwd(), RECOVERY_FILE_PATH);

  try {
    console.log("📝 Registering Entity Secret...");
    console.log(`📁 Recovery file will be saved to: ${absoluteRecoveryPath}\n`);

    // Pass empty string to SDK - we'll save the file ourselves
    // This avoids SDK's directory validation issues
    const response = await registerEntitySecretCiphertext({
      apiKey: API_KEY,
      entitySecret: ENTITY_SECRET,
      recoveryFileDownloadPath: "",
    });

    console.log("✅ Entity Secret registered successfully!\n");
    console.log("=".repeat(60));
    console.log("RECOVERY FILE:");
    console.log("=".repeat(60));
    console.log(response.data?.recoveryFile);
    console.log("=" .repeat(60));
    console.log("\n⚠️  SECURITY WARNING:");
    console.log("   - Save the recovery file in a safe, separate location");
    console.log("   - This is the ONLY way to reset your Entity Secret if lost");
    console.log("   - Do not commit the recovery file to version control");
    console.log("   - Store it securely (e.g., encrypted backup, secure cloud storage)\n");

    // Save recovery file if path was provided (SDK might not save it automatically)
    if (absoluteRecoveryPath && response.data?.recoveryFile) {
      try {
        fs.writeFileSync(absoluteRecoveryPath, response.data.recoveryFile);
        console.log(`✅ Recovery file saved to: ${absoluteRecoveryPath}\n`);
      } catch (fileError) {
        console.warn("⚠️  Warning: Could not save recovery file automatically");
        console.warn("   Please copy the recovery file content above and save it manually\n");
      }
    }

    console.log("🎉 Next steps:");
    console.log("   1. Verify the recovery file is saved securely");
    console.log("   2. Continue with creating your first wallet\n");

    process.exit(0);
  } catch (error: any) {
    console.error("❌ Error registering Entity Secret:");
    if (error.response?.data) {
      console.error("   API Error:", JSON.stringify(error.response.data, null, 2));
    } else {
      console.error("   Error:", error.message || error);
    }
    console.log("\nTroubleshooting:");
    console.log("   - Verify your CIRCLE_API_KEY is correct");
    console.log("   - Verify your CIRCLE_ENTITY_SECRET is correct");
    console.log("   - Check that you're using the correct environment (sandbox vs production)\n");
    process.exit(1);
  }
}

registerEntitySecret();