import express from 'express';
import cors from 'cors';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import rateLimit from 'express-rate-limit';

import { env, getConfigStatus, logConfigurationHints } from './config/env.js';
import { connectDB, isDatabaseReady, watchDatabaseConnection } from './config/db.js';
import { connectPostgres, isPostgresReady, pingPostgres, disconnectPostgres } from './config/prisma.js';
import { requestLogger } from './middleware/logger.js';
import { notFoundHandler, errorHandler } from './middleware/errorHandler.js';
import { requireDatabase } from './middleware/validate.js';
import { requireMongo } from './middleware/validate.js';
import { requirePostgres } from './middleware/validate.js';
import { isAIConfigured } from './services/aiService.js';
import { incrementCounter, isRedisReady } from './services/cacheService.js';
import { initSocketIO } from './socket.js';
import './cronJobs.js'; // Scheduled jobs (node-cron)

import projectRoutes from './routes/projectRoutes.js';
import taskRoutes from './routes/taskRoutes.js';
import aiRoutes from './routes/aiRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import uploadRoutes from './routes/uploadRoutes.js';
import sqlRoutes from './routes/sqlRoutes.js';
import authRoutes from './routes/authRoutes.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();

/* ── Global middleware ─────────────────────────────────────────────── */
app.use(
  cors({
    origin: env.clientOrigins,
    credentials: true,
  })
);

// Rate limiting: per-IP window-based limit from env config.
const globalLimiter = rateLimit({
  windowMs: env.security.rateLimitWindowMs,
  max: env.security.rateLimitMax,
  message: { success: false, message: 'Too many requests. Please slow down.', code: 'RATE_LIMITED' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(globalLimiter);

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);

/* ── REST API routes ───────────────────────────────────────────────── */
app.use('/api/auth', authRoutes);
app.use('/api/projects', requireDatabase, projectRoutes);
app.use('/api/tasks', requireDatabase, taskRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/upload', requirePostgres, uploadRoutes);
app.use('/api/dashboard', requireDatabase, dashboardRoutes);
app.use('/api/sql', requirePostgres, sqlRoutes);

/* ── Health / configuration endpoint (works even in degraded mode) ── */
app.get('/api/health', (req, res) => {
  const config = getConfigStatus();
  const pgReady = isPostgresReady();
  const redisReady = isRedisReady();
  const mongoReady = isDatabaseReady();
  const aiReady = isAIConfigured();

  res.status(200).json({
    success: true,
    status: 'ok',
    database: {
      configured: Boolean(env.databaseUrl),
      connected: pgReady,
      redis: redisReady,
    },
    mongo: { configured: Boolean(env.mongoUri), connected: mongoReady },
    ai: { configured: aiReady, model: env.ai.model },
    environment: config.environment,
    uptimeSeconds: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

/* ── Socket.IO real-time integration ──────────────────────────────── */
const server = app.listen(env.port, () => {
  console.log('\x1b[35m╭──────────────────────────────────────────────╮\x1b[0m');
  console.log('\x1b[35m│\x1b[0m  \x1b[1mDevPilot AI API\x1b[0m is running                     \x1b[35m│\x1b[0m');
  console.log(`\x1b[35m│\x1b[0m  http://localhost:${String(env.port).padEnd(27)} \x1b[35m│\x1b[0m`);
  console.log('\x1b[35m╰──────────────────────────────────────────────╯\x1b[0m');
  logConfigurationHints();
});

// Initialise Socket.IO after the HTTP server is listening.
const socketServer = initSocketIO(server);

/* ── Optional: serve the built React app in production ─────────────── */
const clientDist = path.resolve(__dirname, '../client/dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get(/^(?!\/api).*/, (req, res) => res.sendFile(path.join(clientDist, 'index.html')));
}

/* ── 404 + centralized error handling (must be last) ───────────────── */
app.use(notFoundHandler);
app.use(errorHandler);

/* ── Graceful shutdown ─────────────────────────────────────────────── */
const shutdown = async (signal) => {
  console.log(`\n[server] ${signal} received — shutting down gracefully...`);
  socketServer.close(async () => {
    await mongoose.connection.close().catch(() => {});
    await disconnectPostgres().catch(() => {});
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 5000).unref();
};

['SIGINT', 'SIGTERM'].forEach((signal) => process.on(signal, () => shutdown(signal)));

process.on('unhandledRejection', (reason) => {
  console.error('[server] Unhandled promise rejection:', reason);
});

export default app;