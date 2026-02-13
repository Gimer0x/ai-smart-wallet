/**
 * Circle Programmable Wallets (user-controlled) API client
 * Proxies requests to Circle so the frontend never sees the API key.
 * Uses only CIRCLE_API_KEY (no Entity Secret).
 */

import type {
  CircleDeviceTokenResponse,
  CircleInitializeUserResponse,
  CircleListWalletsResponse,
  CircleWalletBalanceResponse,
  CircleGetWalletResponse,
  CircleListTransactionsResponse,
  CircleGetTransactionResponse,
  CircleTransferChallengeResponse,
} from "./types";

const CIRCLE_BASE_URL = process.env.CIRCLE_BASE_URL || "https://api.circle.com";
const CIRCLE_API_KEY = process.env.CIRCLE_API_KEY;

function getAuthHeader(): string {
  if (!CIRCLE_API_KEY) {
    throw new Error("CIRCLE_API_KEY is required for Circle user wallet API");
  }
  return `Bearer ${CIRCLE_API_KEY}`;
}

function idempotencyKey(): string {
  return crypto.randomUUID();
}

/**
 * Create device token for social login (e.g. Google).
 * Frontend sends deviceId from Circle SDK; we return deviceToken + deviceEncryptionKey.
 */
export async function createDeviceToken(deviceId: string): Promise<CircleDeviceTokenResponse> {
  const res = await fetch(`${CIRCLE_BASE_URL}/v1/w3s/users/social/token`, {
    method: "POST",
    headers: {
      Authorization: getAuthHeader(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      idempotencyKey: idempotencyKey(),
      deviceId,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Circle device token failed: ${res.status} ${err}`);
  }

  return res.json() as Promise<CircleDeviceTokenResponse>;
}

/**
 * Initialize user and create wallet challenge.
 * Requires userToken from Circle SDK (after frontend completes Google login via Circle).
 */
export async function initializeUser(
  userToken: string,
  options?: {
    accountType?: "SCA" | "EOA";
    blockchains?: string[];
    metadata?: Array<{ name?: string; refId?: string }>;
  }
): Promise<CircleInitializeUserResponse> {
  const body: Record<string, unknown> = {
    idempotencyKey: idempotencyKey(),
    accountType: options?.accountType ?? "EOA",
    blockchains: options?.blockchains ?? ["ARC-TESTNET"],
  };
  if (options?.metadata?.length) body.metadata = options.metadata;

  const res = await fetch(`${CIRCLE_BASE_URL}/v1/w3s/user/initialize`, {
    method: "POST",
    headers: {
      Authorization: getAuthHeader(),
      "Content-Type": "application/json",
      "X-User-Token": userToken,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    let errBody: { code?: number; message?: string } = {};
    try {
      errBody = JSON.parse(errText) as { code?: number; message?: string };
    } catch {
      // ignore
    }
    const err = new Error(`Circle initialize user failed: ${res.status} ${errText}`) as Error & { code?: number; body?: unknown };
    err.code = errBody.code;
    err.body = errBody;
    throw err;
  }

  return res.json() as Promise<CircleInitializeUserResponse>;
}

/**
 * List wallets for the user identified by userToken.
 */
export async function listWallets(userToken: string): Promise<CircleListWalletsResponse> {
  const res = await fetch(`${CIRCLE_BASE_URL}/v1/w3s/wallets`, {
    method: "GET",
    headers: {
      Authorization: getAuthHeader(),
      "X-User-Token": userToken,
    },
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Circle list wallets failed: ${res.status} ${err}`);
  }

  return res.json() as Promise<CircleListWalletsResponse>;
}

/**
 * Get token balance for a user-controlled wallet.
 * Caller must ensure walletId belongs to the user (e.g. via listWallets first).
 */
export async function getWalletBalance(
  userToken: string,
  walletId: string
): Promise<CircleWalletBalanceResponse> {
  const res = await fetch(`${CIRCLE_BASE_URL}/v1/w3s/wallets/${encodeURIComponent(walletId)}/balances`, {
    method: "GET",
    headers: {
      Authorization: getAuthHeader(),
      "X-User-Token": userToken,
    },
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Circle wallet balance failed: ${res.status} ${err}`);
  }

  return res.json() as Promise<CircleWalletBalanceResponse>;
}

/**
 * Get a single wallet by ID (user-controlled).
 * Caller must ensure walletId belongs to the user.
 */
export async function getWallet(
  userToken: string,
  walletId: string
): Promise<CircleGetWalletResponse> {
  const res = await fetch(`${CIRCLE_BASE_URL}/v1/w3s/wallets/${encodeURIComponent(walletId)}`, {
    method: "GET",
    headers: {
      Authorization: getAuthHeader(),
      "X-User-Token": userToken,
    },
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Circle get wallet failed: ${res.status} ${err}`);
  }

  return res.json() as Promise<CircleGetWalletResponse>;
}

/**
 * List transactions for the user (optionally filter by walletIds, txType, state).
 */
export async function listTransactions(
  userToken: string,
  params?: {
    walletIds?: string[];
    txType?: "INBOUND" | "OUTBOUND";
    state?: string;
    pageSize?: number;
  }
): Promise<CircleListTransactionsResponse> {
  const searchParams = new URLSearchParams();
  if (params?.walletIds?.length) searchParams.set("walletIds", params.walletIds.join(","));
  if (params?.txType) searchParams.set("txType", params.txType);
  if (params?.state) searchParams.set("state", params.state);
  if (params?.pageSize) searchParams.set("pageSize", String(params.pageSize));
  const query = searchParams.toString() ? `?${searchParams.toString()}` : "";

  const res = await fetch(`${CIRCLE_BASE_URL}/v1/w3s/transactions${query}`, {
    method: "GET",
    headers: {
      Authorization: getAuthHeader(),
      "X-User-Token": userToken,
    },
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Circle list transactions failed: ${res.status} ${err}`);
  }

  return res.json() as Promise<CircleListTransactionsResponse>;
}

/**
 * Get a single transaction by ID (user-controlled).
 */
export async function getTransaction(
  userToken: string,
  transactionId: string
): Promise<CircleGetTransactionResponse> {
  const res = await fetch(
    `${CIRCLE_BASE_URL}/v1/w3s/transactions/${encodeURIComponent(transactionId)}`,
    {
      method: "GET",
      headers: {
        Authorization: getAuthHeader(),
        "X-User-Token": userToken,
      },
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Circle get transaction failed: ${res.status} ${err}`);
  }

  return res.json() as Promise<CircleGetTransactionResponse>;
}

/**
 * Create a transfer challenge for the user to sign (user-controlled wallet).
 * Returns challengeId for the frontend to execute with Circle SDK.
 */
export async function createTransferChallenge(
  userToken: string,
  params: {
    walletId: string;
    tokenId: string;
    destinationAddress: string;
    amount: string;
    feeLevel?: "LOW" | "MEDIUM" | "HIGH";
  }
): Promise<CircleTransferChallengeResponse> {
  const res = await fetch(`${CIRCLE_BASE_URL}/v1/w3s/user/transactions/transfer`, {
    method: "POST",
    headers: {
      Authorization: getAuthHeader(),
      "Content-Type": "application/json",
      "X-User-Token": userToken,
    },
    body: JSON.stringify({
      idempotencyKey: idempotencyKey(),
      walletId: params.walletId,
      tokenId: params.tokenId,
      destinationAddress: params.destinationAddress,
      amounts: [params.amount],
      feeLevel: params.feeLevel ?? "MEDIUM",
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Circle create transfer challenge failed: ${res.status} ${err}`);
  }

  return res.json() as Promise<CircleTransferChallengeResponse>;
}
