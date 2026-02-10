import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import walletRoutes from './routes/wallet.routes';
import chatRoutes from './routes/chat.routes';
import marketplaceRoutes from './routes/marketplace.routes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

app.get('/api/hello', (req: Request, res: Response) => {
  res.json({ message: 'Hello from backend!' });
});

// Wallet routes
app.use('/api/wallets', walletRoutes);

// Chat routes
app.use('/api/chat', chatRoutes);

// Marketplace routes
app.use('/api/marketplace', marketplaceRoutes);

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
  console.log(`📡 Wallet API available at http://localhost:${PORT}/api/wallets`);
  console.log(`💬 Chat API available at http://localhost:${PORT}/api/chat`);
  console.log(`🛒 Marketplace API available at http://localhost:${PORT}/api/marketplace`);
});