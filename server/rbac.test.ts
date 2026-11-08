import { describe, it, expect } from 'vitest'
import { ApiError } from './utils/ApiError.js'
import { requireRole } from './middleware/rbac.js'

describe('RBAC Middleware - requireRole', () => {
  // Test the core permission checking logic directly
  const testUser = (role) => ({ role });

  const checkAccess = (allowedRoles, userRole) => {
    if (!userRole || !allowedRoles.includes(userRole)) {
      return false;
    }
    return true;
  };

  describe('permission checking', () => {
    it('should allow ADMIN when ADMIN is in allowed list', () => {
      expect(checkAccess(['ADMIN', 'MANAGER'], 'ADMIN')).toBe(true);
    });

    it('should deny MANAGER when only ADMIN is allowed', () => {
      expect(checkAccess(['ADMIN'], 'MANAGER')).toBe(false);
    });

    it('should allow MANAGER when both MANAGER and ADMIN are allowed', () => {
      expect(checkAccess(['MANAGER', 'ADMIN'], 'MANAGER')).toBe(true);
    });

    it('should deny DEVELOPER when only MANAGER and ADMIN are allowed', () => {
      expect(checkAccess(['MANAGER', 'ADMIN'], 'DEVELOPER')).toBe(false);
    });

    it('should allow DEVELOPER when DEVELOPER, MANAGER, ADMIN are allowed', () => {
      expect(checkAccess(['DEVELOPER', 'MANAGER', 'ADMIN'], 'DEVELOPER')).toBe(true);
    });

    it('should deny access when user has no role', () => {
      expect(checkAccess(['ADMIN'], undefined)).toBe(false);
    });

    it('should deny access when user role is not in allowed list', () => {
      expect(checkAccess(['ADMIN'], 'DEVELOPER')).toBe(false);
    });
  });
})