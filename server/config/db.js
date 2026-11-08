import mongoose from 'mongoose';
import { env } from './env.js';

/**
 * Connect to MongoDB with Mongoose.
 * Returns `true` on success and `false` on failure — the HTTP server is allowed
 * to boot anyway so that the UI can surface a helpful configuration error.
 */
export async function connectDB({ silent = false } = {}) {
  if (!env.mongoUri) {
    if (!silent) {
      console.error('[db] Cannot connect: MONGODB_URI is missing.');
    }
    return false;
  }

  try {
    mongoose.set('strictQuery', true);
    const connection = await mongoose.connect(env.mongoUri, {
      serverSelectionTimeoutMS: 8000,
    });

    if (!silent) {
      console.log(
        `\x1b[32m[db]\x1b[0m MongoDB connected → ${connection.connection.host}/${connection.connection.name}`
      );
    }
    return true;
  } catch (error) {
    if (!silent) {
      console.error(`\x1b[31m[db]\x1b[0m MongoDB connection failed: ${error.message}`);
      console.error(
        '[db] Start MongoDB locally or set a MongoDB Atlas MONGODB_URI in server/.env.'
      );
    }
    return false;
  }
}

/** True only when Mongoose has an active, usable connection. */
export const isDatabaseReady = () => mongoose.connection.readyState === 1;

/** Retry in the background without flooding the logs. */
export function watchDatabaseConnection({ intervalMs = 15000 } = {}) {
  if (!env.mongoUri) return null;

  let reported = false;
  const timer = setInterval(async () => {
    if (isDatabaseReady()) return;
    const connected = await connectDB({ silent: reported });
    if (connected) {
      console.log('\x1b[32m[db]\x1b[0m MongoDB connection restored.');
      clearInterval(timer);
    } else if (!reported) {
      console.log('[db] Still waiting for MongoDB — retrying every 15 seconds.');
      reported = true;
    }
  }, intervalMs);

  timer.unref?.();
  return timer;
}
