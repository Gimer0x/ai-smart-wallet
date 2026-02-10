# Transaction Checking Guide

This guide shows you how to check for inbound transfers to your developer-controlled wallets.

## Overview

After receiving testnet USDC transfers to your wallet addresses, you can check the transaction status using:
- **CLI Script**: Command-line tool for quick checks
- **API Endpoints**: REST API for integration with your application

## CLI Script Usage

### Check transactions for a specific wallet:

```bash
npm run check:transactions <wallet-id>
```

**Example:**
```bash
npm run check:transactions d72a977e-89fd-550a-8e19-5924ec395a74
```

### Check transactions for multiple wallets:

```bash
npm run check:transactions <wallet-id-1>,<wallet-id-2>
```

**Example:**
```bash
npm run check:transactions d72a977e-89fd-550a-8e19-5924ec395a74,9e70628e-d11b-58a5-ab2e-c52a89548b1a
```

### Check all wallets:

```bash
npm run check:transactions --all
```

### Filter by transaction type:

```bash
# Only INBOUND transactions
npm run check:transactions <wallet-id> INBOUND

# Only OUTBOUND transactions
npm run check:transactions <wallet-id> OUTBOUND
```

### Filter by state:

```bash
# Only COMPLETE transactions
npm run check:transactions <wallet-id> INBOUND COMPLETE

# Only CONFIRMED transactions
npm run check:transactions <wallet-id> INBOUND CONFIRMED
```

## API Endpoints

### 1. List All Wallets

```http
GET /api/wallets
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "d72a977e-89fd-550a-8e19-5924ec395a74",
      "address": "0x7d9fd7c1c4cf4f8ef737bfd22f84890706675af0",
      "blockchain": "ARC-TESTNET",
      "accountType": "SCA",
      "state": "LIVE"
    }
  ]
}
```

### 2. Get Wallet Details

```http
GET /api/wallets/:walletId
```

**Example:**
```bash
curl http://localhost:3001/api/wallets/d72a977e-89fd-550a-8e19-5924ec395a74
```

### 3. Get Wallet Balance

```http
GET /api/wallets/:walletId/balance
```

**Optional query parameter:**
- `tokenAddress`: Specific token address to check balance for

**Example:**
```bash
curl http://localhost:3001/api/wallets/d72a977e-89fd-550a-8e19-5924ec395a74/balance
```

### 4. List Transactions for a Wallet

```http
GET /api/wallets/:walletId/transactions
```

**Query parameters:**
- `transactionType`: "INBOUND" or "OUTBOUND"
- `state`: Transaction state filter (e.g., "COMPLETE", "CONFIRMED")

**Examples:**
```bash
# All transactions
curl http://localhost:3001/api/wallets/d72a977e-89fd-550a-8e19-5924ec395a74/transactions

# Only INBOUND transactions
curl "http://localhost:3001/api/wallets/d72a977e-89fd-550a-8e19-5924ec395a74/transactions?transactionType=INBOUND"

# INBOUND and COMPLETE only
curl "http://localhost:3001/api/wallets/d72a977e-89fd-550a-8e19-5924ec395a74/transactions?transactionType=INBOUND&state=COMPLETE"
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "4ed0d0f9-7388-545c-9e55-83e62d70b2ac",
      "transactionType": "INBOUND",
      "state": "COMPLETE",
      "blockchain": "ARC-TESTNET",
      "walletId": "d72a977e-89fd-550a-8e19-5924ec395a74",
      "sourceAddress": "0xd4c0b787aa2ff9eb751bb515c877ebbf2daddaae",
      "destinationAddress": "0x7d9fd7c1c4cf4f8ef737bfd22f84890706675af0",
      "amounts": ["1"],
      "txHash": "0x9d33aff2b458adacad3c902900cc726074e241f08a65bfb4edded4c8bae4a671",
      "blockHeight": 18849407,
      "networkFee": "0.003402",
      "createDate": "2025-12-29T08:53:29Z",
      "updateDate": "2025-12-29T08:53:30Z"
    }
  ]
}
```

### 5. List Transactions for Multiple Wallets

```http
GET /api/wallets/transactions/all?walletIds=<id1>,<id2>
```

**Query parameters:**
- `walletIds`: Comma-separated wallet IDs (required)
- `transactionType`: "INBOUND" or "OUTBOUND"
- `state`: Transaction state filter

**Example:**
```bash
curl "http://localhost:3001/api/wallets/transactions/all?walletIds=d72a977e-89fd-550a-8e19-5924ec395a74,9e70628e-d11b-58a5-ab2e-c52a89548b1a&transactionType=INBOUND"
```

### 6. Get Specific Transaction

```http
GET /api/wallets/transactions/:transactionId
```

**Example:**
```bash
curl http://localhost:3001/api/wallets/transactions/4ed0d0f9-7388-545c-9e55-83e62d70b2ac
```

## Transaction States

Common transaction states:
- **PENDING**: Transaction is pending
- **CONFIRMED**: Transaction is confirmed on the blockchain
- **COMPLETE**: Transaction is complete
- **FAILED**: Transaction failed

## Transaction Types

- **INBOUND**: Funds received into the wallet
- **OUTBOUND**: Funds sent from the wallet

## Blockchain Explorer Links

The CLI script automatically generates blockchain explorer links:
- **ARC-TESTNET**: https://testnet.arcscan.app/tx/{txHash}
- **MATIC-AMOY**: https://amoy.polygonscan.com/tx/{txHash}
- **ETH-SEPOLIA**: https://sepolia.etherscan.io/tx/{txHash}

## Example Workflow

1. **Create wallets** (if not already done):
   ```bash
   npm run create:wallets <wallet-set-id> 2 SCA
   ```

2. **Fund wallets** using the Circle faucet:
   - Visit https://faucet.circle.com/
   - Select ARC Testnet
   - Enter your wallet addresses

3. **Check for inbound transfers**:
   ```bash
   npm run check:transactions --all INBOUND
   ```

4. **Verify transaction on blockchain explorer**:
   - Use the transaction hash from the output
   - Visit the explorer URL provided

## Integration with Your Application

You can integrate transaction checking into your application using the API endpoints:

```typescript
// Check for inbound transfers
const response = await fetch(
  `http://localhost:3001/api/wallets/${walletId}/transactions?transactionType=INBOUND`
);
const { data: transactions } = await response.json();

// Process transactions
transactions.forEach((tx: any) => {
  console.log(`Received ${tx.amounts[0]} USDC`);
  console.log(`Transaction: ${tx.txHash}`);
});
```

## References

- [Circle Documentation: Receive Inbound Transfer](https://developers.circle.com/wallets/user-controlled/receive-inbound-transfer#receive-an-inbound-transfer)
- [Circle API Reference: List Transactions](https://developers.circle.com/api-reference/wallets/developer-controlled-wallets/list-transactions)
- [ARC Testnet Explorer](https://testnet.arcscan.app/)