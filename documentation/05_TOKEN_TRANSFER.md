# Token Transfer Guide

This guide shows you how to transfer tokens between developer-controlled wallets.

## Prerequisites

1. ✅ Two wallets created (see `WALLET_SETUP.md`)
2. ✅ Source wallet has received tokens (see transaction checking)
3. ✅ Token ID obtained from wallet balance

## Step 1: Get Wallet Balance and Token ID

Before transferring, you need to:
1. Check the source wallet balance
2. Get the token ID for the token you want to transfer

### Using CLI Script:

```bash
# Check balance via API (if server is running)
curl http://localhost:3001/api/wallets/<wallet-id>/balance
```

### Using API:

```http
GET /api/wallets/:walletId/balance
```

**Example Response:**
```json
{
  "success": true,
  "data": [
    {
      "token": {
        "id": "7adb2b7d-c9cd-5164-b2d4-b73b088274dc",
        "symbol": "USDC",
        "name": "USD Coin",
        "blockchain": "ARC-TESTNET"
      },
      "amount": "1"
    }
  ]
}
```

**Note the `token.id`** - you'll need this for the transfer.

## Step 2: Transfer Tokens

### Using CLI Script:

```bash
npm run transfer:tokens <wallet-id> <token-id> <destination-address> <amount> [fee-level]
```

**Parameters:**
- `wallet-id`: Source wallet ID
- `token-id`: Token ID from balance check
- `destination-address`: Destination wallet address
- `amount`: Amount to transfer (e.g., "0.1" or "1")
- `fee-level`: Optional - "LOW", "MEDIUM", or "HIGH" (default: "MEDIUM")

**Example:**
```bash
npm run transfer:tokens \
  d72a977e-89fd-550a-8e19-5924ec395a74 \
  7adb2b7d-c9cd-5164-b2d4-b73b088274dc \
  0x75f100ee75a0e529aacced263de7a8f0e9f9c2a2 \
  0.1 \
  MEDIUM
```

### Using API:

```http
POST /api/wallets/:walletId/transfer
Content-Type: application/json

{
  "tokenId": "7adb2b7d-c9cd-5164-b2d4-b73b088274dc",
  "destinationAddress": "0x75f100ee75a0e529aacced263de7a8f0e9f9c2a2",
  "amount": "0.1",
  "feeLevel": "MEDIUM"
}
```

**Example:**
```bash
curl -X POST http://localhost:3001/api/wallets/d72a977e-89fd-550a-8e19-5924ec395a74/transfer \
  -H "Content-Type: application/json" \
  -d '{
    "tokenId": "7adb2b7d-c9cd-5164-b2d4-b73b088274dc",
    "destinationAddress": "0x75f100ee75a0e529aacced263de7a8f0e9f9c2a2",
    "amount": "0.1",
    "feeLevel": "MEDIUM"
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "1af639ce-c8b2-54a6-af49-7aebc95aaac1",
    "state": "INITIATED"
  }
}
```

## Step 3: Check Transfer Status

The transfer is asynchronous. Check the status using:

### Using CLI Script:

```bash
# Check all outbound transactions for the wallet
npm run check:transactions <wallet-id> OUTBOUND

# Or check a specific transaction
curl http://localhost:3001/api/wallets/transactions/<transaction-id>
```

### Using API:

```http
GET /api/wallets/transactions/:transactionId
```

**Transaction States:**
- `INITIATED`: Transaction has been created
- `PENDING`: Transaction is pending confirmation
- `CONFIRMED`: Transaction is confirmed on blockchain
- `COMPLETE`: Transaction is complete
- `FAILED`: Transaction failed

## Complete Example Workflow

1. **Get source wallet balance:**
   ```bash
   curl http://localhost:3001/api/wallets/d72a977e-89fd-550a-8e19-5924ec395a74/balance
   ```

2. **Transfer tokens:**
   ```bash
   npm run transfer:tokens \
     d72a977e-89fd-550a-8e19-5924ec395a74 \
     7adb2b7d-c9cd-5164-b2d4-b73b088274dc \
     0x75f100ee75a0e529aacced263de7a8f0e9f9c2a2 \
     0.1
   ```

3. **Check transaction status:**
   ```bash
   npm run check:transactions d72a977e-89fd-550a-8e19-5924ec395a74 OUTBOUND
   ```

4. **Verify on blockchain explorer:**
   - Use the transaction hash from the output
   - Visit the explorer URL (automatically generated in CLI output)

## Fee Levels

- **LOW**: Lower fee, may take longer to confirm
- **MEDIUM**: Balanced fee and confirmation time (recommended)
- **HIGH**: Higher fee, faster confirmation

## Important Notes

1. **Idempotency Key**: Automatically generated (UUID v4) to prevent duplicate transactions
2. **Gas Fees**: For SCA wallets, ensure you have native tokens (ARC for ARC-TESTNET) for gas
3. **Amount Format**: Use string format (e.g., "0.1" not 0.1) to avoid precision issues
4. **Transaction Time**: Transfers are asynchronous and may take 10-30 seconds to complete

## Troubleshooting

### Error: Insufficient Balance
- Check wallet balance before transferring
- Ensure you have enough tokens including gas fees

### Error: Invalid Token ID
- Verify token ID from wallet balance
- Ensure token exists in the source wallet

### Error: Transaction Failed
- Check transaction status for error details
- Verify destination address is correct
- Ensure source wallet has native tokens for gas (for SCA wallets)

### Transaction Stuck in PENDING
- Wait a few moments and check again
- Network congestion may cause delays
- Check blockchain explorer for transaction status

## References

- [Circle Documentation: Transfer Tokens](https://developers.circle.com/wallets/dev-controlled/transfer-tokens-across-wallets)
- [Circle API Reference: Create Transfer](https://developers.circle.com/api-reference/wallets/developer-controlled-wallets/create-developer-transaction-transfer)