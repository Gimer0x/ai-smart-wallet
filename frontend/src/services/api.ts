/**
 * API Service
 *
 * Session-based auth: all requests use credentials: 'include' (cookies).
 * No API key required for protected routes; backend uses session.
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    credentials: 'include',
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || `HTTP ${response.status}: ${response.statusText}`);
  }

  const data: ApiResponse<T> = await response.json();

  if (!data.success) {
    throw new Error(data.error || 'Request failed');
  }

  return data.data as T;
}

// --- Auth ---
export interface MeData {
  googleSub: string;
  email?: string;
  hasCircleUser: boolean;
}

export const authApi = {
  /** Verify Google ID token and create session */
  postGoogle: (idToken: string) =>
    apiRequest<{ sub: string; email?: string }>('/auth/google', {
      method: 'POST',
      body: JSON.stringify({ idToken }),
    }),

  /**
   * Create session from Circle user credentials (after "Login with Google" via Circle SDK).
   * Call this right after onLoginComplete so the app has one sign-in flow.
   */
  circleLogin: (userToken: string, encryptionKey: string) =>
    apiRequest<{ sub: string }>('/auth/circle-login', {
      method: 'POST',
      body: JSON.stringify({ userToken, encryptionKey }),
    }),

  logout: () =>
    apiRequest<unknown>('/auth/logout', { method: 'POST' }),

  /** Current session user (for UI) */
  me: () => apiRequest<MeData>('/auth/me'),
};

// --- Circle (device token + initialize user) ---
export const circleApi = {
  /** Get device token for Circle SDK. No auth required. */
  createDeviceToken: (deviceId: string) =>
    apiRequest<{ deviceToken: string; deviceEncryptionKey: string }>('/circle/device-token', {
      method: 'POST',
      body: JSON.stringify({ deviceId }),
    }),

  /**
   * Initialize Circle user (requires Google session).
   * Stores userToken in session; returns challengeId for wallet creation.
   */
  initializeUser: (body: {
    userToken: string;
    encryptionKey: string;
    blockchains?: string[];
    accountType?: 'SCA' | 'EOA';
  }) =>
    apiRequest<{ challengeId?: string; alreadyInitialized?: boolean }>('/circle/initialize-user', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
};

// --- Wallets (current user only; requires Circle user session) ---
export interface Wallet {
  id: string;
  address: string;
  blockchain: string;
  state: string;
  walletSetId?: string;
  accountType?: string;
  createDate?: string;
  updateDate?: string;
}

export const walletApi = {
  listWallets: () => apiRequest<Wallet[]>('/wallets'),

  getWallet: (walletId: string) => apiRequest<Wallet>(`/wallets/${walletId}`),

  getBalance: (walletId: string) =>
    apiRequest<Array<{ token: { id: string; symbol: string; name?: string; blockchain: string; decimals?: number }; amount: string }>>(
      `/wallets/${walletId}/balance`
    ),

  listTransactions: (walletId: string, transactionType?: string, state?: string) => {
    const params = new URLSearchParams();
    if (transactionType) params.append('transactionType', transactionType);
    if (state) params.append('state', state);
    const query = params.toString() ? `?${params.toString()}` : '';
    return apiRequest<any[]>(`/wallets/${walletId}/transactions${query}`);
  },

  getTransaction: (transactionId: string) =>
    apiRequest<any>(`/wallets/transactions/${transactionId}`),

  /**
   * Prepare transfer: returns challengeId for frontend to have user sign via Circle SDK.
   * Does NOT execute; user must sign in app.
   */
  prepareTransfer: (
    walletId: string,
    body: { tokenId: string; destinationAddress: string; amount: string; feeLevel?: string }
  ) =>
    apiRequest<{ challengeId: string; message: string }>(`/wallets/${walletId}/transfer`, {
      method: 'POST',
      body: JSON.stringify({ ...body, feeLevel: body.feeLevel || 'MEDIUM' }),
    }),
};

// --- Chat ---
export type PendingAction =
  | { type: 'transfer'; walletId: string; tokenId: string; destinationAddress: string; amount: string; feeLevel?: string }
  | { type: 'purchase'; walletId: string; ebookId: string };

export const chatApi = {
  sendMessage: async (message: string, walletId?: string): Promise<{ response: string; timestamp?: string; pendingAction?: PendingAction }> => {
    const response = await fetch(`${API_BASE_URL}/chat`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, walletId }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(error.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    if (data.success && data.data) {
      return {
        response: data.data.response,
        timestamp: data.data.timestamp,
        ...(data.data.pendingAction && { pendingAction: data.data.pendingAction }),
      };
    }
    if (data.response) {
      return { response: data.response, timestamp: data.timestamp };
    }
    throw new Error('Unexpected response format');
  },
};

// --- Marketplace ---
export interface EBook {
  id: string;
  title: string;
  author: string;
  price: number;
  description: string;
  category?: string;
}

export const marketplaceApi = {
  getAllEbooks: () => apiRequest<EBook[]>('/marketplace/ebooks'),

  searchEbooks: (query: string) => {
    const params = new URLSearchParams({ q: query });
    return apiRequest<EBook[]>(`/marketplace/ebooks/search?${params.toString()}`);
  },

  getEbook: (id: string) => apiRequest<EBook>(`/marketplace/ebooks/${id}`),

  getConfig: () => apiRequest<any>('/marketplace/config'),

  getPurchasedEbooks: (walletId: string) => {
    const params = new URLSearchParams({ walletId });
    return apiRequest<EBook[]>(`/marketplace/purchased?${params.toString()}`);
  },

  isEbookPurchased: (ebookId: string, walletId: string) => {
    const params = new URLSearchParams({ walletId });
    return apiRequest<{ ebookId: string; purchased: boolean }>(
      `/marketplace/ebooks/${ebookId}/purchased?${params.toString()}`
    );
  },

  /** Prepare purchase: returns challengeId for user to sign. Does not execute or record. */
  preparePurchase: (ebookId: string, walletId: string) =>
    apiRequest<{
      challengeId: string;
      ebook: EBook;
      amount: string;
      message: string;
    }>('/marketplace/purchase/prepare', {
      method: 'POST',
      body: JSON.stringify({ ebookId, walletId }),
    }),

  /** Record purchase after user has signed payment (call after successful payment). */
  confirmPurchase: (walletId: string, ebookId: string) =>
    apiRequest<{ message: string; walletId: string; ebookId: string }>('/marketplace/purchase/confirm', {
      method: 'POST',
      body: JSON.stringify({ walletId, ebookId }),
    }),
};
