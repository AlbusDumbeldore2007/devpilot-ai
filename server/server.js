import express from 'express';
import cors from 'cors';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';

import { env, getConfigStatus, logConfigurationHints } from './config/env.js';
import { connectDB, isDatabaseReady, watchDatabaseConnection } from './config/db.js';
import { requestLogger } from './middleware/logger.js';
import { notFoundHandler, errorHandler } from './middleware/errorHandler.js';
import { isAIConfigured } from './services/aiService.js';

import projectRoutes from './routes/projectRoutes.js';
import taskRoutes from './routes/taskRoutes.js';
import aiRoutes from './routes/aiRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();

/* ── Global middleware ─────────────────────────────────────────────── */
app.use(
  cors({
    origin: env.clientOrigins,
    credentials: true,
  })
);
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);

/* ── Health / configuration endpoint (works even in degraded mode) ── */
app.get('/api/health', (req, res) => {
  const config = getConfigStatus();
  res.status(200).json({
    success: true,
    status: 'ok',
    database: { configured: config.database, connected: isDatabaseReady() },
    ai: { configured: isAIConfigured(), model: config.model },
    environment: config.environment,
    uptimeSeconds: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

/* ── REST API routes ───────────────────────────────────────────────── */
app.use('/api/projects', projectRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/dashboard', dashboardRoutes);

/* ── Optional: serve the built React app in production ─────────────── */
const clientDist = path.resolve(__dirname, '../client/dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get(/^(?!\/api).*/, (req, res) => res.sendFile(path.join(clientDist, 'index.html')));
}

/* ── 404 + centralized error handling (must be last) ───────────────── */
app.use(notFoundHandler);
app.use(errorHandler);

/* ── Boot ──────────────────────────────────────────────────────────── */
const server = app.listen(env.port, () => {
  console.log('\x1b[35m╭──────────────────────────────────────────────╮\x1b[0m');
  console.log('\x1b[35m│\x1b[0m  \x1b[1mDevPilot AI API\x1b[0m is running                     \x1b[35m│\x1b[0m');
  console.log(`\x1b[35m│\x1b[0m  http://localhost:${String(env.port).padEnd(27)} \x1b[35m│\x1b[0m`);
  console.log('\x1b[35m╰──────────────────────────────────────────────╯\x1b[0m');
  logConfigurationHints();
});

// Connect asynchronously so the API and configuration errors are available
// immediately even when MongoDB is down.
connectDB().then((connected) => {
  if (!connected) watchDatabaseConnection();
});

/* ── Graceful shutdown ─────────────────────────────────────────────── */
const shutdown = async (signal) => {
  console.log(`\n[server] ${signal} received — shutting down gracefully...`);
  server.close(async () => {
    await mongoose.connection.close().catch(() => {});
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 5000).unref();
};

['SIGINT', 'SIGTERM'].forEach((signal) => process.on(signal, () => shutdown(signal)));

process.on('unhandledRejection', (reason) => {
  console.error('[server] Unhandled promise rejection:', reason);
});

export default app;
