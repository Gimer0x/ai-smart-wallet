# Project Overview: Agents, Tools, and Transaction Flow

This document explains how the AI agent works, what tools are, and the full flow to send a transaction.

---

## 1. High-Level Architecture

```
┌─────────────────┐     POST /api/chat      ┌─────────────────┐     Circle API
│   Frontend      │  { message, walletId }  │   Backend       │     (wallets,
│   ChatInterface │ ──────────────────────► │   chat.routes   │     transfers,
│                 │ ◄────────────────────── │   + agent       │     balances)
│   (React)       │  { response,            │   + tools       │         ▲
│                 │    pendingAction? }     │                 │         │
└────────┬────────┘                         └────────┬────────┘         │
         │                                           │                  │
         │  User clicks "Sign & send"                │  Tools call      │
         │  POST /api/wallets/:id/transfer           │  circleUserClient│
         │  → challengeId                            │  (userToken)     │
         │  → Circle SDK execute(challengeId)        │                  │
         │  → User signs in browser                  └──────────────────┘
         ▼
   Transaction confirmed onchain
```

- **Frontend**: Chat UI sends user message to backend; displays agent reply and, when applicable, a "Sign & send" button.
- **Backend**: Chat route resolves the user’s wallet, builds **tools** with the session’s Circle `userToken`, and runs the **agent** with those tools.
- **Agent**: LLM (Groq) with a system prompt and **tools**. It decides which tools to call and with what arguments. It never sees or stores keys.
- **Tools**: Functions that call Circle’s API (balance, transactions, transfer challenge). They are the only place that talks to Circle; they are created per request and bound to the current user’s `userToken`.

---

## 2. How the Agent Works

**Location**: `backend/src/agent/agent.ts`

- **Model**: Groq `llama-3.3-70b-versatile` (temperature 0 for consistency).
- **System prompt**: Instructs the agent to:
  - Use tools for any wallet operation (never guess balances, addresses, or tx details).
  - Prefer the **primary wallet ID** (passed in when the user has a selected wallet) for “my wallet” or “current wallet”.
  - For transfers: first call `check_wallet_balance` to get the USDC token ID and verify balance, then call `transfer_tokens` with that token ID.
- **Tool loop**: The agent can call tools multiple times in one turn. The flow is:
  1. Send user message (and system message) to the model.
  2. If the model returns **tool_calls**, the backend runs those tools (with the user’s `userToken`), appends the tool results as `ToolMessage`s, and calls the model again.
  3. Repeat until the model returns a normal text response (no more tool calls) or a maximum number of iterations (5).
- **Output**: The final text reply is sent to the frontend. If any tool output contained a **pending action** (see below), the backend parses it and adds `pendingAction` to the JSON response so the frontend can show "Sign & send".

The agent **never signs**. It only:

- Reads data (balances, transactions, wallet info) via tools.
- Prepares a transfer by calling `transfer_tokens`, which only validates and returns a **pending action** for the user to approve later.

---

## 3. What Tools Are

**Location**: `backend/src/agent/tools/userWallet.tools.ts`

**Tools** are LangChain `DynamicStructuredTool` instances: named functions with a schema (Zod) and a `func` that runs when the agent calls them. They are created **per chat request** via `createUserWalletTools(userToken)`, so every tool call uses the **current user’s** Circle session. The backend never has the user’s encryption key; it only has the `userToken` stored in the session after login.


| Tool name              | Purpose                                                                                                                                                                                                                                                                      |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `check_wallet_balance` | Gets USDC (and other) balances for a wallet. Returns amount and **token ID** (required for transfers).                                                                                                                                                                       |
| `get_wallet_info`      | Returns wallet address, blockchain, state, etc. Used when the user asks “which wallet” or “my address”.                                                                                                                                                                      |
| `list_transactions`    | Lists transactions for a wallet (optional filters: type INBOUND/OUTBOUND, state). Enriches with tx hash for explorer links.                                                                                                                                                  |
| `get_transaction`      | Returns one transaction by ID (state, amount, txHash, explorer link).                                                                                                                                                                                                        |
| `transfer_tokens`      | **Does not execute a transfer.** Validates balance and parameters, then returns a **pending action** payload (walletId, tokenId, destinationAddress, amount, feeLevel) wrapped in a special marker. The backend parses this and sends it to the frontend as `pendingAction`. |


Important: `transfer_tokens` does **not** call Circle’s transfer API. It only:

1. Checks balance (via `getWalletBalance`) to ensure sufficient USDC and to confirm the token ID.
2. Builds a `PendingAction` object and returns it inside a marker string: `__PENDING_ACTION__{"type":"transfer",...}__PENDING_ACTION__`.

The **actual** transfer is created only when the user clicks **"Sign & send"** in the frontend (see flow below).

---

## 4. Flow to Send a Transaction (End to End)

### Step 1: User sends a message

Example: *"Send 2 USDC to 0x0d2Dc4E9ebc1465E86Fdf6ab18377CB82eCf7548"*

- Frontend: `ChatInterface` calls `chatApi.sendMessage(message, walletId)`.
- Backend: `POST /api/chat` (e.g. `chat.routes.ts`). Session must have a Circle user (`requireCircleUser`). Backend resolves `activeWalletId` (from body or first wallet), then `createUserWalletTools(userToken)` and `processMessage(message, activeWalletId, tools)`.

### Step 2: Agent runs and calls tools

- Agent receives the user message and system prompt (with `primaryWalletId` = active wallet).
- Agent typically:
  1. Calls **`check_wallet_balance`** with the active wallet ID to get USDC balance and **token ID**.
  2. Calls **`transfer_tokens`** with: `walletId`, `tokenId` (from step 1), `destinationAddress`, `amount`, optional `feeLevel`.
- `transfer_tokens`:
  - Fetches balance again, verifies token and amount.
  - Builds `PendingAction`: `{ type: 'transfer', walletId, tokenId, destinationAddress, amount, feeLevel }`.
  - Returns a string containing the marker and JSON: `__PENDING_ACTION__<json>__PENDING_ACTION__` plus a short message like “Transfer prepared. Please confirm in the app.”

### Step 3: Backend extracts pending action and responds

- After the tool loop, `processMessage` in `agent.ts` scans the last tool output for `PENDING_ACTION_MARKER` and parses the JSON.
- Response to frontend: `{ success: true, data: { response: "<agent text>", timestamp, pendingAction: { type, walletId, tokenId, destinationAddress, amount, feeLevel } } }`.

### Step 4: Frontend shows the reply and "Sign & send"

- `ChatInterface` stores the agent message with `pendingAction` and renders the agent text plus a **"Sign & send"** button (and amount/destination summary).
- Nothing has been sent on-chain yet; the user can still cancel.

### Step 5: User clicks "Sign & send"

- Frontend: `handleSignPendingAction` runs.
  - Checks for Circle credentials (device + user tokens and encryption key in sessionStorage/cookies). If missing, shows “Sign in with Google to enable signing”.
  - Calls **`walletApi.prepareTransfer(action.walletId, { tokenId, destinationAddress, amount, feeLevel })`**.

### Step 6: Backend creates the real transfer challenge

- `POST /api/wallets/:walletId/transfer` (e.g. `wallet.routes.ts`).
- Backend checks the wallet belongs to the session user, then calls Circle: **`createTransferChallenge(userToken, { walletId, tokenId, destinationAddress, amount, feeLevel })`**.
- Circle returns a **`challengeId**` (a one-time signing challenge). Backend responds with `{ challengeId, message }`. The transfer is still **not** executed; it is only prepared.

### Step 7: User signs in the browser

- Frontend initializes the Circle Web SDK with stored credentials and calls **`sdk.execute(challengeId, callback)`**.
- The SDK shows Circle’s signing UI; the user approves. Signing happens **in the browser** with the user’s key; the server never sees the signature or the encryption key.
- On success, Circle executes the transfer onchain.

### Step 8: Frontend shows "Completed" and explorer link

- Frontend sets the message state to “Confirming…” and polls **`walletApi.listTransactions(walletId, 'OUTBOUND')`** (and if needed **`getTransaction(latest.id)`** to get `txHash`).
- When the new outbound transaction has a `txHash`, the message is updated to **Completed,** and a “View on explorer” link is shown (using the tx’s blockchain for the correct explorer).

---

## 5. Summary Table


| Step | Who      | What                                                                       |
| ---- | -------- | -------------------------------------------------------------------------- |
| 1    | User     | Types “Send 2 USDC to 0x…”                                                 |
| 2    | Frontend | POST /api/chat with message and walletId                                   |
| 3    | Backend  | Resolves wallet, creates tools with userToken, runs agent                  |
| 4    | Agent    | Calls check_wallet_balance → transfer_tokens (returns pending action only) |
| 5    | Backend  | Parses pending action, returns response + pendingAction to frontend        |
| 6    | Frontend | Shows agent reply + “Sign & send” button                                   |
| 7    | User     | Clicks “Sign & send.”                                                      |
| 8    | Frontend | POST /api/wallets/:id/transfer (tokenId, destination, amount, feeLevel)    |
| 9    | Backend  | createTransferChallenge(userToken, …) → challengeId                        |
| 10   | Frontend | Circle SDK execute(challengeId) → user signs in browser                    |
| 11   | Circle   | Executes transfer onchain                                                  |
| 12   | Frontend | Polls for tx hash, shows “Completed” + explorer link                       |


The **agent** only prepares and validates; the **user** always signs. The **tools** are the only backend code that talks to Circle, and they are scoped to the current user via `userToken`.