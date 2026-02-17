# User Auth and Circle User-Wallet Proxy

This document describes the backend support for **user-controlled wallets**: session-based auth (Google) and the Circle Programmable Wallets proxy so the frontend never sees `CIRCLE_API_KEY`.

## 1. Circle user-wallet proxy (1.2)

### Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/circle/device-token` | None | Body: `{ deviceId }`. Returns `deviceToken` and `deviceEncryptionKey` for the Circle SDK. |
| POST | `/api/circle/initialize-user` | Session (Google) | Body: `{ userToken [, blockchains, accountType ] }`. Stores only `userToken` in session; returns `challengeId`. `encryptionKey` is never sent; it stays in client sessionStorage. |
| GET | `/api/circle/wallets` | Session + Circle user | Lists wallets for the current user. |
| GET | `/api/circle/wallets/:walletId/balance` | Session + Circle user | Balance for `walletId`; verifies the wallet belongs to the current user. |

### Backend modules

- **`backend/src/circleUser/circleUserClient.ts`** – HTTP client for Circle `v1/w3s` (device token, initialize user, list wallets, wallet balance). Uses only `CIRCLE_API_KEY`.
- **`backend/src/circleUser/types.ts`** – Response types for Circle API.
- **`backend/src/routes/circle-user.routes.ts`** – Express routes that proxy to the client and enforce auth.

No Entity Secret is used for these endpoints.

## 2. Auth: session and “current user” (1.3)

### Auth routes

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/google` | Body: `{ idToken }` (Google ID token). Verifies token, creates session with `googleSub`, `email`. |
| POST | `/api/auth/circle-login` | Body: `{ userToken }` (from Circle SDK onLoginComplete). Creates/updates session with derived `googleSub` and `circleUserToken`. Encryption key is never sent. |
| POST | `/api/auth/logout` | Destroys session. |
| GET | `/api/auth/me` | Returns current session user (`googleSub`, `email`, `hasCircleUser`). |

### Session

- **Session store:** in-memory (default `express-session`). For production, set a store (e.g. Redis) via `sessionMiddleware` options.
- **Cookie:** `wallet-ai.sid`, httpOnly, 7-day maxAge, sameSite lax.
- **Session fields:** `googleSub`, `email`, `circleUserToken` (set after `/api/auth/circle-login` or `/api/circle/initialize-user`). The encryption key is never stored on the server; it lives only in the client’s sessionStorage for signing.

### Middleware

- **`requireAuth`** – Requires `session.googleSub` (user has signed in with Google). Used for `/api/wallets`, `/api/chat`, `/api/marketplace`.
- **`requireCircleUser`** – Requires `session.googleSub` and `session.circleUserToken` (user has completed initialize-user). Used for `/api/circle/wallets`, `/api/circle/wallets/:walletId/balance`, and for POST `/api/chat`.

### Wallet ownership

- For any request that takes a `walletId`, the backend verifies it belongs to the current user by calling Circle “list wallets” and checking `walletId` is in the list.
- Implemented in: GET `/api/circle/wallets/:walletId/balance`, and in POST `/api/chat` when resolving or validating `walletId`.

## 3. Environment variables

### Backend

| Variable | Required | Description |
|----------|----------|-------------|
| `CIRCLE_API_KEY` | Yes (for Circle proxy) | Circle API key (Bearer token for Circle API). |
| `SESSION_SECRET` | Yes (for production) | Secret to sign session cookie. Defaults to a dev value if unset. |
| `GOOGLE_CLIENT_ID` or `GOOGLE_WEB_CLIENT_ID` | Yes (for Google auth) | Google OAuth Web client ID (same as frontend). |
| `FRONTEND_ORIGIN` | Optional | CORS origin for the frontend (default `http://localhost:3000`). |
| `CIRCLE_BASE_URL` | Optional | Circle API base URL (default `https://api.circle.com`). |

### Frontend

- Use the same Google Client ID as in backend for the Google Sign-In button and for obtaining the ID token sent to `POST /api/auth/google`.
- Frontend must send **credentials** (cookies) with requests so the session cookie is included (e.g. `fetch(..., { credentials: 'include' })`).

## 4. Suggested frontend flow

1. **Device token** – `POST /api/circle/device-token` with `deviceId` from Circle SDK; store `deviceToken` and `deviceEncryptionKey` for the SDK.
2. **Sign in with Google** – Get Google ID token (e.g. Google Sign-In button). Call `POST /api/auth/google` with `{ idToken }`; session cookie is set.
3. **Initialize user** – In the frontend, use Circle SDK to complete “Login with Google” (using device token); Circle returns `userToken` and `encryptionKey`. Store both in sessionStorage (fixed keys `circleUserToken`, `circleEncryptionKey`). Call `POST /api/auth/circle-login` with `{ userToken }` and `POST /api/circle/initialize-user` with `{ userToken }` only; backend stores only `userToken` in session and returns `challengeId`. The encryption key is never sent to the server.
4. **Create wallet** – Frontend uses Circle SDK to execute the challenge; user approves; wallet is created.
5. **Use app** – Call `GET /api/circle/wallets` to list wallets; use `GET /api/circle/wallets/:walletId/balance` for balance; send chat with optional `walletId` (or omit to use first wallet). All requests must include credentials so the session cookie is sent.
