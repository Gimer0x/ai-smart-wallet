/**
 * Marketplace Tools for the AI Agent
 *
 * Browse/search/price tools are stateless. Purchase tool can use preparePurchase (user-controlled) when userToken is provided.
 */

import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import { getAllEbooks, searchEbooks, findEbookById, getEbookPrice } from "../../marketplace/catalog";
import { getWalletBalance } from "../../circleUser/circleUserClient";
import { PENDING_ACTION_MARKER } from "../types";

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
 * Create marketplace tools for user-controlled flow: purchase_ebook validates and returns a pending action; user signs in the app.
 */
export function createMarketplaceTools(userToken: string) {
  const purchaseEbookUserTool = new DynamicStructuredTool({
    name: "purchase_ebook",
    description: "Prepare purchase of an e-book. Validates price and balance; returns a pending action so the user can sign in the app. Does not execute until the user signs.",
    schema: z.object({
      walletId: z.string().describe("The wallet ID to use for payment"),
      ebookId: z.union([z.string(), z.number()]).describe("The e-book ID to purchase"),
      tokenId: z.string().optional().describe("Optional token ID for USDC (from check_wallet_balance); will be resolved if omitted"),
    }),
    func: async ({ walletId, ebookId }) => {
      try {
        const ebookIdStr = String(ebookId);
        const ebook = findEbookById(ebookIdStr);
        if (!ebook) {
          return `E-book with ID "${ebookIdStr}" not found. Use browse_ebooks or search_ebooks to find available e-books.`;
        }
        const price = getEbookPrice(ebookIdStr);
        if (price === null) {
          return `Could not retrieve price for e-book "${ebook.title}".`;
        }
        const res = await getWalletBalance(userToken, walletId);
        const usdcBalance = res.data.tokenBalances?.find(
          (b: { token: { symbol: string } }) => b.token.symbol === "USDC" || b.token.symbol === "USDC-TESTNET"
        );
        if (!usdcBalance) {
          return `No USDC balance found in wallet. Use check_wallet_balance first.`;
        }
        const balanceAmount = parseFloat(usdcBalance.amount);
        if (balanceAmount < price) {
          return `Insufficient balance. Required: ${price} USDC, Available: ${usdcBalance.amount} ${usdcBalance.token.symbol}.`;
        }
        const pendingAction = {
          type: "purchase" as const,
          walletId,
          ebookId: ebookIdStr,
        };
        const payload = `${PENDING_ACTION_MARKER}${JSON.stringify(pendingAction)}${PENDING_ACTION_MARKER}\n\nPurchase of "${ebook.title}" for ${price} USDC prepared. Please confirm in the app to complete.`;
        return payload;
      } catch (error: any) {
        return `Error preparing purchase: ${error.message || "Unknown error"}`;
      }
    },
  });

  return [
    browseEbooksTool,
    searchEbooksTool,
    getEbookPriceTool,
    purchaseEbookUserTool,
  ];
}