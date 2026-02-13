/**
 * Chat API Routes
 *
 * Handles chat interactions with the AI agent.
 * Requires authenticated session; walletId must belong to current user (or use first user wallet).
 */

import { Router, Request, Response } from 'express';
import { requireCircleUser } from '../middleware/requireAuth';
import { getSession } from '../utils/getSession';
import { listWallets } from '../circleUser/circleUserClient';
import { processMessage } from '../agent/agent';
import { createUserWalletTools } from '../agent/tools/userWallet.tools';
import { createMarketplaceTools } from '../agent/tools/marketplace.tools';

const router = Router();

/**
 * POST /api/chat
 * Body: { message, walletId? }
 * Resolves activeWalletId from session: body.walletId (verified) or first user wallet.
 */
router.post('/', requireCircleUser, async (req: Request, res: Response) => {
  console.log('Received request to chat endpoint:', req.body);
  try {
    const { message, walletId: bodyWalletId } = req.body;
    if (!message || typeof message !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Message is required and must be a string',
      });
    }

    const session = getSession(req);
    const userToken = session.circleUserToken!;
    const list = await listWallets(userToken);
    const wallets = list.data.wallets || [];
    let activeWalletId: string | undefined;

    if (bodyWalletId && typeof bodyWalletId === 'string') {
      const owned = wallets.some((w) => w.id === bodyWalletId);
      if (!owned) {
        return res.status(403).json({
          success: false,
          message: 'Wallet does not belong to the current user.',
        });
      }
      activeWalletId = bodyWalletId;
    } else {
      activeWalletId = wallets[0]?.id;
    }

    if (!activeWalletId) {
      return res.status(400).json({
        success: false,
        message: 'No wallet found for user. Create a wallet first (complete initialize-user and execute challenge).',
      });
    }

    const walletTools = createUserWalletTools(userToken);
    const marketplaceTools = createMarketplaceTools(userToken);
    const allTools = [...walletTools, ...marketplaceTools];
    const result = await processMessage(message, activeWalletId, allTools);
    console.log('Generated response:', result.response, result.pendingAction ? '(with pending action)' : '');

    res.json({
      success: true,
      data: {
        response: result.response,
        timestamp: new Date().toISOString(),
        ...(result.pendingAction && { pendingAction: result.pendingAction }),
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