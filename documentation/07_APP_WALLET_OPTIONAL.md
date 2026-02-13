# Optional: App wallet (marketplace treasury)

User wallets are **100% user-controlled**: sign-in, Circle user API, session. No Entity Secret is used for user flows.

If you want a **single developer-controlled wallet** (e.g. marketplace treasury) that receives USDC when users purchase e-books, you can set one up as follows. Only your backend can move funds from this wallet.

## Flow

- **User purchases**: User signs the payment in the app (Circle SDK). USDC is sent to `MARKETPLACE_WALLET_ADDRESS`. That address can be:
  - A wallet created with the admin scripts (Entity Secret), or
  - Any address you control (e.g. another wallet you created manually).
- **Treasury**: If the address is a Circle developer-controlled wallet (created via `backend/src/admin/` scripts), only your backend can send from it (using `CIRCLE_ENTITY_SECRET`). Use this for a dedicated marketplace treasury.

## Setup (optional)

1. Set `CIRCLE_API_KEY` and `CIRCLE_ENTITY_SECRET` in backend `.env` (see [backend/src/admin/README.md](../backend/src/admin/README.md)).
2. Run admin scripts: generate Entity Secret, register it, create wallet set, create one wallet.
3. Set `MARKETPLACE_WALLET_ADDRESS` in backend `.env` to that wallet’s address.

If you skip this, set `MARKETPLACE_WALLET_ADDRESS` to any address that should receive payments (e.g. a testnet address). The app does not need Entity Secret for user flows.
