import express from 'express';
import path from 'path';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import { config } from './config';
import { authMiddleware } from './auth';
import { prisma } from './db';
import apiRoutes from './routes/api';
import webhookRoutes from './routes/webhook';

const app = express();

// Middleware
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(cookieParser());

// Auth middleware (only protects /api/* routes)
app.use(authMiddleware);

// API routes
app.use('/api', apiRoutes);

// Webhook routes (public, not behind auth)
app.use('/webhook', webhookRoutes);

// Serve frontend in production
const frontendPath = path.join(__dirname, '..', 'frontend', 'dist');
app.use(express.static(frontendPath));

// SPA fallback — serve index.html for all non-API routes
app.get('*', (_req, res) => {
  res.sendFile(path.join(frontendPath, 'index.html'));
});

// Start server
async function main() {
  // Ensure database is reachable
  await prisma.$connect();
  console.log('[DB] Conectado ao SQLite');

  app.listen(config.port, () => {
    console.log(`[Server] LeadFlowz rodando em http://localhost:${config.port}`);
    console.log(`[Server] Webhook URL: ${config.webhookBaseUrl}/webhook/evolution`);
  });
}

main().catch((err) => {
  console.error('[Server] Falha ao iniciar:', err);
  process.exit(1);
});
