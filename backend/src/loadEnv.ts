/**
 * Load .env from backend directory first, before any other module reads process.env.
 * Import this as the first local import in index.ts.
 */
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '..', '.env') });
