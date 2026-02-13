# Admin scripts (app wallet only)

These scripts are for **one optional developer-controlled wallet** (e.g. marketplace treasury). They are **not** used for user flows.

- **User wallets** are 100% user-controlled: sign-in, Circle user API, session. No Entity Secret.
- **App wallet** (optional): If you want a single address to receive marketplace payments (treasury), you can create it with these scripts and set `MARKETPLACE_WALLET_ADDRESS` to that address. Only your backend can move funds from it (using `CIRCLE_ENTITY_SECRET`).

## Prerequisites

- `CIRCLE_API_KEY` in `.env`
- `CIRCLE_ENTITY_SECRET` in `.env` (only if you use an app wallet)

## Scripts

Run from repo root (backend): `npm run <script>` or `npx tsx src/admin/<script>.ts`

| Script | Purpose |
|--------|--------|
| `generateEntitySecret.ts` | Generate Entity Secret (one-time). Store securely. |
| `registerEntitySecret.ts` | Register Entity Secret with Circle. Save recovery file. |
| `createWalletSet.ts` | Create a wallet set (for app wallet). |
| `createWallets.ts` | Create wallet(s) in the set (e.g. one treasury wallet). |
| `transferTokens.ts` | Transfer from app wallet (e.g. withdraw from treasury). |
| `checkTransactions.ts` | List transactions for app wallet(s). |

## When to use

- **Marketplace treasury**: Create one wallet, set its address as `MARKETPLACE_WALLET_ADDRESS`. Users pay to this address when they purchase; only your backend can send from it.
- Do **not** use these scripts or Entity Secret for user-facing features. User flows use the Circle user API and session only.
