# Wallet-Integrated AI: Autonomous Smart Wallet Agent

An AI-powered autonomous wallet system that uses USDC on ARC Testnet to perform transactions on your behalf. This project demonstrates how to build a smart wallet agent that can autonomously purchase items from a marketplace, check balances, transfer tokens, and manage transactions through natural language conversations.

## Overview

This project combines:
- **Circle User-Controlled Wallets** for user sign-in and wallet operations
- **Groq AI (Llama 3.3)** for natural language processing
- **LangChain.js** for AI agent orchestration
- **React + TypeScript** for the frontend; **Node.js + Express** for the backend

The AI agent can:
- ✅ Check wallet balances and transaction history
- ✅ Transfer USDC tokens to any address
- ✅ Answer questions about wallet status and transactions
- ✅ Execute transactions autonomously based on user requests

## Quick Start

### Prerequisites

- Node.js 18+ and npm
- Circle Developer Account ([Sign up here](https://console.circle.com/))
- Groq API Key ([Get one here](https://console.groq.com/))

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Stephen-Kimoi/wallet-intergrated-ai
   cd wallet-intergrated-ai
   ```

2. **Install dependencies:**
   ```bash
   npm install
   npm run install:all
   ```

## 📋 Setup Guide (user flows)

User wallets are created and controlled by users (Google sign-in + Circle). No Entity Secret or PRIMARY_WALLET_ID is required for the main app.

### Step 1: Backend environment

1. **Circle API Key:** Get `CIRCLE_API_KEY` from [Circle Console](https://console.circle.com/).
2. **Google OAuth:** Configure `GOOGLE_CLIENT_ID` (or `GOOGLE_WEB_CLIENT_ID`) for session auth.
3. **Groq:** Set `GROQ_API_KEY` for the AI agent.
4. **Marketplace:** Set `MARKETPLACE_WALLET_ADDRESS` to the address that should receive USDC from purchases (any address you control).

Example `backend/.env`:
```env
CIRCLE_API_KEY=your_circle_api_key
GOOGLE_CLIENT_ID=your_google_web_client_id
GROQ_API_KEY=your_groq_api_key
MARKETPLACE_WALLET_ADDRESS=0x...   # Receives purchase payments
SESSION_SECRET=your_session_secret
```

### Step 2: Frontend environment

Copy `frontend/env.example` to `frontend/.env` and set:
```env
VITE_GOOGLE_CLIENT_ID=your_google_web_client_id
VITE_CIRCLE_APP_ID=your_circle_app_id
VITE_API_BASE_URL=/api
```

### Step 3: Start the application

Run both frontend and backend simultaneously:
```bash
npm run dev
```

Or run them separately:
```bash
# Terminal 1 - Backend
npm run dev:backend

# Terminal 2 - Frontend
npm run dev:frontend
```

The application will be available at:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001

### Step 4: Circle + Google OAuth (for "Create wallet" flow)

If you see **"Failed to validate the idToken/ accessToken"** or **"Google sign-in was rejected by Circle"** after returning from Google:

1. **Google Cloud Console** → APIs & Services → Credentials → your OAuth 2.0 Web client:
   - **Authorized JavaScript origins:** add `http://localhost:3000` (and `http://127.0.0.1:3000` if you use it).
   - **Authorized redirect URIs:** add `http://localhost:3000` (same as your app origin). Save.
2. **Circle developer dashboard** (Programmable Wallets): for your App ID, ensure the same **Google OAuth client ID** and **redirect URI** (`http://localhost:3000`) are configured for social login. Circle must allow this origin and client for token validation.
3. Wait a few minutes after changing Google/Circle settings, then try again.

#### Validation checklist (use this to confirm your setup)

**Google Cloud Console** (APIs & Services → Credentials → your **OAuth 2.0 Web client**):

- [ ] **Authorized JavaScript origins** contains `http://localhost:3000`
- [ ] If you open the app as `http://127.0.0.1:3000`, that origin is also in **Authorized JavaScript origins**
- [ ] **Authorized redirect URIs** contains `http://localhost:3000` (exact match; no trailing slash unless your app uses it)
- [ ] You clicked **Save** at the bottom of the OAuth client form
- [ ] The **Client ID** shown here is the same as in your app (`VITE_GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_ID`), e.g. `493327240496-...apps.googleusercontent.com`

**Circle developer dashboard** (Programmable Wallets → your app → Social Logins / Authentication):

- [ ] **Google** is enabled for social login
- [ ] **Client ID (Web)** is set and matches your Google OAuth Web client ID exactly (same as above)
- [ ] **Redirect URI** (if shown) is `http://localhost:3000` or matches your app’s origin
- [ ] The **App ID** used here is the same as in your frontend (`VITE_CIRCLE_APP_ID`), e.g. `1b41c44d-9ab7-5739-aba3-1dd16608be7f`

**Cross-check:**

- [ ] Google **Client ID** in Circle = Google **Client ID** in Google Cloud Console = value in your app env
- [ ] Redirect URI / origin is `http://localhost:3000` (or your app URL) in both Google and Circle

When all boxes are checked and a few minutes have passed after saving, try **Continue with Google to create wallet** again.

### Login and wallet creation flow

The app implements this sequence for **"Continue with Google to create wallet"**:

1. **Create device token** — Done as part of the same action as "Login with Google". The frontend gets a device ID from the Circle SDK, calls the backend `POST /api/circle/device-token`, and stores the returned `deviceToken` and `deviceEncryptionKey`.
2. **Login with Google** — Circle SDK redirects the user to Google; after sign-in, the user is redirected back to the app with tokens in the URL hash.
3. **Initialize user** — On return, the frontend calls `POST /api/circle/initialize-user` with the Circle `userToken` and `encryptionKey`. The backend creates the Circle user and returns a `challengeId` when a new wallet must be created.
4. **Create wallet (when necessary)** — If a `challengeId` was returned, the frontend runs the Circle SDK `execute(challengeId)` so the user completes wallet creation; then it refreshes user and wallets.

So device token creation is part of the single "Login with Google" step (same button), and initialize-user runs automatically on return and triggers wallet creation when needed.

### Console messages you can ignore

- **"Datadog Browser SDK: Application ID is not configured, no RUM data will be collected"** — Comes from a third-party script (e.g. bundled in the Circle SDK). The app does not use Datadog; you can ignore this. No data is sent.
- **`GET /api/auth/me` 401 (Unauthorized)** — Normal when no one is logged in; the app uses it to detect session state.
- **Extension messages** (e.g. "SES Removing unpermitted intrinsics", "Provider initialised", "TronLink initiated") — From browser extensions, not the app.

## 💬 Using the AI Wallet Agent

### Chat Interface

The main interface includes a chat where you can interact with your wallet using natural language.

![UI](./UI/UI.png)

### Example Queries

1. **Check Wallet Information:**
   - "Which wallet am I connected to?"
   - "What is my current wallet balance?"
   
   ![question 1](./UI/question-1.png)

2. **View Balance:**
   - "What is my current wallet balance?"
   
   ![question 2](./UI/question-2.png)

3. **Transfer Tokens:**
   - "Send 0.01 USDC to 0x75f100ee75a0e529aacced263de7a8f0e9f9c2a2"
   
   ![question 3](./UI/question-3.png)

4. **View Transactions:**
   - "List for me all transactions"
   - "Show my transaction history"
   
   ![question 6](./UI/question-6.png)



## 🏗️ Project Structure

```
wallet-intergrated-ai/
├── backend/
│   ├── src/
│   │   ├── agent/              # AI agent (Groq + LangChain)
│   │   ├── marketplace/        # E-book marketplace logic
│   │   ├── routes/             # API routes
│   │   └── ...
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── components/         # React components
│   │   └── services/           # API service
│   └── .env.example
├── documentation/               # Detailed guides
└── package.json
```

## 🔧 Available Scripts

### Root Level
- `npm run dev` - Start both frontend and backend
- `npm run dev:backend` - Start backend only
- `npm run dev:frontend` - Start frontend only
- `npm run build` - Build both projects
- `npm run install:all` - Install all dependencies

## 📚 Documentation

- **[06 User auth and Circle proxy](./documentation/06_USER_AUTH_AND_CIRCLE_PROXY.md)** - Session auth and user-controlled wallets
- **[03 API Security](./documentation/03_API_SECURITY.md)** - API authentication
- **[04 Transaction checking](./documentation/04_TRANSACTION_CHECKING.md)** - Monitor transactions
- **[05 Token transfer](./documentation/05_TOKEN_TRANSFER.md)** - Token transfer

## 🎓 Learning Resources

- [Circle Developer Documentation](https://developers.circle.com/)
- [Circle Console](https://console.circle.com/)
- [Groq Documentation](https://console.groq.com/docs)
- [LangChain.js Documentation](https://docs.langchain.com/oss/javascript/langchain/overview)

## 🤝 Contributing

This is a tutorial/educational project demonstrating how to build an AI-powered autonomous wallet system.

---

**Note**: This project uses ARC Testnet for testing. All transactions use testnet USDC and have no real-world value.