#!/usr/bin/env node
/**
 * Local development infrastructure for DevPilot AI.
 *
 * Starts:
 *   • PGlite (PostgreSQL 18 + pgvector) exposed over the PostgreSQL wire
 *     protocol on 127.0.0.1:5432
 *   • Redis (via redis-memory-server) on 127.0.0.1:6379
 *
 * Then applies the Prisma schema (`prisma db push`) and keeps running.
 *
 * Production deployments use real PostgreSQL/Redis containers instead —
 * see docker-compose.yml. This script is only a zero-install local substitute.
 */
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { PGlite } from '@electric-sql/pglite';
import { createServer } from 'pglite-server';
import { RedisMemoryServer } from 'redis-memory-server';
import { vector } from '@electric-sql/pglite-pgvector';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serverDir = path.resolve(__dirname, '..');
const dataDir = process.env.PGLITE_DIR || path.resolve(serverDir, '.pglite');
const pgPort = Number(process.env.PGLITE_PORT || 5432);
const redisPort = Number(process.env.REDIS_PORT || 6379);

const isPortOpen = (port, host = '127.0.0.1') =>
  new Promise((resolve) => {
    const socket = net.connect({ port, host });
    const done = (open) => {
      socket.destroy();
      resolve(open);
    };
    socket.once('connect', () => done(true));
    socket.once('error', () => done(false));
    socket.setTimeout(500, () => done(false));
  });

const log = (message) => console.log(`\x1b[36m[services]\x1b[0m ${message}`);

let redisServer = null;

async function main() {
  if (await isPortOpen(pgPort)) {
    log(`Port ${pgPort} already has a PostgreSQL server — reusing it.`);
  } else {
    log(`Starting PGlite (PostgreSQL + pgvector) on 127.0.0.1:${pgPort} …`);
    const db = new PGlite(dataDir, {
  	extensions: {
    		vector,
  	},
      });

    await db.waitReady;
    await db.exec('CREATE EXTENSION IF NOT EXISTS vector;');
    const pgServer = createServer(db);
    await new Promise((resolve, reject) => {
      pgServer.once('error', reject);
      pgServer.listen(pgPort, '127.0.0.1', resolve);
    });
    log(`PostgreSQL wire protocol listening on 127.0.0.1:${pgPort} (data: ${dataDir})`);
  }

  if (await isPortOpen(redisPort)) {
    log(`Port ${redisPort} already has Redis — reusing it.`);
  } else {
    log(`Starting Redis on 127.0.0.1:${redisPort} …`);
    redisServer = new RedisMemoryServer({ instance: { port: redisPort, ip: '127.0.0.1' } });
    await redisServer.getHost();
    log(`Redis listening on 127.0.0.1:${redisPort}`);
  }

  const databaseUrl =
    process.env.DATABASE_URL ||
    `postgresql://postgres:postgres@127.0.0.1:${pgPort}/devpilot?schema=public`;

  log('Applying Prisma schema (db push) …');
  const result = spawnSync('npx', ['prisma', 'db', 'push', '--skip-generate'], {
    cwd: serverDir,
    env: { ...process.env, DATABASE_URL: databaseUrl },
    stdio: 'inherit',
  });

  if (result.status !== 0) {
    console.error('\x1b[31m[services]\x1b[0m Prisma db push failed. Fix the schema/connection and retry.');
    process.exitCode = 1;
    return;
  }

  log('Infrastructure ready. DATABASE_URL and REDIS_URL are available.');
  log('Press Ctrl+C to stop.');
}

const shutdown = async () => {
  log('Shutting down local infrastructure …');
  if (redisServer) await redisServer.stop().catch(() => {});
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

main().catch(async (error) => {
  console.error('[services] Failed:', error);
  if (redisServer) await redisServer.stop().catch(() => {});
  process.exit(1);
});
