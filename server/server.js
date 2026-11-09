
import express from 'express';
import cors from 'cors';
import fs from 'node:fs';
import path from 'node:path';
import mongoose from 'mongoose';
import { fileURLToPath } from 'node:url';
import rateLimit from 'express-rate-limit';

import {
  env,
  getConfigStatus,
  logConfigurationHints,
} from './config/env.js';

import {
  connectDB,
  isDatabaseReady,
  watchDatabaseConnection,
} from './config/db.js';

import {
  connectPostgres,
  isPostgresReady,
  disconnectPostgres,
} from './config/prisma.js';

import { requestLogger } from './middleware/logger.js';
import {
  notFoundHandler,
  errorHandler,
} from './middleware/errorHandler.js';

import {
  requireDatabase,
  requirePostgres,
} from './middleware/validate.js';

import { isAIConfigured } from './services/aiService.js';
import { isRedisReady } from './services/cacheService.js';
import { initSocketIO } from './socket.js';

import './cronJobs.js';

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

// Correct rate limiter configuration.
const globalLimiter = rateLimit({
  windowMs: env.security.globalRateWindowMs,
  max: env.security.globalRateMax,
  message: {
    success: false,
    message: 'Too many requests. Please slow down.',
    code: 'RATE_LIMITED',
  },
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

/* ── Health endpoint ───────────────────────────────────────────────── */

app.get('/api/health', (req, res) => {
  const config = getConfigStatus();

  const pgReady = isPostgresReady();
  const mongoReady = isDatabaseReady();
  const redisReady = isRedisReady();
  const aiReady = isAIConfigured();

  res.status(200).json({
    success: true,
    status: 'ok',

    database: {
      configured: Boolean(env.databaseUrl),
      connected: pgReady,
      redis: redisReady,
    },

    mongo: {
      configured: Boolean(env.mongoUri),
      connected: mongoReady,
    },

    ai: {
      configured: aiReady,
      model: env.ai.model,
    },

    environment: config.environment,
    uptimeSeconds: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

/* ── Root API endpoint ─────────────────────────────────────────────── */

app.get('/api', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Welcome to DevPilot AI API',
    version: '1.0.0',
    health: '/api/health',
  });
});

/* ── Production frontend serving ───────────────────────────────────── */

const clientDist = path.resolve(__dirname, '../client/dist');

if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));

  app.get(/^(?!\/api).*/, (req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

/* ── 404 and centralized error handling ────────────────────────────── */

app.use(notFoundHandler);
app.use(errorHandler);

/* ── Server startup ────────────────────────────────────────────────── */

let server;
let socketServer;

const startServer = async () => {
  console.log('[server] Initializing database connections...');

  // Start database connections without preventing the API
  // from starting if an optional database is unavailable.
  const databaseResults = await Promise.allSettled([
    connectDB(),
    connectPostgres(),
  ]);

  databaseResults.forEach((result, index) => {
    const databaseName = index === 0 ? 'MongoDB' : 'PostgreSQL';

    if (result.status === 'fulfilled') {
      console.log(`[database] ${databaseName} initialization completed.`);
    } else {
      console.error(
        `[database] ${databaseName} connection failed:`,
        result.reason?.message || result.reason
      );
    }
  });

  // Watch MongoDB connection state.
  watchDatabaseConnection();

  server = app.listen(env.port, () => {
    console.log('');
    console.log('╭──────────────────────────────────────────────╮');
    console.log('│          DevPilot AI API is running          │');
    console.log(`│          http://localhost:${env.port}             │`);
    console.log('╰──────────────────────────────────────────────╯');
    console.log('');

    logConfigurationHints();
  });

  // Initialize Socket.IO.
  socketServer = initSocketIO(server);
};

/* ── Graceful shutdown ─────────────────────────────────────────────── */

let isShuttingDown = false;

const shutdown = async (signal) => {
  if (isShuttingDown) return;

  isShuttingDown = true;

  console.log(
    `\n[server] ${signal} received — shutting down gracefully...`
  );

  const forceExit = setTimeout(() => {
    console.error('[server] Forced shutdown after timeout.');
    process.exit(1);
  }, 5000);

  forceExit.unref();

  try {
    if (socketServer) {
      await new Promise((resolve) => {
        socketServer.close(resolve);
      });
    }

    if (server) {
      await new Promise((resolve) => {
        server.close(resolve);
      });
    }

    await mongoose.connection.close().catch(() => {});
    await disconnectPostgres().catch(() => {});

    clearTimeout(forceExit);

    console.log('[server] Shutdown completed.');

    process.exit(0);
  } catch (error) {
    console.error('[server] Shutdown error:', error);
    process.exit(1);
  }
};

['SIGINT', 'SIGTERM'].forEach((signal) => {
  process.on(signal, () => shutdown(signal));
});

/* ── Unhandled errors ───────────────────────────────────────────────── */

process.on('unhandledRejection', (reason) => {
  console.error('[server] Unhandled promise rejection:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('[server] Uncaught exception:', error);
  shutdown('uncaughtException');
});

/* ── Start application ─────────────────────────────────────────────── */

startServer().catch((error) => {
  console.error('[server] Failed to start:', error);
  process.exit(1);
});

export default app;

