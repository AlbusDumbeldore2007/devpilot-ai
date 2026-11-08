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

const asBoolean = (value, fallback = false) => {
  if (value === undefined || value === null || value === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
};

const asList = (value, fallback = '') =>
  String(value ?? fallback)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

const trimSlash = (value) => String(value || '').replace(/\/+$/, '');

const DEV_JWT_SECRET = 'devpilot-development-only-secret-change-me';

/**
 * Centralised, typed environment configuration.
 * Secrets stay on the server — only `VITE_*` variables are ever exposed
 * to the Vite client bundle.
 */
export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',
  port: asNumber(process.env.PORT, 5000),
  publicBaseUrl: trimSlash(process.env.PUBLIC_BASE_URL || `http://localhost:${asNumber(process.env.PORT, 5000)}`),

  mongoUri: process.env.MONGODB_URI || '',
  databaseUrl:
    process.env.DATABASE_URL ||
    'postgresql://postgres:postgres@127.0.0.1:5432/devpilot?schema=public',
  redisUrl: process.env.REDIS_URL || 'redis://127.0.0.1:6379',

  clientOrigins: asList(process.env.CLIENT_ORIGIN, 'http://localhost:5173'),

  auth: {
    jwtSecret: process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET || DEV_JWT_SECRET,
    usingDefaultSecret: !(process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET),
    accessTtl: process.env.JWT_ACCESS_TTL || '15m',
    refreshTtlDays: asNumber(process.env.JWT_REFRESH_TTL_DAYS, 7),
    cookieSecure: asBoolean(process.env.COOKIE_SECURE, process.env.NODE_ENV === 'production'),
    accessCookieName: 'devpilot_access',
    refreshCookieName: 'devpilot_refresh',
    bcryptRounds: asNumber(process.env.BCRYPT_ROUNDS, 10),
  },

  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    redirectUri:
      process.env.GOOGLE_REDIRECT_URI ||
      `${trimSlash(process.env.PUBLIC_BASE_URL || `http://localhost:${asNumber(process.env.PORT, 5000)}`)}/api/auth/google/callback`,
  },

  ai: {
    apiKey: process.env.AI_API_KEY || '',
    baseUrl: trimSlash(process.env.AI_BASE_URL || 'https://api.openai.com/v1'),
    model: process.env.AI_MODEL || 'gpt-4o-mini',
    timeoutMs: asNumber(process.env.AI_TIMEOUT_MS, 60000),
    agentMaxSteps: asNumber(process.env.AI_AGENT_MAX_STEPS, 6),
    pricing: {
      inputPerMillion: Number(process.env.AI_PRICE_INPUT_PER_M ?? 0.15),
      outputPerMillion: Number(process.env.AI_PRICE_OUTPUT_PER_M ?? 0.6),
    },
  },

  embeddings: {
    apiKey: process.env.EMBEDDING_API_KEY || process.env.AI_API_KEY || '',
    baseUrl: trimSlash(process.env.EMBEDDING_BASE_URL || process.env.AI_BASE_URL || 'https://api.openai.com/v1'),
    model: process.env.EMBEDDING_MODEL || 'text-embedding-3-small',
    dimensions: 1536,
    localFallback: asBoolean(process.env.EMBEDDING_LOCAL_FALLBACK, true),
  },

  uploads: {
    dir: process.env.UPLOAD_DIR || path.resolve(__dirname, '../uploads'),
    maxBytes: asNumber(process.env.MAX_UPLOAD_MB, 5) * 1024 * 1024,
    allowedExtensions: ['pdf', 'txt', 'md', 'markdown', 'docx'],
    chunkSize: asNumber(process.env.RAG_CHUNK_SIZE, 900),
    chunkOverlap: asNumber(process.env.RAG_CHUNK_OVERLAP, 120),
    topK: asNumber(process.env.RAG_TOP_K, 5),
  },

  security: {
    webOrigin: asList(process.env.CLIENT_ORIGIN, 'http://localhost:5173')[0],
    globalRateWindowMs: asNumber(process.env.RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
    globalRateMax: asNumber(process.env.RATE_LIMIT_MAX, 600),
    authRateMax: asNumber(process.env.AUTH_RATE_MAX, 20),
    aiRateMax: asNumber(process.env.AI_RATE_MAX, 60),
  },

  redis: {
    keyPrefix: process.env.REDIS_KEY_PREFIX || 'devpilot:',
    cacheTtlSeconds: asNumber(process.env.CACHE_TTL_SECONDS, 30),
  },

  integrations: {
    githubToken: process.env.GITHUB_TOKEN || '',
    githubApiBase: trimSlash(process.env.GITHUB_API_BASE || 'https://api.github.com'),
    razorpayKeyId: process.env.RAZORPAY_KEY_ID || '',
    razorpayKeySecret: process.env.RAZORPAY_KEY_SECRET || '',
    razorpayCurrency: process.env.RAZORPAY_CURRENCY || 'INR',
    razorpayMode: process.env.RAZORPAY_MODE || 'test',
  },

  features: {
    cronEnabled: asBoolean(process.env.CRON_ENABLED, true),
    ssrEnabled: asBoolean(process.env.SSR_ENABLED, true),
    socketsEnabled: asBoolean(process.env.SOCKETS_ENABLED, true),
  },
};

/** Safe, non-secret view of configuration state for /api/health. */
export const getConfigStatus = () => ({
  database: Boolean(env.databaseUrl),
  mongo: Boolean(env.mongoUri),
  redis: Boolean(env.redisUrl),
  ai: Boolean(env.ai.apiKey),
  googleOAuth: Boolean(env.google.clientId && env.google.clientSecret),
  github: Boolean(env.integrations.githubToken),
  razorpay: Boolean(env.integrations.razorpayKeyId && env.integrations.razorpayKeySecret),
  model: env.ai.model,
  environment: env.nodeEnv,
});

export function logConfigurationHints() {
  if (!env.databaseUrl) {
    console.error(
      '\x1b[31m[config]\x1b[0m DATABASE_URL is not set. Relational endpoints will return HTTP 503.'
    );
  }

  if (env.auth.usingDefaultSecret) {
    console.warn(
      '\x1b[33m[config]\x1b[0m JWT_ACCESS_SECRET is not set — using a development-only secret. Set a strong secret before deployment.'
    );
  }

  if (!env.mongoUri) {
    console.error(
      '\x1b[31m[config]\x1b[0m MONGODB_URI is not set. AI conversation/plan metadata will be unavailable.'
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

  if (!env.google.clientId) {
    console.warn('[config] Google OAuth is not configured (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET).');
  }
  if (!env.integrations.razorpayKeyId) {
    console.warn('[config] Razorpay test keys are not configured (RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET).');
  }
}
