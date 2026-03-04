/**
 * Agent Type Definitions
 */

export interface AgentMessage {
  role: 'user' | 'agent' | 'system';
  content: string;
  timestamp?: Date;
}

export interface AgentResponse {
  message: string;
  action?: string;
  data?: any;
}

export interface AgentConfig {
  walletId?: string;
  temperature?: number;
  model?: string;
}

/** Pending action returned by transfer tool; frontend uses it to show Sign UI and call prepare endpoint */
export type PendingAction = {
  type: 'transfer';
  walletId: string;
  tokenId: string;
  destinationAddress: string;
  amount: string;
  feeLevel?: string;
};

export const PENDING_ACTION_MARKER = '__PENDING_ACTION__';