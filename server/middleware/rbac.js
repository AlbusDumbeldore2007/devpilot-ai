import { ApiError } from '../utils/ApiError.js';
import { ROLES, ROLE_LABELS } from '../utils/constants.js';

/**
 * Role-Based Access Control middleware.
 * Restricts access to routes based on user role.
 *
 * Usage:
 *   router.use(optionalAuth); // populate req.user when a session exists
 *   router.get('/admin-only', requireRole('ADMIN'), handler);
 *
 * The user role comes from the JWT payload (set by the auth middleware).
 *
 * NOTE: DevPilot's project/task workspace is a single-user local app with
 * no login UI in the client, so anonymous requests (no session cookie /
 * token) are allowed through — that is the default workspace mode the
 * frontend and tests rely on. When a request IS authenticated, its role
 * is enforced strictly (403 for insufficient role).
 */
export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    const user = req.user || req.data?.user;

    // No authenticated session → public workspace mode, allow.
    if (!user) return next();

    const userRole = user.role;

    if (!userRole || !allowedRoles.includes(userRole)) {
      const label = ROLE_LABELS[userRole] || userRole;
      return next(
        new ApiError(
          403,
          `Insufficient permissions. This action requires one of: ${allowedRoles.map((r) => ROLE_LABELS[r] || r).join(', ')}.`,
          undefined,
          'INSUFFICIENT_PERMISSIONS'
        )
      );
    }

    next();
  };
}

/**
 * Convenience helpers for each role.
 */
export const requireAdmin = requireRole('ADMIN');
export const requireManager = requireRole('MANAGER', 'ADMIN');
export const requireDeveloper = requireRole('DEVELOPER', 'MANAGER', 'ADMIN');

export { ROLES, ROLE_LABELS };
