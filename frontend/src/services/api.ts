/**
 * API Service
 * 
 * Handles all API calls to the backend with API key authentication
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';
const API_KEY = import.meta.env.VITE_API_KEY || '';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Make an API request with authentication
 */
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  // Add API key if available
  if (API_KEY) {
    headers['X-API-Key'] = API_KEY;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
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

// Wallet API
export const walletApi = {
  // List all wallets
  listWallets: () => apiRequest<any[]>('/wallets'),

  // Get wallet details
  getWallet: (walletId: string) => apiRequest<any>(`/wallets/${walletId}`),

  // Get wallet balance
  getBalance: (walletId: string, tokenAddress?: string) => {
    const params = tokenAddress ? `?tokenAddress=${tokenAddress}` : '';
    return apiRequest<any[]>(`/wallets/${walletId}/balance${params}`);
  },

  // List transactions
  listTransactions: (walletId: string, transactionType?: string, state?: string) => {
    const params = new URLSearchParams();
    if (transactionType) params.append('transactionType', transactionType);
    if (state) params.append('state', state);
    const query = params.toString() ? `?${params.toString()}` : '';
    return apiRequest<any[]>(`/wallets/${walletId}/transactions${query}`);
  },

  // Get transaction
  getTransaction: (transactionId: string) =>
    apiRequest<any>(`/wallets/transactions/${transactionId}`),

  // Transfer tokens
  transferTokens: (
    walletId: string,
    tokenId: string,
    destinationAddress: string,
    amount: string,
    feeLevel: string = 'MEDIUM'
  ) =>
    apiRequest<any>(`/wallets/${walletId}/transfer`, {
      method: 'POST',
      body: JSON.stringify({
        tokenId,
        destinationAddress,
        amount,
        feeLevel,
      }),
    }),
};

// Chat API
export const chatApi = {
  // Send a message to the AI agent
  sendMessage: async (message: string, walletId?: string) => {
    const response = await fetch(`${API_BASE_URL}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(API_KEY && { 'X-API-Key': API_KEY }),
      },
      body: JSON.stringify({
        message,
        walletId,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(error.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    
    // Handle the response format: { success: true, data: { response, timestamp } }
    if (data.success && data.data) {
      return { response: data.data.response, timestamp: data.data.timestamp };
    }
    
    // Fallback for old format
    if (data.response) {
      return { response: data.response, timestamp: data.timestamp };
    }
    
    throw new Error('Unexpected response format');
  },
};

// Marketplace API
export const marketplaceApi = {
  // Get all e-books
  getAllEbooks: () => apiRequest<EBook[]>('/marketplace/ebooks'),

  // Search e-books
  searchEbooks: (query: string) => {
    const params = new URLSearchParams({ q: query });
    return apiRequest<EBook[]>(`/marketplace/ebooks/search?${params.toString()}`);
  },

  // Get e-book by ID
  getEbook: (id: string) => apiRequest<EBook>(`/marketplace/ebooks/${id}`),

  // Get marketplace config
  getConfig: () => apiRequest<any>('/marketplace/config'),

  // Get purchased e-books for a wallet
  getPurchasedEbooks: (walletId: string) => {
    const params = new URLSearchParams({ walletId });
    return apiRequest<EBook[]>(`/marketplace/purchased?${params.toString()}`);
  },

  // Check if e-book is purchased
  isEbookPurchased: (ebookId: string, walletId: string) => {
    const params = new URLSearchParams({ walletId });
    return apiRequest<{ ebookId: string; purchased: boolean }>(`/marketplace/ebooks/${ebookId}/purchased?${params.toString()}`);
  },
};

interface EBook {
  id: string;
  title: string;
  author: string;
  price: number;
  description: string;
  category?: string;
}

