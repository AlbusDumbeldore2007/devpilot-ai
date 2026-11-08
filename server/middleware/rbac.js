import { ApiError } from '../utils/ApiError.js';
import { ROLES, ROLE_LABELS } from '../utils/constants.js';

/**
 * Role-Based Access Control middleware.
 * Restricts access to routes based on user role.
 * 
 * Usage: 
 *   router.use(requireAuth); // or requireAuthz('ADMIN')
 *   router.get('/admin-only', adminOnlyHandler);
 * 
 * The user role comes from the JWT payload (set by the WS auth middleware
 * or an earlier auth middleware).
 */
export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    const user = req.user || req.data?.user;

    if (!user) {
      return next(
        new ApiError(401, 'Authentication required. No user context available.')
      );
    }

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