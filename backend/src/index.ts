import './loadEnv';
import express, { Request, Response } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import walletRoutes from './routes/wallet.routes';
import chatRoutes from './routes/chat.routes';
import circleUserRoutes from './routes/circle-user.routes';
import authRoutes from './routes/auth.routes';
import { sessionMiddleware } from './middleware/session';
import { requireAuth, requireCircleUser } from './middleware/requireAuth';

const app = express();
const PORT = process.env.PORT || 3001;

// CORS: allow frontend origin and credentials (session cookies)
app.use(cors({
  origin: process.env.FRONTEND_ORIGIN || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(sessionMiddleware);

// Routes (no auth)
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

app.get('/api/hello', (req: Request, res: Response) => {
  res.json({ message: 'Hello from backend!' });
});

// Auth routes (login, logout, me)
app.use('/api/auth', authRoutes);

// Circle user-controlled wallet proxy (device-token public; rest require auth/circle user)
app.use('/api/circle', circleUserRoutes);

// Protected routes: wallets require Circle user (so we can list only their wallets)
app.use('/api/wallets', requireCircleUser, walletRoutes);
app.use('/api/chat', requireAuth, chatRoutes);

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
  console.log(`🔐 Auth API (Google, logout, me) at http://localhost:${PORT}/api/auth`);
  console.log(`🔄 Circle user proxy at http://localhost:${PORT}/api/circle`);
  console.log(`📡 Wallet API at http://localhost:${PORT}/api/wallets`);
  console.log(`💬 Chat API at http://localhost:${PORT}/api/chat`);
  
  if (!process.env.CIRCLE_API_KEY) {
    console.warn('⚠️  CIRCLE_API_KEY is not set. Set it in backend/.env to enable wallet creation.');
  } else {
    console.log('✅ CIRCLE_API_KEY is set');
  }
});