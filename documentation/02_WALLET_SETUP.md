# Wallet Setup Guide - ARC Testnet

This guide walks you through creating your first developer-controlled wallet on ARC testnet.

## Prerequisites

1. ✅ Entity Secret generated and registered (see `ENTITY_SECRET_SETUP.md`)
2. ✅ Environment variables configured in `.env`:
   - `CIRCLE_API_KEY`
   - `CIRCLE_ENTITY_SECRET`

## Step 1: Create a Wallet Set

A wallet set is a collection of wallets managed by a single cryptographic key.

```bash
npm run create:wallet-set
```

Or with a custom name:

```bash
npm run create:wallet-set "My Custom Wallet Set Name"
```

**Output:** You'll receive a Wallet Set ID. **Save this ID** - you'll need it for the next step.

Example output:
```
✅ Wallet Set created successfully!
ID: 0189bc61-7fe4-70f3-8a1b-0d14426397cb
```

## Step 2: Create Wallets on ARC Testnet

Create wallets using the Wallet Set ID from Step 1:

```bash
npm run create:wallets <wallet-set-id>
```

**Parameters:**
- `wallet-set-id` (required): The ID from Step 1
- `count` (optional, default: 2): Number of wallets to create
- `accountType` (optional, default: SCA): "SCA" or "EOA"

**Examples:**

Create 2 SCA wallets (default):
```bash
npm run create:wallets 0189bc61-7fe4-70f3-8a1b-0d14426397cb
```

Create 1 EOA wallet:
```bash
npm run create:wallets 0189bc61-7fe4-70f3-8a1b-0d14426397cb 1 EOA
```

Create 3 SCA wallets:
```bash
npm run create:wallets 0189bc61-7fe4-70f3-8a1b-0d14426397cb 3 SCA
```

**Output:** You'll receive wallet details including:
- Wallet ID
- Wallet Address (use this to receive tokens)
- Blockchain (ARC-TESTNET)
- Account Type (SCA or EOA)

## Step 3: Fund Your Wallets

To perform transactions, you need testnet USDC:

1. **Circle Public Faucet**: Visit [https://faucet.circle.com/](https://faucet.circle.com/)
   - Select "ARC Testnet"
   - Enter your wallet address
   - Request testnet USDC

2. **Developer Console Faucet**: If you have a Circle developer account
   - Visit [https://console.circle.com/faucet](https://console.circle.com/faucet)
   - Select your wallet and request testnet tokens

## Account Types

- **SCA (Smart Contract Account)**: More advanced, supports custom logic
- **EOA (Externally Owned Account)**: Simpler, traditional wallet type

For this project, we are building **SCA** as it provides more flexibility for AI agent operations.

## Next Steps

Once your wallets are created and funded:

1. ✅ Wallet creation complete
2. 🔄 Continue with wallet operations (transfers, balance checks, etc.)
3. 🤖 Integrate wallet operations into your AI agent

## Troubleshooting

### Error: Missing environment variables
- Ensure `.env` file exists in the `backend/` directory
- Verify `CIRCLE_API_KEY` and `CIRCLE_ENTITY_SECRET` are set

### Error: Invalid Wallet Set ID
- Verify the Wallet Set ID is correct
- Ensure the Wallet Set was created successfully

### Error: Entity Secret not registered
- Run `npm run register:entity-secret` first
- Verify your Entity Secret is correctly set in `.env`

### API Errors
- Check that you're using the correct environment (sandbox vs production)
- Verify your API key has the necessary permissions
- Ensure your Circle account is active

## References

- [Circle Documentation: Create Your First Wallet](https://developers.circle.com/wallets/dev-controlled/create-your-first-wallet)
- [Circle Testnet Faucet](https://faucet.circle.com/)
- [Circle Developer Console](https://console.circle.com/)