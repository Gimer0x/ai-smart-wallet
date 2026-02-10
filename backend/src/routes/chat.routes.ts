/**
 * Chat API Routes
 * 
 * Handles chat interactions with the AI agent
 */

import { Router, Request, Response } from 'express';
import { apiKeyAuth } from '../middleware/auth';
import { processMessage } from '../agent/agent';
import { walletTools } from '../agent/tools/wallet.tools';
import { marketplaceTools } from '../agent/tools/marketplace.tools';
import dotenv from 'dotenv';

dotenv.config();

// Primary wallet ID - Wallet for purchasing (set via PRIMARY_WALLET_ID env var)
const PRIMARY_WALLET_ID = process.env.PRIMARY_WALLET_ID;

// Secondary wallet ID - Wallet for receiving marketplace payments (optional)
const SECONDARY_WALLET_ID = process.env.SECONDARY_WALLET_ID;

const router = Router();

/**
 * POST /api/chat
 * Send a message to the AI agent
 */
router.post('/', apiKeyAuth, async (req: Request, res: Response) => {
  console.log('Received request to chat endpoint:', req.body);
  try {
    const { message, walletId } = req.body;
    console.log('Processing message:', message);

    if (!message || typeof message !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Message is required and must be a string',
      });
    }

    // Use provided walletId or default to primary wallet from env
    const activeWalletId = walletId || PRIMARY_WALLET_ID;
    
    if (!activeWalletId) {
      return res.status(500).json({
        success: false,
        message: 'PRIMARY_WALLET_ID environment variable is not set. Please configure it in your .env file.',
      });
    }
    
    // Combine all available tools
    const allTools = [...walletTools, ...marketplaceTools];

    // Process the message with the agent and tools
    const response = await processMessage(message, activeWalletId, allTools);
    console.log('Generated response:', response);

    res.json({
      success: true,
      data: {
        response,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error('Error in chat endpoint:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
});

export default router;