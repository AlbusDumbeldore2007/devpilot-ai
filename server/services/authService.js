import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/prisma.js';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';

/** Converts a JWT TTL such as "15m" / "2h" / "3600" into milliseconds. */
function ttlToMs(ttl) {
  if (typeof ttl === 'number') return ttl * 1000;
  const match = String(ttl).trim().match(/^(\d+)\s*([smhd])?$/i);
  if (!match) return 15 * 60 * 1000;
  const amount = Number(match[1]);
  const unit = (match[2] || 's').toLowerCase();
  return amount * { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 }[unit];
}

const ACCESS_TTL_MS = ttlToMs(env.auth.accessTtl);

export const hashPassword = (password) => bcrypt.hash(password, env.auth.bcryptRounds);

export const verifyPassword = (password, hash) => bcrypt.compare(password, hash);

export function signAccessToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email, name: user.name, role: user.role, type: 'access' },
    env.auth.jwtSecret,
    { expiresIn: env.auth.accessTtl, issuer: 'devpilot-ai', audience: 'devpilot-web' }
  );
}

export function verifyAccessToken(token) {
  try {
    const payload = jwt.verify(token, env.auth.jwtSecret, {
      issuer: 'devpilot-ai',
      audience: 'devpilot-web',
    });
    if (payload.type !== 'access') throw new Error('Wrong token type');
    return payload;
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new ApiError(401, 'Your session has expired. Please sign in again.', undefined, 'TOKEN_EXPIRED');
    }
    throw new ApiError(401, 'Invalid authentication token.', undefined, 'INVALID_TOKEN');
  }
}

const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

function refreshExpiry() {
  return new Date(Date.now() + env.auth.refreshTtlDays * 24 * 60 * 60 * 1000);
}

async function issueRefreshToken(userId, tx = prisma) {
  const raw = crypto.randomBytes(48).toString('base64url');
  const record = await tx.refreshToken.create({
    data: { userId, tokenHash: hashToken(raw), expiresAt: refreshExpiry() },
  });
  return { raw, record };
}

export async function createSession(user) {
  const refresh = await issueRefreshToken(user.id);
  return {
    user,
    accessToken: signAccessToken(user),
    refreshToken: refresh.raw,
    accessMaxAgeMs: ACCESS_TTL_MS,
    refreshMaxAgeMs: env.auth.refreshTtlDays * 24 * 60 * 60 * 1000,
  };
}

/**
 * Middleware: authenticate JWT for regular HTTP routes.
 * Attaches `req.user` from the Authorization: Bearer header.
 */
export const authenticateJWT = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return next(
        new ApiError(401, 'Authentication token is missing.', undefined, 'MISSING_TOKEN')
      );
    }

    const payload = verifyAccessToken(token);
    req.user = {
      id: payload.sub,
      email: payload.email,
      name: payload.name,
      role: payload.role,
    };
    next();
  } catch (error) {
    if (error instanceof ApiError) return next(error);
    next(new ApiError(401, 'Invalid authentication token.', undefined, 'INVALID_TOKEN'));
  }
};

/**
 * Refresh-token rotation. A replayed (already-revoked) token revokes every
 * active session for that user, limiting the blast radius of token theft.
 */
export async function rotateRefreshToken(rawToken) {
  if (!rawToken || typeof rawToken !== 'string') {
    throw new ApiError(401, 'Missing refresh token.', undefined, 'REFRESH_TOKEN_MISSING');
  }

  const tokenHash = hashToken(rawToken);
  const stored = await prisma.refreshToken.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  if (!stored) {
    throw new ApiError(401, 'Refresh token is not recognised.', undefined, 'REFRESH_TOKEN_INVALID');
  }

  if (stored.revokedAt) {
    await prisma.refreshToken.updateMany({
      where: { userId: stored.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    throw new ApiError(401, 'Refresh token reuse detected. All sessions were revoked.', undefined, 'REFRESH_TOKEN_REUSED');
  }

  if (stored.expiresAt < new Date()) {
    throw new ApiError(401, 'Refresh token has expired. Please sign in again.', undefined, 'REFRESH_TOKEN_EXPIRED');
  }

  return prisma.$transaction(async (tx) => {
    await tx.refreshToken.update({ where: { id: stored.id }, data: { revokedAt: new Date() } });
    const issued = await issueRefreshToken(stored.userId, tx);
    return {
      user: stored.user,
      accessToken: signAccessToken(stored.user),
      refreshToken: issued.raw,
      accessMaxAgeMs: ACCESS_TTL_MS,
      refreshMaxAgeMs: env.auth.refreshTtlDays * 24 * 60 * 60 * 1000,
    };
  });
}

export async function revokeRefreshToken(rawToken) {
  if (!rawToken) return;
  await prisma.refreshToken
    .updateMany({ where: { tokenHash: hashToken(rawToken), revokedAt: null }, data: { revokedAt: new Date() } })
    .catch(() => {});
}

export async function revokeAllUserTokens(userId) {
  await prisma.refreshToken.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } });
}

export async function registerUser({ name, email, password, role = 'DEVELOPER', googleId = null, avatarUrl = null }) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw ApiError.conflict('An account with that email already exists.');

  const passwordHash = googleId ? await hashPassword(crypto.randomBytes(24).toString('hex')) : await hashPassword(password);

  return prisma.user.create({
    data: { name, email, passwordHash, role, googleId, avatarUrl },
  });
}

export async function authenticateUser({ email, password }) {
  const user = await prisma.user.findUnique({ where: { email } });
  // Always run a comparison to reduce user-enumeration timing differences.
  const dummyHash = '$2b$10$L1gIpFPzFh6zuXkE6z0WNeCsq8q1AJ7z08Hcr1GNZ8XuaiNMTweMm';
  const valid = await verifyPassword(password, user ? user.passwordHash : dummyHash);
  if (!user || !valid) {
    throw new ApiError(401, 'Invalid email or password.', undefined, 'INVALID_CREDENTIALS');
  }
  return user;
}

export async function findOrCreateGoogleUser(profile) {
  const email = profile.email?.toLowerCase();
  if (!email) throw ApiError.badRequest('Google did not return an email address.');

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    if (!existing.googleId) {
      return prisma.user.update({ where: { id: existing.id }, data: { googleId: profile.sub, avatarUrl: profile.picture } });
    }
    return existing;
  }

  const passwordHash = await hashPassword(crypto.randomBytes(32).toString('hex'));
  return prisma.user.create({
    data: {
      email,
      name: profile.name || email.split('@')[0],
      passwordHash,
      googleId: profile.sub,
      avatarUrl: profile.picture || null,
      role: 'DEVELOPER',
    },
  });
}
