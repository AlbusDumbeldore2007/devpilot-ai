import Redis from 'ioredis';
import { env } from '../config/env.js';

let client = null;
let ready = false;
let lastError = null;

const log = (message) => console.log(`\x1b[36m[redis]\x1b[0m ${message}`);

export function getRedis() {
  if (client) return client;

  client = new Redis(env.redisUrl, {
    keyPrefix: env.redis.keyPrefix,
    lazyConnect: true,
    maxRetriesPerRequest: 1,
    enableOfflineQueue: false,
    retryStrategy: (times) => (times > 3 ? null : Math.min(times * 250, 1000)),
  });

  client.on('ready', () => {
    ready = true;
    lastError = null;
  });
  client.on('end', () => {
    ready = false;
  });
  client.on('error', (error) => {
    ready = false;
    lastError = error.message;
  });

  return client;
}

export async function connectRedis() {
  try {
    const redis = getRedis();
    if (redis.status !== 'ready') await redis.connect().catch(() => {});
    await redis.ping();
    ready = true;
    log(`Redis connected → ${env.redisUrl.replace(/\/\/.*@/, '//***@')}`);
    return true;
  } catch (error) {
    ready = false;
    lastError = error.message;
    console.warn(`[redis] Unavailable (${error.message}). Caching and Redis counters are disabled.`);
    return false;
  }
}

export const isRedisReady = () => ready;
export const getRedisError = () => lastError;

export async function cacheGet(key) {
  if (!ready) return null;
  try {
    const value = await getRedis().get(key);
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}

export async function cacheSet(key, value, ttlSeconds = env.redis.cacheTtlSeconds) {
  if (!ready) return false;
  try {
    await getRedis().set(key, JSON.stringify(value), 'EX', Math.max(1, ttlSeconds));
    return true;
  } catch {
    return false;
  }
}

export async function cacheDel(...keys) {
  if (!ready || keys.length === 0) return false;
  try {
    await getRedis().del(...keys);
    return true;
  } catch {
    return false;
  }
}

export async function cacheDelByPrefix(prefix) {
  if (!ready) return false;
  try {
    const redis = getRedis();
    const fullPrefix = `${env.redis.keyPrefix}${prefix}`;
    const keys = await redis.keys(`${fullPrefix}*`);
    if (keys.length === 0) return true;
    // ioredis keyPrefix is applied again on del, so strip it first.
    await redis.del(...keys.map((key) => key.slice(env.redis.keyPrefix.length)));
    return true;
  } catch {
    return false;
  }
}

/** Atomic counter with TTL, used as a Redis-backed AI rate limiter. */
export async function incrementCounter(key, ttlSeconds) {
  if (!ready) return null;
  try {
    const redis = getRedis();
    const count = await redis.incr(key);
    if (count === 1) await redis.expire(key, ttlSeconds);
    return count;
  } catch {
    return null;
  }
}

export async function disconnectRedis() {
  if (client) {
    await client.quit().catch(() => {});
    client = null;
  }
  ready = false;
}
