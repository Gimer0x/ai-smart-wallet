import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({
      include: ['buffer', 'stream', 'crypto', 'util'],
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
    }),
  ],
  server: {
    port: 3000,
    // Allow Google OAuth / GSI iframe to postMessage back (avoids "COOP would block" and GSI_LOGGER errors)
    headers: {
      'Cross-Origin-Opener-Policy': 'unsafe-none',
      'Cross-Origin-Embedder-Policy': 'unsafe-none',
    },
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
});

