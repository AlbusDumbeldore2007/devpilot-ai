import { env } from '../config/env.js';

const baseCookie = () => ({
  httpOnly: true,
  sameSite: 'lax',
  secure: env.auth.cookieSecure,
});

export function setAuthCookies(res, session) {
  res.cookie(env.auth.accessCookieName, session.accessToken, {
    ...baseCookie(),
    maxAge: session.accessMaxAgeMs,
    path: '/',
  });
  res.cookie(env.auth.refreshCookieName, session.refreshToken, {
    ...baseCookie(),
    maxAge: session.refreshMaxAgeMs,
    path: '/api/auth',
  });
}

export function clearAuthCookies(res) {
  res.clearCookie(env.auth.accessCookieName, { ...baseCookie(), path: '/' });
  res.clearCookie(env.auth.refreshCookieName, { ...baseCookie(), path: '/api/auth' });
}

export function readAccessToken(req) {
  const header = req.headers?.authorization;
  if (header?.startsWith('Bearer ')) return header.slice(7).trim();
  return req.cookies?.[env.auth.accessCookieName] || null;
}

export const readRefreshToken = (req) => req.cookies?.[env.auth.refreshCookieName] || req.body?.refreshToken || null;
