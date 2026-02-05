# Security Test Cases: TST-017

**Session:** QA Engineer (testa)
**Date:** 2026-02-05

---

## Overview

These tests verify the security fixes from SEC-017 security review and DEB-017 bug fixes.

### Security Findings Addressed:

| Finding | Severity | Issue | Fix Verification |
|---------|----------|-------|------------------|
| SEC-017 #1 | MEDIUM | Approve/Reject permission gap | PRM-001, PRM-002 tests |
| SEC-017 #2 | LOW | Type validation missing in bulk notify | BNP-003, BNP-004 tests |
| DEB-017 #3 | LOW | Frontend API field mapping | FE-015 test |

---

## 1. Permission Gap Tests (SEC-017 Finding #1)

### Test File: `__tests__/security/permission-gap.test.ts`

```typescript
import { describe, it, expect, beforeAll } from 'vitest';
import { createTestUser, createTestRequest } from '@/test/helpers';

/**
 * SEC-017 Finding #1: MEDIUM - Approve/Reject Permission Gap
 *
 * Issue: Users with PAYROLL_PROCESS but not PAYROLL_APPROVE could
 *        approve/reject payment requests.
 *
 * Fix: Added explicit hasPermission() check in PATCH handler.
 */
describe('SEC-017 Finding #1: Permission Gap Fix', () => {
  let hrUser: { token: string }; // Has PAYROLL_PROCESS, NOT PAYROLL_APPROVE
  let ceoUser: { token: string }; // Has PAYROLL_APPROVE, NOT PAYROLL_PROCESS
  let gmUser: { token: string }; // Has BOTH permissions
  let pendingRequestId: string;

  beforeAll(async () => {
    hrUser = await createTestUser('hr');
    ceoUser = await createTestUser('ceo');
    gmUser = await createTestUser('general_manager');
    const request = await createTestRequest('pending');
    pendingRequestId = request.id;
  });

  // Critical Test: HR cannot approve
  it('SECURITY: HR user CANNOT approve payment requests', async () => {
    const response = await fetch(`/api/payment-requests/${pendingRequestId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `token=${hrUser.token}`,
      },
      body: JSON.stringify({ action: 'approve' }),
    });

    // MUST return 403 Forbidden
    expect(response.status).toBe(403);

    const data = await response.json();
    expect(data.error).toBe('Approval permission required');
  });

  // Critical Test: HR cannot reject
  it('SECURITY: HR user CANNOT reject payment requests', async () => {
    const response = await fetch(`/api/payment-requests/${pendingRequestId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `token=${hrUser.token}`,
      },
      body: JSON.stringify({ action: 'reject', reason: 'Test rejection' }),
    });

    // MUST return 403 Forbidden
    expect(response.status).toBe(403);

    const data = await response.json();
    expect(data.error).toBe('Approval permission required');
  });

  // Verify CEO can still approve (has PAYROLL_APPROVE)
  it('CEO user CAN approve payment requests', async () => {
    const response = await fetch(`/api/payment-requests/${pendingRequestId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `token=${ceoUser.token}`,
      },
      body: JSON.stringify({ action: 'approve' }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
  });

  // Verify GM can approve (has both permissions)
  it('GM user CAN approve payment requests', async () => {
    const pendingRequest = await createTestRequest('pending');

    const response = await fetch(`/api/payment-requests/${pendingRequest.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `token=${gmUser.token}`,
      },
      body: JSON.stringify({ action: 'approve' }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
  });

  // Verify HR can still submit (only needs PAYROLL_PROCESS)
  it('HR user CAN submit payment requests (PAYROLL_PROCESS only)', async () => {
    const draftRequest = await createTestRequest('draft');

    const response = await fetch(`/api/payment-requests/${draftRequest.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `token=${hrUser.token}`,
      },
      body: JSON.stringify({ action: 'submit' }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
  });

  // Verify HR can still mark paid (only needs PAYROLL_PROCESS)
  it('HR user CAN mark requests as paid (PAYROLL_PROCESS only)', async () => {
    const approvedRequest = await createTestRequest('approved');

    const response = await fetch(`/api/payment-requests/${approvedRequest.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `token=${hrUser.token}`,
      },
      body: JSON.stringify({ action: 'pay', payment_reference: 'REF-001' }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
  });
});
```

---

## 2. Type Validation Tests (SEC-017 Finding #2)

### Test File: `__tests__/security/type-validation.test.ts`

```typescript
import { describe, it, expect, beforeAll } from 'vitest';
import { createTestUser } from '@/test/helpers';

/**
 * SEC-017 Finding #2: LOW - Type Validation Missing
 *
 * Issue: Year and month from request body could be strings,
 *        which would pass truthy checks but cause unexpected behavior.
 *
 * Fix: Added typeof checks for both year and month.
 */
describe('SEC-017 Finding #2: Type Validation Fix', () => {
  let hrUser: { token: string };

  beforeAll(async () => {
    hrUser = await createTestUser('hr');
  });

  // String year should be rejected
  it('SECURITY: Rejects string year in POST body', async () => {
    const response = await fetch('/api/payment-requests/notify-all', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `token=${hrUser.token}`,
      },
      body: JSON.stringify({
        year: '2026',  // String instead of number
        month: 2,
      }),
    });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('Year and month must be numbers');
  });

  // String month should be rejected
  it('SECURITY: Rejects string month in POST body', async () => {
    const response = await fetch('/api/payment-requests/notify-all', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `token=${hrUser.token}`,
      },
      body: JSON.stringify({
        year: 2026,
        month: '2',  // String instead of number
      }),
    });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('Year and month must be numbers');
  });

  // Both as strings should be rejected
  it('SECURITY: Rejects both as strings', async () => {
    const response = await fetch('/api/payment-requests/notify-all', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `token=${hrUser.token}`,
      },
      body: JSON.stringify({
        year: '2026',
        month: '2',
      }),
    });

    expect(response.status).toBe(400);
  });

  // Valid numbers should work
  it('SECURITY: Accepts valid number types', async () => {
    const response = await fetch('/api/payment-requests/notify-all', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `token=${hrUser.token}`,
      },
      body: JSON.stringify({
        year: 2026,
        month: 2,
      }),
    });

    // Should succeed (or return empty if no requests)
    expect(response.status).toBe(200);
  });

  // Invalid month range
  it('SECURITY: Rejects month > 12', async () => {
    const response = await fetch('/api/payment-requests/notify-all', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `token=${hrUser.token}`,
      },
      body: JSON.stringify({
        year: 2026,
        month: 13,
      }),
    });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain('Month must be between 1 and 12');
  });

  // Invalid month range (zero)
  it('SECURITY: Rejects month < 1', async () => {
    const response = await fetch('/api/payment-requests/notify-all', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `token=${hrUser.token}`,
      },
      body: JSON.stringify({
        year: 2026,
        month: 0,
      }),
    });

    expect(response.status).toBe(400);
  });

  // Year out of range (too old)
  it('SECURITY: Rejects year before 2020', async () => {
    const response = await fetch('/api/payment-requests/notify-all', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `token=${hrUser.token}`,
      },
      body: JSON.stringify({
        year: 2019,
        month: 2,
      }),
    });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('Invalid year');
  });

  // Year out of range (too far future)
  it('SECURITY: Rejects year more than 1 year in future', async () => {
    const currentYear = new Date().getFullYear();
    const response = await fetch('/api/payment-requests/notify-all', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `token=${hrUser.token}`,
      },
      body: JSON.stringify({
        year: currentYear + 2,  // 2 years in future
        month: 2,
      }),
    });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('Invalid year');
  });
});
```

---

## 3. API Response Consistency Tests (DEB-017 Bug #3)

### Test File: `__tests__/security/api-response.test.ts`

```typescript
import { describe, it, expect, beforeAll } from 'vitest';
import { createTestUser } from '@/test/helpers';

/**
 * DEB-017 Bug #3: Frontend API Response Field Mapping
 *
 * Issue: Frontend read `totalSent`/`totalSkipped` but API returns
 *        `employeesNotified`/`skipped`.
 *
 * Fix: Corrected field names in PayrollActions.tsx
 *
 * This test verifies the API response structure is correct.
 */
describe('DEB-017 Bug #3: API Response Structure', () => {
  let hrUser: { token: string };

  beforeAll(async () => {
    hrUser = await createTestUser('hr');
  });

  it('POST /notify-all returns correct field names', async () => {
    const response = await fetch('/api/payment-requests/notify-all', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `token=${hrUser.token}`,
      },
      body: JSON.stringify({
        year: 2026,
        month: 2,
      }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();

    // Verify response structure
    expect(data.success).toBe(true);
    expect(data.summary).toBeDefined();

    // CORRECT field names
    expect('employeesNotified' in data.summary).toBe(true);
    expect('skipped' in data.summary).toBe(true);
    expect('requestsProcessed' in data.summary).toBe(true);

    // INCORRECT field names should NOT exist
    expect('totalSent' in data.summary).toBe(false);
    expect('totalSkipped' in data.summary).toBe(false);
  });

  it('GET /notify-all returns correct count field names', async () => {
    const response = await fetch(
      '/api/payment-requests/notify-all?year=2026&month=2',
      {
        headers: { Cookie: `token=${hrUser.token}` },
      }
    );

    expect(response.status).toBe(200);
    const data = await response.json();

    // Verify count fields exist
    expect('advanceCount' in data || 'wageCount' in data || 'total' in data).toBe(true);
  });
});
```

---

## 4. Authentication & Authorization Matrix Tests

### Test File: `__tests__/security/auth-matrix.test.ts`

```typescript
import { describe, it, expect, beforeAll } from 'vitest';
import { createTestUser } from '@/test/helpers';

/**
 * Comprehensive authorization matrix testing for all new endpoints.
 */
describe('Authorization Matrix', () => {
  interface TestUser {
    token: string;
    role: string;
  }

  const users: Record<string, TestUser> = {};
  let testRequestId: string;

  beforeAll(async () => {
    users.gm = { ...(await createTestUser('general_manager')), role: 'general_manager' };
    users.ceo = { ...(await createTestUser('ceo')), role: 'ceo' };
    users.hr = { ...(await createTestUser('hr')), role: 'hr' };
    users.accountant = { ...(await createTestUser('chief_accountant')), role: 'chief_accountant' };
    users.branchManager = { ...(await createTestUser('branch_manager')), role: 'branch_manager' };
    users.employee = { ...(await createTestUser('employee')), role: 'employee' };

    const request = await import('@/test/helpers').then((m) => m.createTestRequest('pending'));
    testRequestId = request.id;
  });

  describe('DELETE /api/payment-requests/[id]', () => {
    const requiredPermission = 'PAYROLL_PROCESS';

    const authMatrix = [
      { role: 'gm', hasPermission: true },
      { role: 'ceo', hasPermission: false },  // CEO doesn't have PAYROLL_PROCESS
      { role: 'hr', hasPermission: true },
      { role: 'accountant', hasPermission: false },
      { role: 'branchManager', hasPermission: false },
      { role: 'employee', hasPermission: false },
    ];

    authMatrix.forEach(({ role, hasPermission }) => {
      it(`${role}: ${hasPermission ? 'ALLOWED' : 'DENIED'}`, async () => {
        const response = await fetch(`/api/payment-requests/${testRequestId}`, {
          method: 'DELETE',
          headers: { Cookie: `token=${users[role].token}` },
        });

        if (hasPermission) {
          // May be 200 (success) or 400 (already deleted/paid)
          expect([200, 400, 404]).toContain(response.status);
        } else {
          expect(response.status).toBe(403);
        }
      });
    });
  });

  describe('POST /api/payment-requests/[id]/notify', () => {
    const requiredPermission = 'PAYROLL_PROCESS';

    const authMatrix = [
      { role: 'gm', hasPermission: true },
      { role: 'ceo', hasPermission: false },
      { role: 'hr', hasPermission: true },
      { role: 'accountant', hasPermission: false },
      { role: 'branchManager', hasPermission: false },
      { role: 'employee', hasPermission: false },
    ];

    authMatrix.forEach(({ role, hasPermission }) => {
      it(`${role}: ${hasPermission ? 'ALLOWED' : 'DENIED'}`, async () => {
        const response = await fetch(`/api/payment-requests/${testRequestId}/notify`, {
          method: 'POST',
          headers: { Cookie: `token=${users[role].token}` },
        });

        if (hasPermission) {
          // May be 200 (success) or 400 (invalid status)
          expect([200, 400]).toContain(response.status);
        } else {
          expect(response.status).toBe(403);
        }
      });
    });
  });

  describe('GET /api/payment-requests/notify-all', () => {
    const requiredPermission = 'PAYROLL_VIEW_ALL';

    const authMatrix = [
      { role: 'gm', hasPermission: true },
      { role: 'ceo', hasPermission: true },
      { role: 'hr', hasPermission: true },
      { role: 'accountant', hasPermission: false },
      { role: 'branchManager', hasPermission: false },
      { role: 'employee', hasPermission: false },
    ];

    authMatrix.forEach(({ role, hasPermission }) => {
      it(`${role}: ${hasPermission ? 'ALLOWED' : 'DENIED'}`, async () => {
        const response = await fetch(
          '/api/payment-requests/notify-all?year=2026&month=2',
          { headers: { Cookie: `token=${users[role].token}` } }
        );

        if (hasPermission) {
          expect(response.status).toBe(200);
        } else {
          expect(response.status).toBe(403);
        }
      });
    });
  });

  describe('POST /api/payment-requests/notify-all', () => {
    const requiredPermission = 'PAYROLL_PROCESS';

    const authMatrix = [
      { role: 'gm', hasPermission: true },
      { role: 'ceo', hasPermission: false },
      { role: 'hr', hasPermission: true },
      { role: 'accountant', hasPermission: false },
      { role: 'branchManager', hasPermission: false },
      { role: 'employee', hasPermission: false },
    ];

    authMatrix.forEach(({ role, hasPermission }) => {
      it(`${role}: ${hasPermission ? 'ALLOWED' : 'DENIED'}`, async () => {
        const response = await fetch('/api/payment-requests/notify-all', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Cookie: `token=${users[role].token}`,
          },
          body: JSON.stringify({ year: 2026, month: 2 }),
        });

        if (hasPermission) {
          expect(response.status).toBe(200);
        } else {
          expect(response.status).toBe(403);
        }
      });
    });
  });

  describe('PATCH /api/payment-requests/[id] - Approve/Reject', () => {
    const requiredPermission = 'PAYROLL_APPROVE';

    const authMatrix = [
      { role: 'gm', hasPermission: true },
      { role: 'ceo', hasPermission: true },
      { role: 'hr', hasPermission: false },  // CRITICAL: HR should NOT have this
      { role: 'accountant', hasPermission: false },
      { role: 'branchManager', hasPermission: false },
      { role: 'employee', hasPermission: false },
    ];

    describe('action: approve', () => {
      authMatrix.forEach(({ role, hasPermission }) => {
        it(`${role}: ${hasPermission ? 'ALLOWED' : 'DENIED'}`, async () => {
          const response = await fetch(`/api/payment-requests/${testRequestId}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              Cookie: `token=${users[role].token}`,
            },
            body: JSON.stringify({ action: 'approve' }),
          });

          if (hasPermission) {
            // May be 200 (success) or 400 (invalid status)
            expect([200, 400]).toContain(response.status);
          } else {
            expect(response.status).toBe(403);
          }
        });
      });
    });

    describe('action: reject', () => {
      authMatrix.forEach(({ role, hasPermission }) => {
        it(`${role}: ${hasPermission ? 'ALLOWED' : 'DENIED'}`, async () => {
          const response = await fetch(`/api/payment-requests/${testRequestId}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              Cookie: `token=${users[role].token}`,
            },
            body: JSON.stringify({ action: 'reject', reason: 'Test' }),
          });

          if (hasPermission) {
            // May be 200 (success) or 400 (invalid status)
            expect([200, 400]).toContain(response.status);
          } else {
            expect(response.status).toBe(403);
          }
        });
      });
    });
  });
});
```

---

## 5. Security Regression Tests

### Test File: `__tests__/security/regression.test.ts`

```typescript
import { describe, it, expect, beforeAll } from 'vitest';
import { createTestUser } from '@/test/helpers';

/**
 * Regression tests to ensure security fixes remain in place.
 */
describe('Security Regression Tests', () => {
  let hrUser: { token: string };
  let viewerUser: { token: string };

  beforeAll(async () => {
    hrUser = await createTestUser('hr');
    viewerUser = await createTestUser('branch_manager');
  });

  describe('Authentication Required', () => {
    it('DELETE requires authentication', async () => {
      const response = await fetch('/api/payment-requests/some-id', {
        method: 'DELETE',
        // No Cookie header
      });

      expect(response.status).toBe(401);
    });

    it('POST /notify requires authentication', async () => {
      const response = await fetch('/api/payment-requests/some-id/notify', {
        method: 'POST',
      });

      expect(response.status).toBe(401);
    });

    it('GET /notify-all requires authentication', async () => {
      const response = await fetch('/api/payment-requests/notify-all?year=2026&month=2');

      expect(response.status).toBe(401);
    });

    it('POST /notify-all requires authentication', async () => {
      const response = await fetch('/api/payment-requests/notify-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ year: 2026, month: 2 }),
      });

      expect(response.status).toBe(401);
    });
  });

  describe('No SQL Injection', () => {
    it('DELETE handles malicious ID gracefully', async () => {
      const maliciousId = "'; DROP TABLE payment_requests; --";
      const response = await fetch(
        `/api/payment-requests/${encodeURIComponent(maliciousId)}`,
        {
          method: 'DELETE',
          headers: { Cookie: `token=${hrUser.token}` },
        }
      );

      // Should return 404 (not found) or 400 (invalid ID), NOT 500 (server error)
      expect([400, 404]).toContain(response.status);
    });

    it('POST /notify handles malicious ID gracefully', async () => {
      const maliciousId = "' OR '1'='1";
      const response = await fetch(
        `/api/payment-requests/${encodeURIComponent(maliciousId)}/notify`,
        {
          method: 'POST',
          headers: { Cookie: `token=${hrUser.token}` },
        }
      );

      expect([400, 404]).toContain(response.status);
    });
  });

  describe('Error Messages Do Not Leak Internal Info', () => {
    it('DELETE error does not expose internal paths', async () => {
      const response = await fetch('/api/payment-requests/invalid-id', {
        method: 'DELETE',
        headers: { Cookie: `token=${hrUser.token}` },
      });

      const data = await response.json();

      // Error should NOT contain internal info
      expect(JSON.stringify(data)).not.toContain('/src/');
      expect(JSON.stringify(data)).not.toContain('at ');
      expect(JSON.stringify(data)).not.toContain('node_modules');
    });
  });
});
```

---

## Summary: Critical Security Tests

| Test ID | Test Name | Verifies |
|---------|-----------|----------|
| SEC-001 | HR cannot approve | SEC-017 Finding #1 fix |
| SEC-002 | HR cannot reject | SEC-017 Finding #1 fix |
| SEC-003 | String year rejected | SEC-017 Finding #2 fix |
| SEC-004 | String month rejected | SEC-017 Finding #2 fix |
| SEC-005 | Invalid month rejected | SEC-017 Finding #2 fix |
| SEC-006 | Year range validated | SEC-017 Finding #2 fix |
| SEC-007 | API returns correct fields | DEB-017 Bug #3 fix |
| SEC-008 | All endpoints require auth | Regression |
| SEC-009 | No SQL injection | Regression |
| SEC-010 | No info leakage in errors | Regression |
