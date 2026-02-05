# ARC-017: Architecture Specification
## Wages Section Fixes

**Version:** 1.0
**Author:** Platform Architect (Claude)
**Date:** 2026-02-05
**Based on:** PRD-017, DES-017

---

## 1. Overview

This document defines the technical architecture for implementing the wages section fixes:
1. **Delete Payment Request** - Hard delete with cascade
2. **Duplicate Payment Prevention** - Query optimization and blocking logic
3. **Manual Notifications** - New columns and API endpoints
4. **Bulk Notifications** - Batch processing endpoint

---

## 2. Database Architecture

### 2.1 Existing Schema (Reference)

```sql
-- Current payment_requests table (from 20240120_payment_requests.sql)
payment_requests (
  id UUID PRIMARY KEY,
  request_type VARCHAR(20),  -- 'advance' | 'wage'
  year INTEGER,
  month INTEGER,
  legal_entity_id VARCHAR(50),
  total_amount DECIMAL(15,2),
  employee_count INTEGER,
  status VARCHAR(20),  -- 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'paid'
  created_by VARCHAR(50),
  submitted_at TIMESTAMPTZ,
  approved_by VARCHAR(50),
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  paid_at TIMESTAMPTZ,
  payment_reference VARCHAR(100),
  notes TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)

-- payment_request_items (has ON DELETE CASCADE)
payment_request_items (
  id UUID PRIMARY KEY,
  payment_request_id UUID REFERENCES payment_requests(id) ON DELETE CASCADE,
  employee_id UUID,
  legal_entity_id VARCHAR(50),
  amount DECIMAL(15,2),
  net_salary DECIMAL(15,2),
  advance_paid DECIMAL(15,2),
  notes TEXT,
  created_at TIMESTAMPTZ
)
```

### 2.2 New Migration Required

**File:** `supabase/migrations/20260205_payment_request_notifications.sql`

```sql
-- =====================================================
-- Migration: Add notification tracking to payment_requests
-- Task: PR2-017 - Wages Section Fixes
-- Date: 2026-02-05
-- =====================================================

-- Add notification tracking columns
ALTER TABLE payment_requests
ADD COLUMN IF NOT EXISTS notification_sent_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS notification_sent_by UUID;

-- Add audit tracking columns for deletion
ALTER TABLE payment_requests
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS deleted_by UUID;

-- Create payment_request_audit table for tracking history
CREATE TABLE IF NOT EXISTS payment_request_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_request_id UUID NOT NULL,  -- No FK constraint to allow logging deleted requests

  actor_id UUID NOT NULL,
  action VARCHAR(50) NOT NULL,  -- 'created' | 'submitted' | 'approved' | 'rejected' | 'paid' | 'notified' | 'deleted'

  -- For status changes
  old_status VARCHAR(20),
  new_status VARCHAR(20),

  -- Additional context
  details JSONB,  -- Store employee_count, total_amount, reason, etc.

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for audit table
CREATE INDEX IF NOT EXISTS idx_pr_audit_request ON payment_request_audit(payment_request_id);
CREATE INDEX IF NOT EXISTS idx_pr_audit_action ON payment_request_audit(action);
CREATE INDEX IF NOT EXISTS idx_pr_audit_created ON payment_request_audit(created_at DESC);

-- Index for notification queries
CREATE INDEX IF NOT EXISTS idx_pr_notification ON payment_requests(notification_sent_at)
  WHERE status = 'paid';

-- Index for paid status queries (duplicate prevention)
CREATE INDEX IF NOT EXISTS idx_pr_paid_period ON payment_requests(year, month, status)
  WHERE status = 'paid';

-- Comment on new columns
COMMENT ON COLUMN payment_requests.notification_sent_at IS 'Timestamp when Telegram notifications were sent to employees';
COMMENT ON COLUMN payment_requests.notification_sent_by IS 'User ID who triggered the notification';
COMMENT ON COLUMN payment_requests.deleted_at IS 'Soft delete timestamp (if used) - otherwise hard delete';
COMMENT ON COLUMN payment_requests.deleted_by IS 'User ID who deleted the request';
```

### 2.3 Data Model Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     payment_requests                         │
├─────────────────────────────────────────────────────────────┤
│ id                    UUID (PK)                              │
│ request_type          'advance' | 'wage'                     │
│ year, month           INTEGER                                │
│ status                workflow states                        │
│ notification_sent_at  TIMESTAMPTZ (NEW)                      │
│ notification_sent_by  UUID (NEW)                             │
│ deleted_at            TIMESTAMPTZ (NEW - optional)           │
│ deleted_by            UUID (NEW - optional)                  │
└───────────────────────────┬─────────────────────────────────┘
                            │ 1:N (CASCADE DELETE)
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   payment_request_items                      │
├─────────────────────────────────────────────────────────────┤
│ id                    UUID (PK)                              │
│ payment_request_id    UUID (FK → payment_requests)           │
│ employee_id           UUID                                   │
│ amount                DECIMAL                                │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                   payment_request_audit                      │
├─────────────────────────────────────────────────────────────┤
│ id                    UUID (PK)                              │
│ payment_request_id    UUID (no FK - allows deleted refs)     │
│ actor_id              UUID                                   │
│ action                VARCHAR(50)                            │
│ old_status            VARCHAR(20)                            │
│ new_status            VARCHAR(20)                            │
│ details               JSONB                                  │
│ created_at            TIMESTAMPTZ                            │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. API Architecture

### 3.1 Endpoint Overview

| Endpoint | Method | Action | Auth |
|----------|--------|--------|------|
| `/api/payment-requests/[id]` | DELETE | Delete request (non-paid only) | PAYROLL_PROCESS |
| `/api/payment-requests/[id]` | PATCH | Status changes (remove auto-notify) | PAYROLL_PROCESS |
| `/api/payment-requests/[id]/notify` | POST | Send notifications | PAYROLL_PROCESS |
| `/api/payment-requests/notify-all` | POST | Bulk send notifications | PAYROLL_PROCESS |
| `/api/payment-requests/paid-status` | GET | Get paid employees for period | PAYROLL_VIEW_ALL |

### 3.2 DELETE /api/payment-requests/[id]

**Purpose:** Hard delete a payment request (items cascade automatically)

**Request:**
```http
DELETE /api/payment-requests/{id}
Authorization: Bearer {token}
```

**Business Rules:**
1. Cannot delete if `status = 'paid'` → Return 400
2. Log deletion to `payment_request_audit` BEFORE deleting
3. Items are automatically cascade deleted via FK constraint

**Response (Success):**
```json
{
  "success": true,
  "message": "Payment request deleted successfully",
  "deletedRequest": {
    "id": "uuid",
    "request_type": "wage",
    "employee_count": 5,
    "total_amount": 25000000
  }
}
```

**Response (Error - Paid Status):**
```json
{
  "success": false,
  "error": "Cannot delete paid payment request",
  "code": "CANNOT_DELETE_PAID"
}
```

**Implementation Pseudocode:**
```typescript
export async function DELETE(request, { params }) {
  const user = await getSession();
  if (!hasPermission(user.role, PERMISSIONS.PAYROLL_PROCESS)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { id } = params;

  // 1. Fetch request to validate and log
  const { data: paymentRequest } = await supabaseAdmin
    .from('payment_requests')
    .select('*')
    .eq('id', id)
    .single();

  if (!paymentRequest) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  // 2. Check if paid
  if (paymentRequest.status === 'paid') {
    return NextResponse.json({
      success: false,
      error: 'Cannot delete paid payment request',
      code: 'CANNOT_DELETE_PAID'
    }, { status: 400 });
  }

  // 3. Log to audit BEFORE delete
  await supabaseAdmin.from('payment_request_audit').insert({
    payment_request_id: id,
    actor_id: user.id,
    action: 'deleted',
    old_status: paymentRequest.status,
    new_status: null,
    details: {
      request_type: paymentRequest.request_type,
      employee_count: paymentRequest.employee_count,
      total_amount: paymentRequest.total_amount,
      year: paymentRequest.year,
      month: paymentRequest.month
    }
  });

  // 4. Hard delete (items cascade automatically)
  const { error } = await supabaseAdmin
    .from('payment_requests')
    .delete()
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    message: 'Payment request deleted successfully',
    deletedRequest: {
      id,
      request_type: paymentRequest.request_type,
      employee_count: paymentRequest.employee_count,
      total_amount: paymentRequest.total_amount
    }
  });
}
```

### 3.3 POST /api/payment-requests/[id]/notify

**Purpose:** Send Telegram notifications for a single payment request

**Request:**
```http
POST /api/payment-requests/{id}/notify
Authorization: Bearer {token}
```

**Business Rules:**
1. Only for `status = 'approved'` or `status = 'paid'`
2. Set `notification_sent_at` and `notification_sent_by`
3. Cannot re-notify if already notified (return info, not error)
4. Use existing notification functions

**Response (Success):**
```json
{
  "success": true,
  "notified": 5,
  "skipped": 2,
  "message": "Notifications sent to 5 employees (2 skipped - no Telegram)"
}
```

**Response (Already Notified):**
```json
{
  "success": true,
  "alreadyNotified": true,
  "notifiedAt": "2026-02-05T10:30:00Z",
  "message": "Notifications were already sent on Feb 5, 2026"
}
```

**Implementation Pseudocode:**
```typescript
export async function POST(request, { params }) {
  const user = await getSession();
  const { id } = params;

  // 1. Fetch request
  const { data: paymentRequest } = await supabaseAdmin
    .from('payment_requests')
    .select('*')
    .eq('id', id)
    .single();

  // 2. Validate status
  if (!['approved', 'paid'].includes(paymentRequest.status)) {
    return NextResponse.json({
      error: 'Can only notify for approved or paid requests'
    }, { status: 400 });
  }

  // 3. Check if already notified
  if (paymentRequest.notification_sent_at) {
    return NextResponse.json({
      success: true,
      alreadyNotified: true,
      notifiedAt: paymentRequest.notification_sent_at,
      message: `Notifications were already sent`
    });
  }

  // 4. Get items with telegram IDs
  const items = await getPaymentRequestItemsWithTelegram(id);

  // 5. Send notifications (use existing functions)
  let notified = 0;
  let skipped = 0;

  for (const item of items) {
    if (!item.telegram_id) {
      skipped++;
      continue;
    }

    const success = paymentRequest.status === 'paid'
      ? await notifyPaymentPaid({ ... })
      : await notifyPaymentApproved({ ... });

    if (success) notified++;
    else skipped++;
  }

  // 6. Update notification timestamp
  await supabaseAdmin
    .from('payment_requests')
    .update({
      notification_sent_at: new Date().toISOString(),
      notification_sent_by: user.id
    })
    .eq('id', id);

  // 7. Log to audit
  await supabaseAdmin.from('payment_request_audit').insert({
    payment_request_id: id,
    actor_id: user.id,
    action: 'notified',
    details: { notified, skipped, total: items.length }
  });

  return NextResponse.json({
    success: true,
    notified,
    skipped,
    message: `Notifications sent to ${notified} employees`
  });
}
```

### 3.4 POST /api/payment-requests/notify-all

**Purpose:** Bulk send notifications for all un-notified paid requests in a period

**Request:**
```http
POST /api/payment-requests/notify-all
Authorization: Bearer {token}
Content-Type: application/json

{
  "year": 2026,
  "month": 1
}
```

**Response:**
```json
{
  "success": true,
  "summary": {
    "requestsProcessed": 3,
    "advanceRequests": 1,
    "wageRequests": 2,
    "employeesNotified": 16,
    "skipped": 4
  },
  "message": "Notified 16 employees across 3 requests"
}
```

**Implementation Pseudocode:**
```typescript
export async function POST(request) {
  const user = await getSession();
  const { year, month } = await request.json();

  // 1. Get all paid, un-notified requests for period
  const { data: requests } = await supabaseAdmin
    .from('payment_requests')
    .select('id, request_type')
    .eq('year', year)
    .eq('month', month)
    .eq('status', 'paid')
    .is('notification_sent_at', null);

  if (!requests?.length) {
    return NextResponse.json({
      success: true,
      message: 'No un-notified paid requests found'
    });
  }

  // 2. Process each request
  let totalNotified = 0;
  let totalSkipped = 0;
  let advanceCount = 0;
  let wageCount = 0;

  for (const req of requests) {
    // Call single notify logic for each
    const result = await notifySingleRequest(req.id, user.id);
    totalNotified += result.notified;
    totalSkipped += result.skipped;

    if (req.request_type === 'advance') advanceCount++;
    else wageCount++;
  }

  return NextResponse.json({
    success: true,
    summary: {
      requestsProcessed: requests.length,
      advanceRequests: advanceCount,
      wageRequests: wageCount,
      employeesNotified: totalNotified,
      skipped: totalSkipped
    }
  });
}
```

### 3.5 GET /api/payment-requests/paid-status

**Purpose:** Get paid status for all employees in a period (for duplicate prevention UI)

**Request:**
```http
GET /api/payment-requests/paid-status?year=2026&month=1
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "period": { "year": 2026, "month": 1 },
  "paidEmployees": {
    "employee-uuid-1": {
      "advancePaid": 4000000,
      "advancePaidAt": "2026-01-15T10:00:00Z",
      "wagePaid": null,
      "wagePaidAt": null
    },
    "employee-uuid-2": {
      "advancePaid": 5000000,
      "advancePaidAt": "2026-01-12T14:30:00Z",
      "wagePaid": 5000000,
      "wagePaidAt": "2026-01-20T09:00:00Z"
    }
  }
}
```

**Implementation:**
```typescript
// Database function in payments.ts
export async function getEmployeePaidStatus(year: number, month: number) {
  // Get all paid payment_request_items for the period
  const { data } = await supabaseAdmin
    .from('payment_request_items')
    .select(`
      employee_id,
      amount,
      payment_requests!inner (
        request_type,
        paid_at,
        status
      )
    `)
    .eq('payment_requests.year', year)
    .eq('payment_requests.month', month)
    .eq('payment_requests.status', 'paid');

  // Transform to map
  const result: Record<string, PaidStatus> = {};

  for (const item of data || []) {
    const empId = item.employee_id;
    if (!result[empId]) {
      result[empId] = {
        advancePaid: null,
        advancePaidAt: null,
        wagePaid: null,
        wagePaidAt: null
      };
    }

    if (item.payment_requests.request_type === 'advance') {
      result[empId].advancePaid = (result[empId].advancePaid || 0) + item.amount;
      result[empId].advancePaidAt = item.payment_requests.paid_at;
    } else {
      result[empId].wagePaid = (result[empId].wagePaid || 0) + item.amount;
      result[empId].wagePaidAt = item.payment_requests.paid_at;
    }
  }

  return result;
}
```

---

## 4. Modification to Existing PATCH Endpoint

### 4.1 Remove Auto-Notifications

**File:** `src/app/api/payment-requests/[id]/route.ts`

**Current behavior (lines to modify):**
```typescript
// REMOVE these async notification calls:
case 'approve':
  // ... status update logic ...
  sendApproveNotifications(id).catch(err => console.error(err));  // ❌ REMOVE
  break;

case 'reject':
  // ... status update logic ...
  sendRejectNotifications(id).catch(err => console.error(err));  // ❌ REMOVE
  break;

case 'pay':
  // ... status update logic ...
  sendPayNotifications(id).catch(err => console.error(err));  // ❌ REMOVE
  break;
```

**New behavior:**
- Status changes happen WITHOUT automatic notifications
- User manually triggers via `/notify` endpoint
- Exception: `reject` action SHOULD still auto-notify (user needs immediate feedback)

**Recommended Change:**
```typescript
case 'approve':
  // Status update only - NO notification
  // User will manually trigger via Notify button
  break;

case 'reject':
  // Rejection should still auto-notify (employee needs to know immediately)
  sendRejectNotifications(id).catch(err => console.error(err));  // ✅ KEEP
  break;

case 'pay':
  // Status update only - NO notification
  // User will manually trigger via Notify button
  break;
```

---

## 5. Duplicate Prevention Logic

### 5.1 Frontend Check (UI Blocking)

The UI should:
1. Call `GET /api/payment-requests/paid-status?year={}&month={}`
2. For each employee row, check if they have paid advance/wage
3. If paid: Gray out row, show "Blocked", display paid amount in PAID column

### 5.2 Backend Validation (API Blocking)

**Modify `createPaymentRequest` in `src/lib/db/payments.ts`:**

```typescript
export async function createPaymentRequest(params) {
  const { request_type, year, month, items } = params;

  // 1. Get paid status for period
  const paidStatus = await getEmployeePaidStatus(year, month);

  // 2. Filter out already-paid employees
  const blockedEmployees = [];
  const validItems = items.filter(item => {
    const status = paidStatus[item.employee_id];

    if (request_type === 'advance' && status?.advancePaid) {
      blockedEmployees.push({
        employee_id: item.employee_id,
        reason: `Already paid ${status.advancePaid} UZS as advance`
      });
      return false;
    }

    if (request_type === 'wage' && status?.wagePaid) {
      blockedEmployees.push({
        employee_id: item.employee_id,
        reason: `Already paid ${status.wagePaid} UZS as wage`
      });
      return false;
    }

    return true;
  });

  // 3. If all items blocked, return error
  if (validItems.length === 0) {
    return {
      success: false,
      error: 'All employees already paid for this period',
      blockedEmployees
    };
  }

  // 4. If some blocked, return warning with proceeding
  // (Or hard block - based on PRD decision: HARD BLOCK)
  if (blockedEmployees.length > 0) {
    return {
      success: false,
      error: `${blockedEmployees.length} employees already paid`,
      blockedEmployees
    };
  }

  // 5. Continue with normal creation...
}
```

---

## 6. Type Definitions

**File:** `src/types/payroll.ts` (new or extend existing)

```typescript
// Paid status for duplicate prevention
export interface EmployeePaidStatus {
  advancePaid: number | null;
  advancePaidAt: string | null;
  wagePaid: number | null;
  wagePaidAt: string | null;
}

export type PaidStatusMap = Record<string, EmployeePaidStatus>;

// Notification response
export interface NotifyResponse {
  success: boolean;
  notified?: number;
  skipped?: number;
  alreadyNotified?: boolean;
  notifiedAt?: string;
  message: string;
}

// Bulk notify response
export interface BulkNotifyResponse {
  success: boolean;
  summary?: {
    requestsProcessed: number;
    advanceRequests: number;
    wageRequests: number;
    employeesNotified: number;
    skipped: number;
  };
  message: string;
}

// Delete response
export interface DeleteResponse {
  success: boolean;
  error?: string;
  code?: string;
  deletedRequest?: {
    id: string;
    request_type: string;
    employee_count: number;
    total_amount: number;
  };
  message?: string;
}

// Audit log entry
export interface PaymentRequestAudit {
  id: string;
  payment_request_id: string;
  actor_id: string;
  action: 'created' | 'submitted' | 'approved' | 'rejected' | 'paid' | 'notified' | 'deleted';
  old_status?: string;
  new_status?: string;
  details?: Record<string, unknown>;
  created_at: string;
}
```

---

## 7. File Changes Summary

| File | Action | Description |
|------|--------|-------------|
| `supabase/migrations/20260205_payment_request_notifications.sql` | CREATE | New migration with columns and audit table |
| `src/app/api/payment-requests/[id]/route.ts` | MODIFY | Add DELETE handler, remove auto-notify from PATCH |
| `src/app/api/payment-requests/[id]/notify/route.ts` | CREATE | New endpoint for single request notification |
| `src/app/api/payment-requests/notify-all/route.ts` | CREATE | New endpoint for bulk notifications |
| `src/app/api/payment-requests/paid-status/route.ts` | CREATE | New endpoint for duplicate prevention query |
| `src/lib/db/payments.ts` | MODIFY | Add `getEmployeePaidStatus()`, `deletePaymentRequest()`, `logPaymentAudit()` |
| `src/types/payroll.ts` | CREATE/MODIFY | Add new type definitions |

---

## 8. Architecture Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Delete approach** | Hard delete | Cascade FK already exists; audit table preserves history |
| **Audit table FK** | No FK constraint | Allows logging deleted request info without orphaning |
| **Notification tracking** | Column on parent | Simpler than separate tracking table for single action |
| **Duplicate check** | Both UI + API | UI for UX, API for security (can't trust frontend) |
| **Rejection auto-notify** | Keep enabled | Employee needs immediate feedback on rejection |
| **Bulk notify** | Sequential processing | Simpler error handling, can parallelize later if needed |

---

## 9. Performance Considerations

1. **New indexes added:**
   - `idx_pr_notification` - Fast lookup of un-notified paid requests
   - `idx_pr_paid_period` - Fast duplicate prevention queries

2. **Query optimization:**
   - `getEmployeePaidStatus` uses single JOIN query, not N+1
   - Bulk notify processes sequentially to avoid rate limits

3. **Expected performance:**
   - Delete: <100ms (single row + cascade)
   - Paid status: <200ms (indexed query)
   - Single notify: ~500ms (N telegram calls)
   - Bulk notify: ~50ms per request

---

## 10. Security Considerations

1. **All endpoints require authentication** via `withAuth` middleware
2. **Permission check:** `PAYROLL_PROCESS` for mutations, `PAYROLL_VIEW_ALL` for queries
3. **Audit logging:** All destructive actions logged before execution
4. **Input validation:** Year/month validated as integers, UUID format enforced
5. **Rate limiting:** Consider adding rate limit to notification endpoints (future)
