# PRD-017: Fix and Improve Wages Section

**Status:** Ready for Development
**Priority:** High
**Author:** Product Manager (Claude)
**Created:** 2026-02-05
**Module:** Payroll / Accounting

---

## 1. Problem Statement

The Wages/Payroll section has critical bugs and missing functionality that prevent proper payroll management:

1. **No delete capability** - HR/Accountants cannot remove incorrect or test payment requests
2. **Payment tracking not synced** - The "PAID" column in Employee Wages table doesn't update when payments are made, allowing duplicate payments for the same period
3. **Forced notifications** - Telegram messages are sent automatically on status change to "Paid", with no control over when to notify employees

These issues cause operational problems: inability to correct mistakes, risk of double payments, and premature/unwanted notifications to employees.

---

## 2. User Stories

### US-1: Delete Payment Request
**As an** HR Manager or Accountant
**I want to** delete a payment request that is not yet paid
**So that** I can remove incorrect, duplicate, or test requests

**Acceptance Criteria:**
- Can delete requests in Draft, Pending Approval, Approved, or Rejected status
- Cannot delete requests in "Paid" status (immutable financial record)
- Deletion requires confirmation dialog
- Deleted request items are removed from any pending calculations
- Audit log records who deleted and when

### US-2: Prevent Duplicate Payments
**As an** Accountant
**I want** the system to block creating payment requests for employees already paid that month
**So that** I don't accidentally pay someone twice

**Acceptance Criteria:**
- When creating advance/wage request, system checks if employee has "Paid" request for same period
- If paid advance exists: Block adding to new advance request, show "Already paid X UZS as advance"
- If paid wage exists: Block adding to new wage request, show "Already paid X UZS as wage"
- "PAID" column in Employee Wages table shows sum of all paid amounts for current period
- Paid employees are visually distinguished (grayed out or marked)

### US-3: Manual Telegram Notifications
**As an** Accountant
**I want to** control when Telegram notifications are sent
**So that** I can verify payments before notifying employees

**Acceptance Criteria:**
- Status changes (Approved, Paid) do NOT auto-send Telegram messages
- "Notify Employees" button appears on requests with Approved or Paid status
- Button shows count: "Notify X Employees"
- After notification sent, button changes to "Notified" with timestamp
- Prevents duplicate notifications (disabled after first send)

### US-4: Bulk Notification
**As an** Accountant
**I want to** notify all employees about their paid requests at once
**So that** I can send notifications efficiently after batch payments

**Acceptance Criteria:**
- "Notify All Paid" button on Payroll dashboard for current period
- Shows count of un-notified paid requests
- Sends notifications only to employees in Paid requests that haven't been notified
- Summary shows: "Sent X notifications for Advance, Y for Wages"

---

## 3. Requirements

### 3.1 Functional Requirements

#### FR-1: Delete Payment Request (Priority: P0 - Critical)

| ID | Requirement | Notes |
|----|-------------|-------|
| FR-1.1 | Add DELETE endpoint to `/api/payment-requests/[id]` | Return 400 if status is "paid" |
| FR-1.2 | Add delete button to payment request detail view | Show only for non-paid requests |
| FR-1.3 | Implement confirmation dialog before delete | "Delete payment request for X employees totaling Y UZS?" |
| FR-1.4 | Cascade delete payment_request_items | On parent delete |
| FR-1.5 | Log deletion in audit trail | User, timestamp, request details |

#### FR-2: Duplicate Payment Prevention (Priority: P0 - Critical)

| ID | Requirement | Notes |
|----|-------------|-------|
| FR-2.1 | Add `getEmployeePaidStatus(year, month)` DB function | Returns map of {employeeId: {advancePaid, wagePaid}} |
| FR-2.2 | Block adding employee to request if already paid | Check at create request time |
| FR-2.3 | Update "PAID" column to show actual paid amounts | Query payment_request_items with status=paid |
| FR-2.4 | Gray out or mark employees already paid | In Employee Wages table |
| FR-2.5 | Show tooltip "Paid X UZS on [date]" for paid employees | Hover info |

#### FR-3: Manual Notifications (Priority: P1 - High)

| ID | Requirement | Notes |
|----|-------------|-------|
| FR-3.1 | Remove auto-notification from PATCH status changes | Comment out current telegram calls |
| FR-3.2 | Add `notification_sent_at` column to payment_requests | Track notification status |
| FR-3.3 | Add "Notify Employees" button to request detail | Visible for Approved/Paid |
| FR-3.4 | Create `/api/payment-requests/[id]/notify` endpoint | POST to trigger notifications |
| FR-3.5 | Disable button after notification sent | Show "Notified on [datetime]" |

#### FR-4: Bulk Notifications (Priority: P2 - Medium)

| ID | Requirement | Notes |
|----|-------------|-------|
| FR-4.1 | Add "Notify All Paid" button to Payroll dashboard | Shows un-notified count |
| FR-4.2 | Create `/api/payment-requests/notify-all` endpoint | Takes year, month params |
| FR-4.3 | Filter to only Paid requests without notification_sent_at | Prevent duplicates |
| FR-4.4 | Show summary after bulk send | "Notified X employees" |

### 3.2 Non-Functional Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| NFR-1 | Deletion should complete in <500ms | P2 |
| NFR-2 | Duplicate check should not slow down page load >200ms | P1 |
| NFR-3 | Bulk notifications should handle 200 employees without timeout | P1 |
| NFR-4 | All new UI text must have EN/RU/UZ translations | P1 |

---

## 4. Technical Approach

### Database Changes
```sql
-- Add notification tracking to payment_requests
ALTER TABLE payment_requests
ADD COLUMN notification_sent_at TIMESTAMPTZ,
ADD COLUMN notification_sent_by UUID REFERENCES users(id);
```

### API Changes

| Endpoint | Method | Change |
|----------|--------|--------|
| `/api/payment-requests/[id]` | DELETE | New - delete non-paid requests |
| `/api/payment-requests/[id]` | PATCH | Modify - remove auto-notifications |
| `/api/payment-requests/[id]/notify` | POST | New - send notifications |
| `/api/payment-requests/notify-all` | POST | New - bulk notifications |

### Files to Modify
- `src/lib/db/payments.ts` - Add delete, paid status, notification functions
- `src/app/api/payment-requests/[id]/route.ts` - Add DELETE, modify PATCH
- `src/app/api/payment-requests/[id]/notify/route.ts` - New file
- `src/app/api/payment-requests/notify-all/route.ts` - New file
- `src/app/(dashboard)/payroll/page.tsx` - Add delete button, notify buttons
- `src/components/payroll/` - UI components for new features
- `src/lib/i18n/*.ts` - Translation keys

---

## 5. Prioritized Implementation Order

| Order | Feature | Est. Effort | Business Value | Risk |
|-------|---------|-------------|----------------|------|
| 1 | FR-2: Duplicate Prevention | 4h | Critical - prevents financial errors | High |
| 2 | FR-1: Delete Request | 2h | Critical - enables corrections | Medium |
| 3 | FR-3: Manual Notifications | 3h | High - user control | Low |
| 4 | FR-4: Bulk Notifications | 2h | Medium - efficiency | Low |

**Total Estimated Effort:** ~11 hours (1.5 dev days)

---

## 6. Success Metrics

| Metric | Current | Target |
|--------|---------|--------|
| Duplicate payment incidents | Unknown | 0 |
| Support tickets for "can't delete request" | Blocking | 0 |
| Premature notification complaints | Exists | 0 |

---

## 7. Out of Scope

- Partial deletion of request items (delete full request only)
- Undo/restore deleted requests
- Notification scheduling (send at specific time)
- Email notifications (Telegram only)

---

## 8. Open Questions

1. ~~Which statuses should allow deletion?~~ **Resolved:** All except Paid
2. ~~Should blocking be hard or soft (warning)?~~ **Resolved:** Hard block
3. ~~When should Notify button appear?~~ **Resolved:** After Approved or Paid
4. ~~Per-request or bulk notifications?~~ **Resolved:** Both options

---

## 9. Approval

| Role | Name | Date | Status |
|------|------|------|--------|
| Product Manager | Claude | 2026-02-05 | Drafted |
| Tech Lead | | | Pending |
| Stakeholder | Zuhriddin | | Pending |
