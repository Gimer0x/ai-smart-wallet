/**
 * API Key Authentication Middleware
 * 
 * Secures API endpoints by requiring a valid API key in the request headers.
 * Set API_KEY_SECRET in your .env file to enable authentication.
 */

import { Request, Response, NextFunction } from "express";

const API_KEY_SECRET = process.env.API_KEY_SECRET;

/**
 * Middleware to validate API key from request headers
 * Expects API key in: X-API-Key header
 */
export function apiKeyAuth(req: Request, res: Response, next: NextFunction) {
  // If no API key secret is set, skip authentication (development mode)
  if (!API_KEY_SECRET) {
    console.warn("⚠️  API_KEY_SECRET not set - API authentication disabled");
    return next();
  }

  // Get API key from header
  const apiKey = req.headers["x-api-key"] || req.headers["authorization"]?.replace("Bearer ", "");

  if (!apiKey) {
    return res.status(401).json({
      success: false,
      error: "API key required. Provide it in X-API-Key header or Authorization: Bearer <key>",
    });
  }

  if (apiKey !== API_KEY_SECRET) {
    return res.status(403).json({
      success: false,
      error: "Invalid API key",
    });
  }

  next();
}

