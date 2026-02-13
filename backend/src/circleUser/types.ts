/**
 * Types for Circle Programmable Wallets (user-controlled) API responses
 */

export interface CircleDeviceTokenResponse {
  data: {
    deviceToken: string;
    deviceEncryptionKey: string;
  };
}

export interface CircleInitializeUserResponse {
  data: {
    challengeId: string;
  };
}

export interface CircleWallet {
  id: string;
  address: string;
  blockchain: string;
  createDate: string;
  updateDate: string;
  custodyType: string;
  state: string;
  walletSetId?: string;
  accountType?: string;
  name?: string;
  refId?: string;
  userId?: string;
  initialPublicKey?: string;
}

export interface CircleListWalletsResponse {
  data: {
    wallets: CircleWallet[];
  };
}

export interface CircleTokenBalance {
  amount: string;
  token: {
    id: string;
    blockchain: string;
    symbol: string;
    name?: string;
    decimals?: number;
    tokenAddress?: string;
    [key: string]: unknown;
  };
  updateDate?: string;
}

export interface CircleWalletBalanceResponse {
  data: {
    tokenBalances: CircleTokenBalance[];
  };
}

export interface CircleGetWalletResponse {
  data: {
    wallet: CircleWallet;
  };
}

export interface CircleTransaction {
  id: string;
  blockchain: string;
  createDate: string;
  updateDate: string;
  state: string;
  transactionType: string;
  amounts: string[];
  sourceAddress?: string;
  destinationAddress?: string;
  txHash?: string;
  walletId: string;
  tokenId?: string;
  [key: string]: unknown;
}

export interface CircleListTransactionsResponse {
  data: {
    transactions: CircleTransaction[];
  };
}

export interface CircleGetTransactionResponse {
  data: {
    transaction: CircleTransaction;
  };
}

export interface CircleTransferChallengeResponse {
  data: {
    challengeId: string;
  };
}
