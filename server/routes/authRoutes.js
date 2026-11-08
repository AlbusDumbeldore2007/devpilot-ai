import { Router } from 'express';
import {
  registerUser,
  authenticateUser,
  findOrCreateGoogleUser,
  createSession,
  rotateRefreshToken,
  revokeRefreshToken,
  revokeAllUserTokens,
  authenticateJWT,
} from '../services/authService.js';
import { validateRegister, validateLogin } from '../utils/schemas.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { serializeUser } from '../utils/domain.js';
import { ApiError } from '../utils/ApiError.js';

const router = Router();

router.post('/auth/register', validateRegister, asyncHandler(registerUser));
router.post('/auth/login', validateLogin, asyncHandler(authenticateUser));
router.get('/auth/me', asyncHandler(async (req, res) => {
  const userId = req.auth?.sub;
  if (!userId) return res.json({ success: true, data: null });
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (user) {
    res.json({ success: true, data: { user: serializeUser(user) } });
  } else {
    res.json({ success: true, data: null });
  }
}));
router.post('/auth/refresh', asyncHandler(async (req, res, next) => {
  try {
    const session = await rotateRefreshToken(req.body.refreshToken || null);
    res.status(200).json({
      success: true,
      data: {
        user: serializeUser(session.user),
        accessToken: session.accessToken,
        refreshToken: session.refreshToken,
        accessMaxAgeMs: session.accessMaxAgeMs,
        refreshMaxAgeMs: session.refreshMaxAgeMs,
      },
    });
  } catch (error) {
    next(error);
  }
}));
router.post('/auth/revoke-all', asyncHandler(async (req, res) => {
  await revokeAllUserTokens(req.user.id);
  res.json({ success: true, message: 'All sessions revoked.' });
}));

/** Google OAuth: initiate sign-in flow. */
router.get('/auth/google', asyncHandler(async (req, res, next) => {
  const profile = req.query.profile ? JSON.parse(req.query.profile) : null;
  if (!profile) return next(new ApiError(400, 'Google profile required.', undefined, 'MISSING_PROFILE'));
  const user = await findOrCreateGoogleUser(profile);
  const session = await createSession(user);
  res.status(200).json({
    success: true,
    data: {
      user: serializeUser(session.user),
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
      accessMaxAgeMs: session.accessMaxAgeMs,
      refreshMaxAgeMs: session.refreshMaxAgeMs,
    },
  });
}));

/** Protected: verify JWT token status and attach user to req.user. */
router.get('/auth/verify', authenticateJWT, asyncHandler(async (req, res) => {
  res.json({
    success: true,
    data: {
      user: {
        id: req.user.id,
        email: req.user.email,
        name: req.user.name,
        role: req.user.role,
      },
    },
  });
}));

export default router;