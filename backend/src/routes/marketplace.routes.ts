/**
 * Marketplace API Routes
 *
 * Handles marketplace-related API endpoints.
 * Prepare/confirm purchase require Circle user (user-controlled flow).
 */

import { Router, Request, Response } from 'express';
import { getAllEbooks, searchEbooks, findEbookById } from '../marketplace/catalog';
import {
  getMarketplaceConfig,
  getPurchasedEbooks,
  isEbookPurchased,
  preparePurchase,
  confirmPurchase,
} from '../marketplace/marketplace';
import { requireCircleUser } from '../middleware/requireAuth';
import { getSession } from '../utils/getSession';
import { listWallets } from '../circleUser/circleUserClient';

const router = Router();

/**
 * GET /api/marketplace/ebooks
 * Get all available e-books
 */
router.get('/ebooks', async (req: Request, res: Response) => {
  try {
    const ebooks = getAllEbooks();
    res.json({ success: true, data: ebooks });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/marketplace/ebooks/search
 * Search e-books by query
 */
router.get('/ebooks/search', async (req: Request, res: Response) => {
  try {
    const { q } = req.query;
    
    if (!q || typeof q !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Query parameter "q" is required',
      });
    }

    const results = searchEbooks(q);
    res.json({ success: true, data: results });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/marketplace/ebooks/:id
 * Get specific e-book by ID
 */
router.get('/ebooks/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const ebook = findEbookById(id);
    
    if (!ebook) {
      return res.status(404).json({
        success: false,
        error: 'E-book not found',
      });
    }

    res.json({ success: true, data: ebook });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/marketplace/config
 * Get marketplace configuration
 */
router.get('/config', async (req: Request, res: Response) => {
  try {
    const config = getMarketplaceConfig();
    res.json({ success: true, data: config });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/marketplace/purchased
 * Get all purchased e-books for a wallet
 */
router.get('/purchased', async (req: Request, res: Response) => {
  try {
    const { walletId } = req.query;
    
    if (!walletId || typeof walletId !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'walletId query parameter is required',
      });
    }

    const purchasedEbooks = getPurchasedEbooks(walletId);
    
    res.json({ success: true, data: purchasedEbooks });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/marketplace/ebooks/:id/purchased
 * Check if a specific e-book is purchased
 */
router.get('/ebooks/:id/purchased', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { walletId } = req.query;
    
    if (!walletId || typeof walletId !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'walletId query parameter is required',
      });
    }

    const isPurchased = isEbookPurchased(walletId, id);
    res.json({ success: true, data: { ebookId: id, purchased: isPurchased } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/marketplace/purchase/prepare
 * Body: { ebookId, walletId }
 * Returns payment details and challengeId for user to sign in the app. Does not execute or record.
 */
router.post('/purchase/prepare', requireCircleUser, async (req: Request, res: Response) => {
  try {
    const userToken = getSession(req).circleUserToken!;
    const { ebookId, walletId } = req.body;
    if (!ebookId || !walletId) {
      return res.status(400).json({
        success: false,
        error: 'ebookId and walletId are required',
      });
    }
    const list = await listWallets(userToken);
    const owned = list.data.wallets.some((w) => w.id === walletId);
    if (!owned) {
      return res.status(403).json({ success: false, error: 'Wallet does not belong to the current user' });
    }
    const result = await preparePurchase(String(ebookId), walletId, userToken);
    if (!result.success) {
      return res.status(400).json({ success: false, error: result.message });
    }
    res.json({
      success: true,
      data: {
        challengeId: result.challengeId,
        ebook: result.ebook,
        amount: result.amount,
        message: result.message,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/marketplace/purchase/confirm
 * Body: { walletId, ebookId [, transactionId ] }
 * Records the purchase (call after user has signed and payment is sent).
 */
router.post('/purchase/confirm', requireCircleUser, async (req: Request, res: Response) => {
  try {
    const userToken = getSession(req).circleUserToken!;
    const { walletId, ebookId } = req.body;
    if (!walletId || !ebookId) {
      return res.status(400).json({
        success: false,
        error: 'walletId and ebookId are required',
      });
    }
    const list = await listWallets(userToken);
    const owned = list.data.wallets.some((w) => w.id === walletId);
    if (!owned) {
      return res.status(403).json({ success: false, error: 'Wallet does not belong to the current user' });
    }
    confirmPurchase(walletId, String(ebookId));
    res.json({ success: true, data: { message: 'Purchase recorded.', walletId, ebookId } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;