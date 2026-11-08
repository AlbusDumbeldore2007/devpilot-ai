import { prisma } from '../config/prisma.js';
import { ApiError } from '../utils/ApiError.js';
import { verifyAccessToken } from '../services/authService.js';
import { readAccessToken } from '../utils/cookies.js';

function extractPayload(req) {
  const token = readAccessToken(req);
  if (!token) return null;
  return verifyAccessToken(token);
}

/** Require a valid access token; loads the current user from PostgreSQL. */
export async function requireAuth(req, res, next) {
  try {
    const payload = extractPayload(req);
    if (!payload) throw new ApiError(401, 'Authentication required.', undefined, 'AUTH_REQUIRED');

    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) throw new ApiError(401, 'The account for this session no longer exists.', undefined, 'USER_NOT_FOUND');

    req.user = user;
    req.auth = payload;
    return next();
  } catch (error) {
    return next(error);
  }
}

/** Attach req.user when a token is present, but never reject anonymous callers. */
export async function optionalAuth(req, res, next) {
  try {
    const payload = extractPayload(req);
    if (payload) {
      const user = await prisma.user.findUnique({ where: { id: payload.sub } });
      if (user) {
        req.user = user;
        req.auth = payload;
      }
    }
    return next();
  } catch {
    // An invalid/expired token is treated as anonymous for optional routes.
    return next();
  }
}

/** Role-based access control middleware factory. */
export function authorize(...roles) {
  const allowed = roles.flat();
  return (req, res, next) => {
    if (!req.user) {
      return next(new ApiError(401, 'Authentication required.', undefined, 'AUTH_REQUIRED'));
    }
    if (!allowed.includes(req.user.role)) {
      return next(
        new ApiError(
          403,
          `Your role (${req.user.role}) is not allowed to perform this action. Required: ${allowed.join(', ')}.`,
          undefined,
          'FORBIDDEN_ROLE'
        )
      );
    }
    return next();
  };
}
