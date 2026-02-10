/**
 * Marketplace Tools for the AI Agent
 * 
 * Tools for interacting with the e-book marketplace
 */

import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import { getAllEbooks, searchEbooks, findEbookById, getEbookPrice } from "../../marketplace/catalog";
import { processPurchase } from "../../marketplace/marketplace";
import * as walletManager from "../../wallet/walletManager";

/**
 * Tool to browse available e-books
 */
export const browseEbooksTool = new DynamicStructuredTool({
  name: "browse_ebooks",
  description: "Use this tool when users ask to list, show, or see all available e-books. This tool returns the complete list of all e-books in the marketplace with their titles, authors, prices, categories, descriptions, and IDs. ALWAYS use this tool when asked to list e-books - do not just describe what you can do.",
  schema: z.object({}),
  func: async () => {
    try {
      const ebooks = getAllEbooks();
      
      if (ebooks.length === 0) {
        return "No e-books available in the marketplace.";
      }

      const ebookList = ebooks.map((ebook, index) => {
        return `${index + 1}. "${ebook.title}" by ${ebook.author}
   Price: ${ebook.price} USDC
   Category: ${ebook.category || 'General'}
   Description: ${ebook.description}
   ID: ${ebook.id}`;
      }).join("\n\n");

      return `Available E-Books (${ebooks.length}):\n\n${ebookList}`;
    } catch (error: any) {
      return `Error browsing e-books: ${error.message || "Unknown error"}`;
    }
  },
});

/**
 * Tool to search for a specific e-book
 */
export const searchEbooksTool = new DynamicStructuredTool({
  name: "search_ebooks",
  description: "Search for an e-book by title, author, description, or category in the marketplace.",
  schema: z.object({
    query: z.string().describe("Search query (title, author name, category, or keywords)"),
  }),
  func: async ({ query }) => {
    try {
      const results = searchEbooks(query);
      
      if (results.length === 0) {
        return `No e-books found matching "${query}". Try browsing all e-books or use different search terms.`;
      }

      const resultList = results.map((ebook, index) => {
        return `${index + 1}. "${ebook.title}" by ${ebook.author}
   Price: ${ebook.price} USDC
   Category: ${ebook.category || 'General'}
   Description: ${ebook.description}
   ID: ${ebook.id}`;
      }).join("\n\n");

      return `Search Results (${results.length} found):\n\n${resultList}`;
    } catch (error: any) {
      return `Error searching e-books: ${error.message || "Unknown error"}`;
    }
  },
});

/**
 * Tool to get e-book price and details
 */
export const getEbookPriceTool = new DynamicStructuredTool({
  name: "get_ebook_price",
  description: "Get the price and details of a specific e-book by its ID. The ID can be provided as a string or number.",
  schema: z.object({
    ebookId: z.union([z.string(), z.number()]).describe("The e-book ID (can be a string like '18' or number like 18)"),
  }),
  func: async ({ ebookId }) => {
    try {
      // Convert to string if it's a number
      const ebookIdStr = String(ebookId);
      const ebook = findEbookById(ebookIdStr);
      
      if (!ebook) {
        return `E-book with ID "${ebookIdStr}" not found. Use browse_ebooks or search_ebooks to find available e-books.`;
      }

      return `E-Book Details:
Title: "${ebook.title}"
Author: ${ebook.author}
Price: ${ebook.price} USDC
Category: ${ebook.category || 'General'}
Description: ${ebook.description}
ID: ${ebook.id}`;
    } catch (error: any) {
      return `Error getting e-book price: ${error.message || "Unknown error"}`;
    }
  },
});

/**
 * Tool to purchase an e-book
 */
export const purchaseEbookTool = new DynamicStructuredTool({
  name: "purchase_ebook",
  description: "Purchase an e-book by transferring USDC to the marketplace. Requires wallet ID, e-book ID, and token ID (from balance check). Always check balance first to get the token ID.",
  schema: z.object({
    walletId: z.string().describe("The wallet ID to use for payment"),
    ebookId: z.union([z.string(), z.number()]).describe("The e-book ID to purchase (can be a string like '18' or number like 18)"),
    tokenId: z.string().describe("The token ID for USDC (get this from check_wallet_balance tool)"),
  }),
  func: async ({ walletId, ebookId, tokenId }) => {
    try {
      // Convert to string if it's a number
      const ebookIdStr = String(ebookId);
      
      // Process the purchase
      const result = await processPurchase(ebookIdStr, walletId, tokenId);
      
      if (!result.success) {
        return result.message;
      }

      // Return success message with transaction details
      const explorerLink = result.transactionHash && result.transactionHash !== 'Pending'
        ? `\nView on Explorer: https://testnet.arcscan.app/tx/${result.transactionHash}`
        : '';

      return `${result.message}${explorerLink}

You now own "${result.ebook.title}" by ${result.ebook.author}!`;
    } catch (error: any) {
      return `Error purchasing e-book: ${error.message || "Unknown error"}`;
    }
  },
});

// Export all marketplace tools
export const marketplaceTools = [
  browseEbooksTool,
  searchEbooksTool,
  getEbookPriceTool,
  purchaseEbookTool,
];