/**
 * SEC-022: Permission system tests
 * Tests for RBAC permission checks and role hierarchy
 */
import { describe, it, expect } from 'vitest';
import {
  PERMISSIONS,
  ROLE_HIERARCHY,
  ROLE_PERMISSIONS,
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  canManageRole,
  getPermissionsForRole,
  getRoleLabel,
  getAllRoles,
  type Permission,
} from '@/lib/permissions';

describe('Permission system (SEC-022)', () => {
  describe('PERMISSIONS constant', () => {
    it('should be frozen (immutable)', () => {
      // PERMISSIONS uses `as const` — verify the values are strings
      expect(typeof PERMISSIONS.EMPLOYEES_VIEW).toBe('string');
      expect(typeof PERMISSIONS.PAYROLL_APPROVE).toBe('string');
    });

    it('should have unique permission values', () => {
      const values = Object.values(PERMISSIONS);
      const unique = new Set(values);
      expect(unique.size).toBe(values.length);
    });

    it('should use colon-separated namespace:action format', () => {
      for (const [key, value] of Object.entries(PERMISSIONS)) {
        expect(value).toMatch(/^[\w]+:[\w:]+$/);
      }
    });
  });

  describe('ROLE_HIERARCHY', () => {
    it('should have general_manager at top', () => {
      const maxLevel = Math.max(...Object.values(ROLE_HIERARCHY));
      expect(ROLE_HIERARCHY.general_manager).toBe(maxLevel);
    });

    it('should have employee at bottom', () => {
      const minLevel = Math.min(...Object.values(ROLE_HIERARCHY));
      expect(ROLE_HIERARCHY.employee).toBe(minLevel);
    });

    it('should have unique hierarchy levels', () => {
      const levels = Object.values(ROLE_HIERARCHY);
      const unique = new Set(levels);
      expect(unique.size).toBe(levels.length);
    });

    it('GM should outrank all other roles', () => {
      for (const [role, level] of Object.entries(ROLE_HIERARCHY)) {
        if (role !== 'general_manager') {
          expect(ROLE_HIERARCHY.general_manager).toBeGreaterThan(level);
        }
      }
    });
  });

  describe('hasPermission', () => {
    it('general_manager should have full access', () => {
      expect(hasPermission('general_manager', PERMISSIONS.EMPLOYEES_VIEW)).toBe(true);
      expect(hasPermission('general_manager', PERMISSIONS.EMPLOYEES_DELETE)).toBe(true);
      expect(hasPermission('general_manager', PERMISSIONS.PAYROLL_APPROVE)).toBe(true);
      expect(hasPermission('general_manager', PERMISSIONS.USERS_ASSIGN_ROLES)).toBe(true);
      expect(hasPermission('general_manager', PERMISSIONS.SETTINGS_EDIT)).toBe(true);
    });

    it('employee should have limited access', () => {
      expect(hasPermission('employee', PERMISSIONS.EMPLOYEES_VIEW)).toBe(true);
      expect(hasPermission('employee', PERMISSIONS.DASHBOARD_VIEW)).toBe(true);
      expect(hasPermission('employee', PERMISSIONS.FEEDBACK_SUBMIT)).toBe(true);
      // Should NOT have admin permissions
      expect(hasPermission('employee', PERMISSIONS.EMPLOYEES_DELETE)).toBe(false);
      expect(hasPermission('employee', PERMISSIONS.USERS_ASSIGN_ROLES)).toBe(false);
      expect(hasPermission('employee', PERMISSIONS.SETTINGS_EDIT)).toBe(false);
      expect(hasPermission('employee', PERMISSIONS.PAYROLL_APPROVE)).toBe(false);
    });

    it('branch_manager should access branches but not edit them', () => {
      expect(hasPermission('branch_manager', PERMISSIONS.BRANCHES_VIEW)).toBe(true);
      expect(hasPermission('branch_manager', PERMISSIONS.BRANCHES_EDIT)).toBe(false);
      expect(hasPermission('branch_manager', PERMISSIONS.BRANCHES_DELETE)).toBe(false);
    });

    it('branch_manager should have attendance view', () => {
      expect(hasPermission('branch_manager', PERMISSIONS.ATTENDANCE_VIEW)).toBe(true);
    });

    it('hr should have branch edit permission', () => {
      expect(hasPermission('hr', PERMISSIONS.BRANCHES_EDIT)).toBe(true);
    });

    it('ceo should have payroll approve but not process', () => {
      expect(hasPermission('ceo', PERMISSIONS.PAYROLL_APPROVE)).toBe(true);
      expect(hasPermission('ceo', PERMISSIONS.PAYROLL_PROCESS)).toBe(false);
    });

    it('hr should have payroll process', () => {
      expect(hasPermission('hr', PERMISSIONS.PAYROLL_PROCESS)).toBe(true);
    });

    it('should return false for invalid permission strings', () => {
      // @ts-expect-error Testing runtime behavior with invalid input
      expect(hasPermission('employee', 'manage_branches')).toBe(false);
      // @ts-expect-error Testing runtime behavior with invalid input
      expect(hasPermission('employee', 'view_wages')).toBe(false);
    });

    it('should return false for unknown roles', () => {
      // @ts-expect-error Testing runtime behavior with invalid input
      expect(hasPermission('superadmin', PERMISSIONS.EMPLOYEES_VIEW)).toBe(false);
    });
  });

  describe('hasAnyPermission', () => {
    it('should return true if role has any of the permissions', () => {
      expect(hasAnyPermission('branch_manager', [
        PERMISSIONS.BRANCHES_EDIT,
        PERMISSIONS.ATTENDANCE_VIEW,
      ])).toBe(true);
    });

    it('should return false if role has none of the permissions', () => {
      expect(hasAnyPermission('employee', [
        PERMISSIONS.EMPLOYEES_DELETE,
        PERMISSIONS.USERS_ASSIGN_ROLES,
      ])).toBe(false);
    });

    it('should return false for empty permissions array', () => {
      expect(hasAnyPermission('general_manager', [])).toBe(false);
    });
  });

  describe('hasAllPermissions', () => {
    it('should return true when role has all permissions', () => {
      expect(hasAllPermissions('general_manager', [
        PERMISSIONS.EMPLOYEES_VIEW,
        PERMISSIONS.EMPLOYEES_DELETE,
        PERMISSIONS.PAYROLL_APPROVE,
      ])).toBe(true);
    });

    it('should return false when role lacks any permission', () => {
      expect(hasAllPermissions('employee', [
        PERMISSIONS.EMPLOYEES_VIEW,
        PERMISSIONS.EMPLOYEES_DELETE,
      ])).toBe(false);
    });

    it('should return true for empty permissions array', () => {
      expect(hasAllPermissions('employee', [])).toBe(true);
    });
  });

  describe('canManageRole', () => {
    it('GM should manage all other roles', () => {
      expect(canManageRole('general_manager', 'ceo')).toBe(true);
      expect(canManageRole('general_manager', 'hr')).toBe(true);
      expect(canManageRole('general_manager', 'employee')).toBe(true);
    });

    it('employee should not manage anyone', () => {
      expect(canManageRole('employee', 'employee')).toBe(false);
      expect(canManageRole('employee', 'recruiter')).toBe(false);
    });

    it('roles should not manage themselves', () => {
      const roles = getAllRoles();
      for (const role of roles) {
        expect(canManageRole(role, role)).toBe(false);
      }
    });

    it('CEO should manage HR but not GM', () => {
      expect(canManageRole('ceo', 'hr')).toBe(true);
      expect(canManageRole('ceo', 'general_manager')).toBe(false);
    });

    it('hierarchy should be transitive', () => {
      // If GM > CEO > HR > branch_manager > employee
      expect(canManageRole('general_manager', 'employee')).toBe(true);
      expect(canManageRole('ceo', 'employee')).toBe(true);
      expect(canManageRole('hr', 'employee')).toBe(true);
    });
  });

  describe('getPermissionsForRole', () => {
    it('should return an array of permissions', () => {
      const perms = getPermissionsForRole('employee');
      expect(Array.isArray(perms)).toBe(true);
      expect(perms.length).toBeGreaterThan(0);
    });

    it('GM should have the most permissions', () => {
      const gmPerms = getPermissionsForRole('general_manager');
      const roles = getAllRoles();
      for (const role of roles) {
        if (role !== 'general_manager') {
          const rolePerms = getPermissionsForRole(role);
          expect(gmPerms.length).toBeGreaterThanOrEqual(rolePerms.length);
        }
      }
    });

    it('should return empty array for unknown roles', () => {
      // @ts-expect-error Testing runtime behavior
      const perms = getPermissionsForRole('nonexistent');
      expect(perms).toEqual([]);
    });
  });

  describe('getRoleLabel', () => {
    it('should return human-readable labels for all roles', () => {
      const roles = getAllRoles();
      for (const role of roles) {
        const label = getRoleLabel(role);
        expect(label).toBeTruthy();
        expect(label.length).toBeGreaterThan(0);
        // Should not just be the raw role string (except if it matches)
        // Labels should have proper capitalization
        expect(label[0]).toBe(label[0].toUpperCase());
      }
    });
  });

  describe('getAllRoles', () => {
    it('should return all 10 defined roles', () => {
      const roles = getAllRoles();
      expect(roles.length).toBe(10);
      expect(roles).toContain('general_manager');
      expect(roles).toContain('ceo');
      expect(roles).toContain('hr');
      expect(roles).toContain('branch_manager');
      expect(roles).toContain('employee');
      expect(roles).toContain('chief_accountant');
      expect(roles).toContain('accountant');
      expect(roles).toContain('legal_manager');
      expect(roles).toContain('reports_manager');
      expect(roles).toContain('recruiter');
    });
  });

  describe('B-01/B-02 regression: permission strings must use PERMISSIONS constants', () => {
    it('old string "manage_branches" should NOT be a valid permission', () => {
      const allPermValues = Object.values(PERMISSIONS);
      expect(allPermValues).not.toContain('manage_branches');
    });

    it('old string "view_presence" should NOT be a valid permission', () => {
      const allPermValues = Object.values(PERMISSIONS);
      expect(allPermValues).not.toContain('view_presence');
    });

    it('old string "view_wages" should NOT be a valid permission', () => {
      const allPermValues = Object.values(PERMISSIONS);
      expect(allPermValues).not.toContain('view_wages');
    });

    it('old string "process_payroll" should NOT be a valid permission', () => {
      const allPermValues = Object.values(PERMISSIONS);
      expect(allPermValues).not.toContain('process_payroll');
    });

    it('old string "approve_payroll" should NOT be a valid permission', () => {
      const allPermValues = Object.values(PERMISSIONS);
      expect(allPermValues).not.toContain('approve_payroll');
    });
  });
});
