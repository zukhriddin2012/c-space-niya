# API Test Cases: TST-017

**Session:** QA Engineer (testa)
**Date:** 2026-02-05

---

## Test Utilities

### Setup Helper

```typescript
// test/helpers/payroll-test-setup.ts
import { createClient } from '@supabase/supabase-js';

interface TestUser {
  id: string;
  role: string;
  token: string;
}

interface TestRequest {
  id: string;
  status: 'draft' | 'pending' | 'approved' | 'rejected' | 'paid';
  type: 'advance' | 'wage';
}

export async function setupTestData(): Promise<{
  users: Record<string, TestUser>;
  requests: Record<string, TestRequest>;
}> {
  // Create test users with different roles
  const users = {
    gm: await createTestUser('general_manager'),
    ceo: await createTestUser('ceo'),
    hr: await createTestUser('hr'),
    viewer: await createTestUser('branch_manager'),
  };

  // Create test payment requests
  const requests = {
    draft: await createTestRequest('draft', 'advance'),
    pending: await createTestRequest('pending', 'wage'),
    approved: await createTestRequest('approved', 'advance'),
    approvedNotified: await createTestRequest('approved', 'wage', true),
    paid: await createTestRequest('paid', 'advance'),
    paidNotified: await createTestRequest('paid', 'wage', true),
    rejected: await createTestRequest('rejected', 'advance'),
  };

  return { users, requests };
}
```

---

## 1. DELETE Endpoint Tests

### Test File: `__tests__/api/payment-requests/delete.test.ts`

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { setupTestData } from '@/test/helpers/payroll-test-setup';

describe('DELETE /api/payment-requests/[id]', () => {
  let testData: Awaited<ReturnType<typeof setupTestData>>;

  beforeAll(async () => {
    testData = await setupTestData();
  });

  // DEL-001: Delete draft request
  it('should delete a draft request successfully', async () => {
    const response = await fetch(`/api/payment-requests/${testData.requests.draft.id}`, {
      method: 'DELETE',
      headers: { Cookie: `token=${testData.users.hr.token}` },
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.deletedRequest).toBeDefined();
    expect(data.deletedRequest.request_type).toBe('advance');
  });

  // DEL-002: Delete pending request
  it('should delete a pending request successfully', async () => {
    const response = await fetch(`/api/payment-requests/${testData.requests.pending.id}`, {
      method: 'DELETE',
      headers: { Cookie: `token=${testData.users.hr.token}` },
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
  });

  // DEL-003: Delete approved request
  it('should delete an approved request successfully', async () => {
    const response = await fetch(`/api/payment-requests/${testData.requests.approved.id}`, {
      method: 'DELETE',
      headers: { Cookie: `token=${testData.users.hr.token}` },
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
  });

  // DEL-005: CRITICAL - Prevent delete paid request
  it('should REJECT deletion of paid request', async () => {
    const response = await fetch(`/api/payment-requests/${testData.requests.paid.id}`, {
      method: 'DELETE',
      headers: { Cookie: `token=${testData.users.hr.token}` },
    });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.success).toBe(false);
    expect(data.code).toBe('CANNOT_DELETE_PAID');
    expect(data.error).toContain('Cannot delete paid');
  });

  // DEL-006: Delete non-existent request
  it('should return 404 for non-existent request', async () => {
    const fakeId = '00000000-0000-0000-0000-000000000000';
    const response = await fetch(`/api/payment-requests/${fakeId}`, {
      method: 'DELETE',
      headers: { Cookie: `token=${testData.users.hr.token}` },
    });

    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.code).toBe('NOT_FOUND');
  });

  // DEL-007: Delete without authentication
  it('should return 401 without authentication', async () => {
    const response = await fetch(`/api/payment-requests/${testData.requests.draft.id}`, {
      method: 'DELETE',
      // No Cookie header
    });

    expect(response.status).toBe(401);
  });

  // DEL-008: Delete without PAYROLL_PROCESS permission
  it('should return 403 without PAYROLL_PROCESS permission', async () => {
    const response = await fetch(`/api/payment-requests/${testData.requests.draft.id}`, {
      method: 'DELETE',
      headers: { Cookie: `token=${testData.users.viewer.token}` },
    });

    expect(response.status).toBe(403);
  });

  // DEL-010: Verify audit log
  it('should create audit log entry on delete', async () => {
    const requestId = testData.requests.draft.id;

    await fetch(`/api/payment-requests/${requestId}`, {
      method: 'DELETE',
      headers: { Cookie: `token=${testData.users.hr.token}` },
    });

    // Verify audit entry exists
    const auditEntry = await getAuditEntry(requestId, 'deleted');
    expect(auditEntry).toBeDefined();
    expect(auditEntry.actor_id).toBe(testData.users.hr.id);
    expect(auditEntry.details.request_type).toBeDefined();
    expect(auditEntry.details.employee_count).toBeDefined();
    expect(auditEntry.details.total_amount).toBeDefined();
  });
});
```

---

## 2. Single Notify Tests

### Test File: `__tests__/api/payment-requests/notify.test.ts`

```typescript
import { describe, it, expect, beforeAll } from 'vitest';
import { setupTestData } from '@/test/helpers/payroll-test-setup';

describe('POST /api/payment-requests/[id]/notify', () => {
  let testData: Awaited<ReturnType<typeof setupTestData>>;

  beforeAll(async () => {
    testData = await setupTestData();
  });

  // NTF-001: Notify approved request
  it('should notify employees for approved request', async () => {
    const response = await fetch(
      `/api/payment-requests/${testData.requests.approved.id}/notify`,
      {
        method: 'POST',
        headers: { Cookie: `token=${testData.users.hr.token}` },
      }
    );

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(typeof data.notified).toBe('number');
    expect(typeof data.skipped).toBe('number');
  });

  // NTF-002: Notify paid request
  it('should notify employees for paid request', async () => {
    const response = await fetch(
      `/api/payment-requests/${testData.requests.paid.id}/notify`,
      {
        method: 'POST',
        headers: { Cookie: `token=${testData.users.hr.token}` },
      }
    );

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
  });

  // NTF-003: CRITICAL - Prevent notify draft
  it('should REJECT notification for draft request', async () => {
    const response = await fetch(
      `/api/payment-requests/${testData.requests.draft.id}/notify`,
      {
        method: 'POST',
        headers: { Cookie: `token=${testData.users.hr.token}` },
      }
    );

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.success).toBe(false);
    expect(data.code).toBe('INVALID_STATUS');
  });

  // NTF-004: Prevent notify pending
  it('should REJECT notification for pending request', async () => {
    const response = await fetch(
      `/api/payment-requests/${testData.requests.pending.id}/notify`,
      {
        method: 'POST',
        headers: { Cookie: `token=${testData.users.hr.token}` },
      }
    );

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.code).toBe('INVALID_STATUS');
  });

  // NTF-006: CRITICAL - Idempotency check
  it('should return alreadyNotified for previously notified request', async () => {
    // First notify
    await fetch(
      `/api/payment-requests/${testData.requests.approved.id}/notify`,
      {
        method: 'POST',
        headers: { Cookie: `token=${testData.users.hr.token}` },
      }
    );

    // Second notify - should detect idempotency
    const response = await fetch(
      `/api/payment-requests/${testData.requests.approved.id}/notify`,
      {
        method: 'POST',
        headers: { Cookie: `token=${testData.users.hr.token}` },
      }
    );

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.alreadyNotified).toBe(true);
    expect(data.notifiedAt).toBeDefined();
  });

  // NTF-009: Notify without PAYROLL_PROCESS permission
  it('should return 403 without PAYROLL_PROCESS permission', async () => {
    const response = await fetch(
      `/api/payment-requests/${testData.requests.approved.id}/notify`,
      {
        method: 'POST',
        headers: { Cookie: `token=${testData.users.viewer.token}` },
      }
    );

    expect(response.status).toBe(403);
  });
});
```

---

## 3. Bulk Notify Tests

### Test File: `__tests__/api/payment-requests/notify-all.test.ts`

```typescript
import { describe, it, expect, beforeAll } from 'vitest';
import { setupTestData } from '@/test/helpers/payroll-test-setup';

describe('GET /api/payment-requests/notify-all', () => {
  let testData: Awaited<ReturnType<typeof setupTestData>>;

  beforeAll(async () => {
    testData = await setupTestData();
  });

  // BNA-001: Get notification counts
  it('should return notification counts for period', async () => {
    const response = await fetch(
      '/api/payment-requests/notify-all?year=2026&month=2',
      { headers: { Cookie: `token=${testData.users.hr.token}` } }
    );

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(typeof data.advanceCount).toBe('number');
    expect(typeof data.wageCount).toBe('number');
  });

  // BNA-002: Validation - missing year
  it('should reject request without year', async () => {
    const response = await fetch(
      '/api/payment-requests/notify-all?month=2',
      { headers: { Cookie: `token=${testData.users.hr.token}` } }
    );

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain('Year and month are required');
  });

  // BNA-004: CRITICAL - Validation invalid month
  it('should reject invalid month (13)', async () => {
    const response = await fetch(
      '/api/payment-requests/notify-all?year=2026&month=13',
      { headers: { Cookie: `token=${testData.users.hr.token}` } }
    );

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain('Month must be between 1 and 12');
  });

  // BNA-005: Validation month zero
  it('should reject month=0', async () => {
    const response = await fetch(
      '/api/payment-requests/notify-all?year=2026&month=0',
      { headers: { Cookie: `token=${testData.users.hr.token}` } }
    );

    expect(response.status).toBe(400);
  });

  // BNA-006: Validation non-numeric
  it('should reject non-numeric year', async () => {
    const response = await fetch(
      '/api/payment-requests/notify-all?year=abc&month=2',
      { headers: { Cookie: `token=${testData.users.hr.token}` } }
    );

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain('valid numbers');
  });
});

describe('POST /api/payment-requests/notify-all', () => {
  let testData: Awaited<ReturnType<typeof setupTestData>>;

  beforeAll(async () => {
    testData = await setupTestData();
  });

  // BNP-001: Bulk notify paid requests
  it('should bulk notify all un-notified paid requests', async () => {
    const response = await fetch('/api/payment-requests/notify-all', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `token=${testData.users.hr.token}`,
      },
      body: JSON.stringify({ year: 2026, month: 2 }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.summary).toBeDefined();
    expect(typeof data.summary.requestsProcessed).toBe('number');
    expect(typeof data.summary.employeesNotified).toBe('number');
    expect(typeof data.summary.skipped).toBe('number');
  });

  // BNP-003: CRITICAL - Validation string year (Security Finding #2 Fix)
  it('should REJECT string year', async () => {
    const response = await fetch('/api/payment-requests/notify-all', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `token=${testData.users.hr.token}`,
      },
      body: JSON.stringify({ year: '2026', month: 2 }), // String instead of number
    });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('Year and month must be numbers');
  });

  // BNP-004: CRITICAL - Validation string month (Security Finding #2 Fix)
  it('should REJECT string month', async () => {
    const response = await fetch('/api/payment-requests/notify-all', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `token=${testData.users.hr.token}`,
      },
      body: JSON.stringify({ year: 2026, month: '2' }), // String instead of number
    });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('Year and month must be numbers');
  });

  // BNP-005: Validation invalid month
  it('should reject invalid month (13)', async () => {
    const response = await fetch('/api/payment-requests/notify-all', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `token=${testData.users.hr.token}`,
      },
      body: JSON.stringify({ year: 2026, month: 13 }),
    });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain('Month must be between 1 and 12');
  });

  // BNP-006: Validation year too old
  it('should reject year before 2020', async () => {
    const response = await fetch('/api/payment-requests/notify-all', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `token=${testData.users.hr.token}`,
      },
      body: JSON.stringify({ year: 2019, month: 2 }),
    });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('Invalid year');
  });

  // BNP-007: Validation year too future
  it('should reject year too far in future', async () => {
    const response = await fetch('/api/payment-requests/notify-all', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `token=${testData.users.hr.token}`,
      },
      body: JSON.stringify({ year: 2028, month: 2 }),
    });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('Invalid year');
  });
});
```

---

## 4. Permission Tests (Security Finding #1 Fix)

### Test File: `__tests__/api/payment-requests/permissions.test.ts`

```typescript
import { describe, it, expect, beforeAll } from 'vitest';
import { setupTestData } from '@/test/helpers/payroll-test-setup';

describe('PATCH /api/payment-requests/[id] - Permission Checks', () => {
  let testData: Awaited<ReturnType<typeof setupTestData>>;

  beforeAll(async () => {
    testData = await setupTestData();
  });

  // PRM-001: CRITICAL - HR cannot approve (Security Finding #1 Fix)
  it('should REJECT HR user approving request', async () => {
    const response = await fetch(
      `/api/payment-requests/${testData.requests.pending.id}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `token=${testData.users.hr.token}`,
        },
        body: JSON.stringify({ action: 'approve' }),
      }
    );

    expect(response.status).toBe(403);
    const data = await response.json();
    expect(data.error).toBe('Approval permission required');
  });

  // PRM-002: CRITICAL - HR cannot reject (Security Finding #1 Fix)
  it('should REJECT HR user rejecting request', async () => {
    const response = await fetch(
      `/api/payment-requests/${testData.requests.pending.id}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `token=${testData.users.hr.token}`,
        },
        body: JSON.stringify({ action: 'reject', reason: 'Test rejection' }),
      }
    );

    expect(response.status).toBe(403);
    const data = await response.json();
    expect(data.error).toBe('Approval permission required');
  });

  // PRM-003: CEO can approve
  it('should ALLOW CEO to approve request', async () => {
    const response = await fetch(
      `/api/payment-requests/${testData.requests.pending.id}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `token=${testData.users.ceo.token}`,
        },
        body: JSON.stringify({ action: 'approve' }),
      }
    );

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
  });

  // PRM-004: CEO can reject
  it('should ALLOW CEO to reject request', async () => {
    const response = await fetch(
      `/api/payment-requests/${testData.requests.pending.id}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `token=${testData.users.ceo.token}`,
        },
        body: JSON.stringify({ action: 'reject', reason: 'Test rejection by CEO' }),
      }
    );

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
  });

  // PRM-005: GM can approve (has both permissions)
  it('should ALLOW GM to approve request', async () => {
    const response = await fetch(
      `/api/payment-requests/${testData.requests.pending.id}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `token=${testData.users.gm.token}`,
        },
        body: JSON.stringify({ action: 'approve' }),
      }
    );

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
  });

  // PRM-006: HR can submit (PAYROLL_PROCESS only needed)
  it('should ALLOW HR to submit request', async () => {
    const response = await fetch(
      `/api/payment-requests/${testData.requests.draft.id}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `token=${testData.users.hr.token}`,
        },
        body: JSON.stringify({ action: 'submit' }),
      }
    );

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
  });

  // PRM-007: HR can mark paid (PAYROLL_PROCESS only needed)
  it('should ALLOW HR to mark request as paid', async () => {
    const response = await fetch(
      `/api/payment-requests/${testData.requests.approved.id}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `token=${testData.users.hr.token}`,
        },
        body: JSON.stringify({ action: 'pay', payment_reference: 'REF-001' }),
      }
    );

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
  });

  // PRM-008: Reject requires reason
  it('should require reason for rejection', async () => {
    const response = await fetch(
      `/api/payment-requests/${testData.requests.pending.id}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `token=${testData.users.ceo.token}`,
        },
        body: JSON.stringify({ action: 'reject' }), // No reason
      }
    );

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain('Rejection reason is required');
  });
});
```

---

## 5. Paid Status Endpoint Tests

### Test File: `__tests__/api/payment-requests/paid-status.test.ts`

```typescript
import { describe, it, expect, beforeAll } from 'vitest';
import { setupTestData } from '@/test/helpers/payroll-test-setup';

describe('GET /api/payment-requests/paid-status', () => {
  let testData: Awaited<ReturnType<typeof setupTestData>>;

  beforeAll(async () => {
    testData = await setupTestData();
  });

  // PST-001: Get paid status for period
  it('should return paid status map', async () => {
    const response = await fetch(
      '/api/payment-requests/paid-status?year=2026&month=2',
      { headers: { Cookie: `token=${testData.users.hr.token}` } }
    );

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.status).toBeDefined();
    expect(typeof data.status).toBe('object');
  });

  // PST-002/003: Check structure includes advance and wage
  it('should include advancePaid and wagePaid fields', async () => {
    const response = await fetch(
      '/api/payment-requests/paid-status?year=2026&month=2',
      { headers: { Cookie: `token=${testData.users.hr.token}` } }
    );

    const data = await response.json();

    // If there are paid employees, check structure
    const employeeIds = Object.keys(data.status);
    if (employeeIds.length > 0) {
      const firstEmployee = data.status[employeeIds[0]];
      expect('advancePaid' in firstEmployee || 'wagePaid' in firstEmployee).toBe(true);
    }
  });

  // PST-006: Requires PAYROLL_VIEW_ALL
  it('should return 403 without PAYROLL_VIEW_ALL permission', async () => {
    const response = await fetch(
      '/api/payment-requests/paid-status?year=2026&month=2',
      { headers: { Cookie: `token=${testData.users.viewer.token}` } }
    );

    // branch_manager has PAYROLL_VIEW but not PAYROLL_VIEW_ALL
    expect(response.status).toBe(403);
  });
});
```

---

## Running Tests

### Command

```bash
# Run all payment request tests
npm run test -- --grep "payment-requests"

# Run specific test file
npm run test -- __tests__/api/payment-requests/permissions.test.ts

# Run with coverage
npm run test -- --coverage --grep "payment-requests"
```

### Expected Coverage

| File | Target Coverage |
|------|-----------------|
| `src/app/api/payment-requests/[id]/route.ts` | >90% |
| `src/app/api/payment-requests/[id]/notify/route.ts` | >90% |
| `src/app/api/payment-requests/notify-all/route.ts` | >90% |
| `src/app/api/payment-requests/paid-status/route.ts` | >90% |
| `src/lib/db/payments.ts` | >85% |

---

## Manual Test Script

For manual testing via curl:

```bash
#!/bin/bash
# test-payment-apis.sh

BASE_URL="http://localhost:3000"
HR_TOKEN="<hr_jwt_token>"
CEO_TOKEN="<ceo_jwt_token>"
REQUEST_ID="<test_request_id>"
PAID_REQUEST_ID="<paid_request_id>"

echo "=== Testing DELETE endpoint ==="

echo "1. Delete draft (should succeed):"
curl -s -X DELETE "$BASE_URL/api/payment-requests/$REQUEST_ID" \
  -H "Cookie: token=$HR_TOKEN" | jq .

echo "2. Delete paid (should fail):"
curl -s -X DELETE "$BASE_URL/api/payment-requests/$PAID_REQUEST_ID" \
  -H "Cookie: token=$HR_TOKEN" | jq .

echo ""
echo "=== Testing PATCH permissions ==="

echo "3. HR approve (should fail with 403):"
curl -s -X PATCH "$BASE_URL/api/payment-requests/$REQUEST_ID" \
  -H "Cookie: token=$HR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"action":"approve"}' | jq .

echo "4. CEO approve (should succeed):"
curl -s -X PATCH "$BASE_URL/api/payment-requests/$REQUEST_ID" \
  -H "Cookie: token=$CEO_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"action":"approve"}' | jq .

echo ""
echo "=== Testing Bulk Notify validation ==="

echo "5. String year (should fail):"
curl -s -X POST "$BASE_URL/api/payment-requests/notify-all" \
  -H "Cookie: token=$HR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"year":"2026","month":2}' | jq .

echo "6. Invalid month (should fail):"
curl -s -X POST "$BASE_URL/api/payment-requests/notify-all" \
  -H "Cookie: token=$HR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"year":2026,"month":13}' | jq .

echo "7. Valid request (should succeed):"
curl -s -X POST "$BASE_URL/api/payment-requests/notify-all" \
  -H "Cookie: token=$HR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"year":2026,"month":2}' | jq .
```
