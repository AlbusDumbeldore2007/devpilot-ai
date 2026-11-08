import { PrismaClient } from '@prisma/client';
import { env } from './env.js';

/**
 * A single PrismaClient per process. In development nodemon may reload the
 * module; reusing globalThis prevents connection-pool leaks.
 */
const globalForPrisma = globalThis;

export const prisma =
  globalForPrisma.__devpilotPrisma ||
  new PrismaClient({
    datasourceUrl: env.databaseUrl,
    log: env.nodeEnv === 'development' ? ['warn', 'error'] : ['error'],
  });

if (env.nodeEnv !== 'production') globalForPrisma.__devpilotPrisma = prisma;

let postgresReady = false;
let lastError = null;

/**
 * Connect with bounded retries. The HTTP server is allowed to boot before
 * PostgreSQL is reachable; relational routes return 503 until it is.
 */
export async function connectPostgres({ retries = 20, delayMs = 750, silent = false } = {}) {
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      await prisma.$queryRaw`SELECT 1`;
      postgresReady = true;
      lastError = null;
      if (!silent) {
        const version = await prisma.$queryRaw`SHOW server_version`.catch(() => []);
        const label = version?.[0]?.server_version || 'PostgreSQL';
        console.log(`\x1b[32m[db]\x1b[0m PostgreSQL connected (${label}) via Prisma`);
      }
      await ensureVectorSchema();
      return true;
    } catch (error) {
      lastError = error;
      postgresReady = false;
      if (attempt === retries) {
        if (!silent) {
          console.error(`\x1b[31m[db]\x1b[0m PostgreSQL connection failed: ${error.message}`);
          console.error('[db] Run `npm run dev:services` (PGlite) or start PostgreSQL with pgvector, then retry.');
        }
        return false;
      }
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  return false;
}

/** pgvector must exist before Prisma pushes the DocumentChunk table. */
export async function ensureVectorSchema() {
  try {
    await prisma.$executeRawUnsafe('CREATE EXTENSION IF NOT EXISTS vector');
    // HNSW is optional: older pgvector builds may not support it. The
    // similarity query still works without the index (exact scan).
    await prisma
      .$executeRawUnsafe(
        'CREATE INDEX IF NOT EXISTS "DocumentChunk_embedding_hnsw" ON "DocumentChunk" USING hnsw (embedding vector_cosine_ops)'
      )
      .catch(() => {});
    return true;
  } catch (error) {
    console.warn(`[db] pgvector setup warning: ${error.message}`);
    return false;
  }
}

export const isPostgresReady = () => postgresReady;

export async function pingPostgres() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    postgresReady = true;
    return true;
  } catch (error) {
    lastError = error;
    postgresReady = false;
    return false;
  }
}

export const getPostgresError = () => lastError?.message || null;

export async function disconnectPostgres() {
  await prisma.$disconnect().catch(() => {});
  postgresReady = false;
}
