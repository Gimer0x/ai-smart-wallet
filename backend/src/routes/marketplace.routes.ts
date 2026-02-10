/**
 * Marketplace API Routes
 * 
 * Handles marketplace-related API endpoints
 */

import { Router, Request, Response } from 'express';
import { apiKeyAuth } from '../middleware/auth';
import { getAllEbooks, searchEbooks, findEbookById } from '../marketplace/catalog';
import { getMarketplaceConfig, getPurchasedEbooks, isEbookPurchased } from '../marketplace/marketplace';

const router = Router();

/**
 * GET /api/marketplace/ebooks
 * Get all available e-books
 */
router.get('/ebooks', apiKeyAuth, async (req: Request, res: Response) => {
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
router.get('/ebooks/search', apiKeyAuth, async (req: Request, res: Response) => {
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
router.get('/ebooks/:id', apiKeyAuth, async (req: Request, res: Response) => {
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
router.get('/config', apiKeyAuth, async (req: Request, res: Response) => {
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
router.get('/purchased', apiKeyAuth, async (req: Request, res: Response) => {
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
router.get('/ebooks/:id/purchased', apiKeyAuth, async (req: Request, res: Response) => {
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

export default router;