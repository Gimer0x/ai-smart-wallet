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