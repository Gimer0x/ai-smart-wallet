# Entity Secret Setup Guide

This guide walks you through generating and registering your Entity Secret for Circle Developer-Controlled Wallets.

## Important Distinction

**Entity Secret vs Entity Secret Ciphertext:**

- **Entity Secret**: Generated **ONCE** during setup, stored securely, and reused for all API requests. This is what you generate with `generateEntitySecret.ts`.

- **Entity Secret Ciphertext**: Automatically re-encrypted by the Circle SDK for **EACH** API request. The SDK handles this automatically - you don't need to do anything.

**Key Points:**
- ✅ Generate Entity Secret **once** during initial setup
- ✅ Store it securely in your `.env` file
- ✅ The SDK automatically creates a new ciphertext for each API request
- ❌ Do NOT generate a new Entity Secret for each request
- ❌ Do NOT manually create ciphertexts (the SDK does this)

## Prerequisites

1. **Circle Developer Account**: Create an account at [Circle Console](https://console.circle.com/)
2. **API Key**: Get your API key from the Circle Console
3. **Environment Setup**: Ensure you have Node.js and npm installed

## Step 1: Install Dependencies

The Circle SDK should already be installed. If not, run:

```bash
npm install @circle-fin/developer-controlled-wallets
```

## Step 2: Generate Entity Secret

Generate a new Entity Secret (this is a **one-time setup**):

```bash
npm run generate:entity-secret
```

This will output a 32-byte hex string. **Copy this value** - you'll need it in the next step.

**⚠️ Important:**
- This Entity Secret is generated **ONCE** and reused for all API requests
- The SDK automatically creates a new ciphertext for each API request (you don't need to do anything)
- Store this Entity Secret securely (e.g., in a password manager)
- Never commit it to version control
- Circle does not store your Entity Secret and cannot recover it

## Step 3: Configure Environment Variables

1. Copy the `.env.example` file to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Edit the `.env` file and add:
   - Your Circle API key: `CIRCLE_API_KEY=your_api_key_here`
   - The Entity Secret you generated: `CIRCLE_ENTITY_SECRET=your_entity_secret_here`
   - (Optional) Recovery file path: `CIRCLE_RECOVERY_FILE_PATH=./recovery/circle_recovery_file.txt`

## Step 4: Register Entity Secret

Register your Entity Secret with Circle:

```bash
npm run register:entity-secret
```

This will:
- Encrypt your Entity Secret
- Register it with Circle
- Save a recovery file (if path is specified)

**⚠️ Security Warning:**
- Save the recovery file in a safe, separate location
- This is the **ONLY** way to reset your Entity Secret if it's lost
- Do not commit the recovery file to version control
- Store it securely (e.g., encrypted backup, secure cloud storage)

## Verification

After successful registration, you should see:
- ✅ Confirmation message
- Recovery file content (save this!)
- Next steps guidance

## Troubleshooting

### Error: CIRCLE_API_KEY is not set
- Make sure you've created a `.env` file
- Verify `CIRCLE_API_KEY` is set in the `.env` file
- Check that you're using the correct API key from Circle Console

### Error: CIRCLE_ENTITY_SECRET is not set
- Run `npm run generate:entity-secret` first
- Copy the generated secret to your `.env` file

### API Errors
- Verify your API key is correct
- Check that you're using the correct environment (sandbox vs production)
- Ensure your Circle account has the necessary permissions

## How It Works in Practice

When you use the Circle SDK for wallet operations (e.g., creating wallets, transferring tokens), you simply pass your Entity Secret to the SDK methods. The SDK automatically:

1. Takes your Entity Secret
2. Encrypts it into a new ciphertext for that specific API request
3. Sends the ciphertext with the API request
4. Each subsequent request gets a fresh ciphertext automatically

**Example:**
```typescript
import { createDeveloperControlledWallet } from "@circle-fin/developer-controlled-wallets";

// You just pass your Entity Secret - SDK handles ciphertext rotation
const wallet = await createDeveloperControlledWallet({
  apiKey: process.env.CIRCLE_API_KEY,
  entitySecret: process.env.CIRCLE_ENTITY_SECRET, // Same secret, new ciphertext each time
  // ... other params
});
```

## Next Steps

Once your Entity Secret is registered, you can:
1. Create your first developer-controlled wallet
2. Transfer tokens between wallets
3. Integrate wallet operations into your AI agent

**Remember:** The SDK handles all ciphertext rotation automatically - you just use your Entity Secret!

## References

- [Circle Documentation: Register Entity Secret](https://developers.circle.com/wallets/dev-controlled/register-entity-secret)
- [Circle Console](https://console.circle.com/)
- [Circle SDK npm Package](https://www.npmjs.com/package/@circle-fin/developer-controlled-wallets)