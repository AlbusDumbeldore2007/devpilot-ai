import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load server/.env first, then fall back to a root-level .env if present.
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const asNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

/**
 * Centralised, typed environment configuration.
 * Secrets stay on the server — only `VITE_*` variables are ever exposed
 * to the Vite client bundle.
 */
export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',
  port: asNumber(process.env.PORT, 5000),

  mongoUri: process.env.MONGODB_URI || '',
  clientOrigins: (process.env.CLIENT_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),

  ai: {
    apiKey: process.env.AI_API_KEY || '',
    baseUrl: (process.env.AI_BASE_URL || 'https://api.openai.com/v1').replace(/\/+$/, ''),
    model: process.env.AI_MODEL || 'gpt-4o-mini',
    timeoutMs: asNumber(process.env.AI_TIMEOUT_MS, 60000),
  },
};

/** Safe, non-secret view of configuration state for /api/health. */
export const getConfigStatus = () => ({
  database: Boolean(env.mongoUri),
  ai: Boolean(env.ai.apiKey),
  model: env.ai.model,
  environment: env.nodeEnv,
});

export function logConfigurationHints() {
  if (!env.mongoUri) {
    console.error(
      '\x1b[31m[config]\x1b[0m MONGODB_URI is not set. Copy .env.example to server/.env and add your connection string.'
    );
    console.error(
      '\x1b[33m[config]\x1b[0m The API will start in degraded mode and return HTTP 503 until MongoDB is configured.'
    );
  }

  if (!env.ai.apiKey) {
    console.error(
      '\x1b[31m[config]\x1b[0m AI_API_KEY is not set. AI endpoints will return HTTP 503 with configuration instructions.'
    );
    console.error(
      '\x1b[33m[config]\x1b[0m Add AI_API_KEY, AI_BASE_URL and AI_MODEL to server/.env and restart the server.'
    );
  }
}
