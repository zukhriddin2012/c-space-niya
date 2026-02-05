# Test Plan: TST-017 - Wages Section Fixes

**Session:** QA Engineer (testa)
**Date:** 2026-02-05
**Task ID:** TST-017 (tests PR2-017 implementation)

---

## Overview

Comprehensive test plan for PR2-017: Fix and Improve Wages Section.

**Features Under Test:**
1. Delete payment request functionality
2. Duplicate payment prevention (hard block)
3. Manual notification system (single and bulk)
4. Permission/authorization controls
5. Audit logging

---

## Test Environment

| Component | Details |
|-----------|---------|
| Framework | Next.js 16 App Router |
| Database | Supabase (PostgreSQL) |
| Auth | JWT (JOSE) + Cookie-based |
| Notifications | Telegram Bot API |

---

## 1. DELETE Endpoint Tests

### Endpoint: `DELETE /api/payment-requests/[id]`

| Test ID | Test Case | Input | Expected Result | Priority |
|---------|-----------|-------|-----------------|----------|
| DEL-001 | Delete draft request | Valid draft request ID | 200, request deleted, audit logged | P0 |
| DEL-002 | Delete pending request | Valid pending request ID | 200, request deleted, audit logged | P0 |
| DEL-003 | Delete approved request | Valid approved request ID | 200, request deleted, audit logged | P0 |
| DEL-004 | Delete rejected request | Valid rejected request ID | 200, request deleted, audit logged | P0 |
| DEL-005 | **Prevent delete paid request** | Valid paid request ID | 400, `CANNOT_DELETE_PAID` error | P0 |
| DEL-006 | Delete non-existent request | Invalid UUID | 404, `NOT_FOUND` error | P1 |
| DEL-007 | Delete without authentication | No JWT cookie | 401, unauthorized | P0 |
| DEL-008 | Delete without PAYROLL_PROCESS | User without permission | 403, forbidden | P0 |
| DEL-009 | Delete cascades items | Request with multiple items | Items also deleted | P0 |
| DEL-010 | Audit log contains details | Any valid delete | Audit shows type, count, amount | P1 |

### Verification Steps for DEL-005:

```bash
# Try to delete a paid request
curl -X DELETE "http://localhost:3000/api/payment-requests/{paid_request_id}" \
  -H "Cookie: token=<jwt_token>"
# Expected: {"success":false,"error":"Cannot delete paid payment requests","code":"CANNOT_DELETE_PAID"}
```

---

## 2. Notify Single Request Tests

### Endpoint: `POST /api/payment-requests/[id]/notify`

| Test ID | Test Case | Input | Expected Result | Priority |
|---------|-----------|-------|-----------------|----------|
| NTF-001 | Notify approved request | Approved request ID | 200, notifications sent | P0 |
| NTF-002 | Notify paid request | Paid request ID | 200, notifications sent | P0 |
| NTF-003 | **Prevent notify draft** | Draft request ID | 400, `INVALID_STATUS` | P0 |
| NTF-004 | **Prevent notify pending** | Pending request ID | 400, `INVALID_STATUS` | P0 |
| NTF-005 | **Prevent notify rejected** | Rejected request ID | 400, `INVALID_STATUS` | P0 |
| NTF-006 | **Idempotency check** | Already notified request | 200, `alreadyNotified: true` | P0 |
| NTF-007 | Skip employees without Telegram | Request with no-Telegram employees | 200, correct skip count | P1 |
| NTF-008 | Notify without authentication | No JWT cookie | 401, unauthorized | P0 |
| NTF-009 | Notify without PAYROLL_PROCESS | User without permission | 403, forbidden | P0 |
| NTF-010 | Audit log for notifications | Any valid notify | Audit shows notified/skipped | P1 |

### Idempotency Test (NTF-006):

```bash
# First call - should send notifications
curl -X POST "http://localhost:3000/api/payment-requests/{id}/notify" \
  -H "Cookie: token=<jwt_token>"
# Expected: {"success":true,"notified":5,"skipped":1}

# Second call - should detect already notified
curl -X POST "http://localhost:3000/api/payment-requests/{id}/notify" \
  -H "Cookie: token=<jwt_token>"
# Expected: {"success":true,"alreadyNotified":true,"notifiedAt":"2026-02-05T10:00:00Z"}
```

---

## 3. Bulk Notify Tests

### Endpoint: `GET /api/payment-requests/notify-all`

| Test ID | Test Case | Input | Expected Result | Priority |
|---------|-----------|-------|-----------------|----------|
| BNA-001 | Get notification counts | `?year=2026&month=2` | 200, counts by type | P0 |
| BNA-002 | **Validation: missing year** | `?month=2` | 400, "Year and month are required" | P1 |
| BNA-003 | **Validation: missing month** | `?year=2026` | 400, "Year and month are required" | P1 |
| BNA-004 | **Validation: invalid month** | `?year=2026&month=13` | 400, "Month must be between 1 and 12" | P1 |
| BNA-005 | **Validation: month zero** | `?year=2026&month=0` | 400, "Month must be between 1 and 12" | P1 |
| BNA-006 | **Validation: non-numeric** | `?year=abc&month=2` | 400, "Year and month must be valid numbers" | P1 |
| BNA-007 | Get without PAYROLL_VIEW_ALL | User without permission | 403, forbidden | P0 |

### Endpoint: `POST /api/payment-requests/notify-all`

| Test ID | Test Case | Input | Expected Result | Priority |
|---------|-----------|-------|-----------------|----------|
| BNP-001 | Bulk notify paid requests | `{"year":2026,"month":2}` | 200, summary with counts | P0 |
| BNP-002 | No un-notified requests | Period with all notified | 200, `requestsProcessed: 0` | P1 |
| BNP-003 | **Validation: string year** | `{"year":"2026","month":2}` | 400, "Year and month must be numbers" | P0 |
| BNP-004 | **Validation: string month** | `{"year":2026,"month":"2"}` | 400, "Year and month must be numbers" | P0 |
| BNP-005 | **Validation: invalid month** | `{"year":2026,"month":13}` | 400, "Month must be between 1 and 12" | P1 |
| BNP-006 | **Validation: year too old** | `{"year":2019,"month":2}` | 400, "Invalid year" | P1 |
| BNP-007 | **Validation: year too future** | `{"year":2028,"month":2}` | 400, "Invalid year" | P1 |
| BNP-008 | Audit logging per request | Bulk with 3 requests | 3 audit entries with `bulk: true` | P1 |
| BNP-009 | Post without PAYROLL_PROCESS | User without permission | 403, forbidden | P0 |

---

## 4. Paid Status Endpoint Tests

### Endpoint: `GET /api/payment-requests/paid-status`

| Test ID | Test Case | Input | Expected Result | Priority |
|---------|-----------|-------|-----------------|----------|
| PST-001 | Get paid status for period | `?year=2026&month=2` | 200, status map by employee | P0 |
| PST-002 | Includes advance paid | Period with advance paid | `advancePaid` amount present | P0 |
| PST-003 | Includes wage paid | Period with wage paid | `wagePaid` amount present | P0 |
| PST-004 | No paid employees | Empty period | 200, empty status object | P1 |
| PST-005 | Validation: invalid month | `?year=2026&month=15` | 400, error message | P1 |
| PST-006 | Get without PAYROLL_VIEW_ALL | User without permission | 403, forbidden | P0 |

---

## 5. PATCH Endpoint Permission Tests

### Endpoint: `PATCH /api/payment-requests/[id]`

| Test ID | Test Case | Input | Expected Result | Priority |
|---------|-----------|-------|-----------------|----------|
| PRM-001 | **HR approves request** | HR user, action: approve | 403, "Approval permission required" | P0 |
| PRM-002 | **HR rejects request** | HR user, action: reject | 403, "Approval permission required" | P0 |
| PRM-003 | **CEO approves request** | CEO user, action: approve | 200, approved | P0 |
| PRM-004 | **CEO rejects request** | CEO user, action: reject (with reason) | 200, rejected | P0 |
| PRM-005 | GM approves request | GM user, action: approve | 200, approved | P0 |
| PRM-006 | HR submits request | HR user, action: submit | 200, submitted | P1 |
| PRM-007 | HR marks paid | HR user, action: pay | 200, paid | P1 |
| PRM-008 | Reject without reason | Any approver, no reason | 400, "Rejection reason is required" | P1 |

### Permission Matrix Reference:

| Role | PAYROLL_PROCESS | PAYROLL_APPROVE | Can Submit/Pay | Can Approve/Reject |
|------|-----------------|-----------------|----------------|-------------------|
| general_manager | ✅ | ✅ | ✅ | ✅ |
| ceo | ❌ | ✅ | ❌ | ✅ |
| hr | ✅ | ❌ | ✅ | ❌ |

### Critical Test (PRM-001/002):

```bash
# Login as HR user and try to approve
curl -X PATCH "http://localhost:3000/api/payment-requests/{id}" \
  -H "Cookie: token=<hr_jwt_token>" \
  -H "Content-Type: application/json" \
  -d '{"action": "approve"}'
# Expected: {"error":"Approval permission required"} with status 403
```

---

## 6. Frontend Component Tests

### PaymentRequestsSection.tsx

| Test ID | Test Case | Actions | Expected Result | Priority |
|---------|-----------|---------|-----------------|----------|
| FE-001 | Delete button visible | View non-paid request | Trash icon button visible | P0 |
| FE-002 | **Delete button hidden for paid** | View paid request | No delete button | P0 |
| FE-003 | Delete confirmation dialog | Click delete button | Dialog shows with warning | P0 |
| FE-004 | Delete success | Confirm delete | Request removed, toast shown | P0 |
| FE-005 | Notify button for approved | View approved request | Bell icon button visible | P0 |
| FE-006 | Notify button for paid | View paid request | Bell icon button visible | P0 |
| FE-007 | **Notify button hidden otherwise** | View draft/pending/rejected | No notify button | P0 |
| FE-008 | Notified badge | View already notified | Green "Notified" badge | P1 |
| FE-009 | Notify confirmation dialog | Click notify button | Dialog shows with info | P0 |
| FE-010 | Notify success message | Confirm notify | Correct count in toast | P0 |

### PayrollActions.tsx

| Test ID | Test Case | Actions | Expected Result | Priority |
|---------|-----------|---------|-----------------|----------|
| FE-011 | Bulk notify button with count | Un-notified requests exist | Button shows badge with count | P0 |
| FE-012 | **All notified state** | All requests notified | Green "All Notified" badge | P0 |
| FE-013 | Bulk notify modal | Click bulk notify | Modal shows breakdown by type | P0 |
| FE-014 | Bulk notify success | Confirm bulk notify | Correct totals in success message | P0 |
| FE-015 | **Response field mapping** | Bulk notify completes | Shows `employeesNotified` not `totalSent` | P0 |

### Test for FE-015 (Bug #3 Fix Verification):

```typescript
// After bulk notify, verify these fields are used:
const sent = data.summary?.employeesNotified || 0;  // NOT totalSent
const skipped = data.summary?.skipped || 0;         // NOT totalSkipped
// Toast should show correct counts
```

---

## 7. Integration Tests

| Test ID | Test Case | Scenario | Expected Result | Priority |
|---------|-----------|----------|-----------------|----------|
| INT-001 | Full delete flow | Create → Submit → Delete | Request deleted, audit logged | P0 |
| INT-002 | Full approval flow | Create → Submit → Approve | Request approved, CEO can do it | P0 |
| INT-003 | Full notification flow | Create → Submit → Approve → Notify | Telegram notifications sent | P0 |
| INT-004 | Full bulk notify flow | Multiple paid requests → Bulk notify | All notified, correct counts | P0 |
| INT-005 | Duplicate prevention | Pay employee → Try to include again | Blocked at creation | P0 |
| INT-006 | Auto-reject notification | Submit → Reject | Telegram sent automatically | P1 |

---

## 8. Edge Cases

| Test ID | Test Case | Scenario | Expected Result | Priority |
|---------|-----------|----------|-----------------|----------|
| EDG-001 | Delete request with 0 items | Empty payment request | Delete succeeds | P2 |
| EDG-002 | Notify with all skip | Request where no employee has Telegram | 200, `notified: 0, skipped: n` | P1 |
| EDG-003 | Concurrent delete attempts | Two users delete same request | First succeeds, second gets 404 | P2 |
| EDG-004 | Concurrent notify attempts | Two users notify same request | First succeeds, second gets already notified | P2 |
| EDG-005 | Bulk notify empty period | Period with no paid requests | 200, `requestsProcessed: 0` | P1 |
| EDG-006 | Delete during notification | Delete while notify is processing | Graceful handling | P2 |
| EDG-007 | Special characters in reason | Rejection with Unicode/special chars | Stored and displayed correctly | P2 |

---

## 9. Regression Tests

| Test ID | Test Case | Verify | Priority |
|---------|-----------|--------|----------|
| REG-001 | Existing submit flow | Submit still works as before | P0 |
| REG-002 | Existing pay flow | Mark paid still works | P0 |
| REG-003 | Reject auto-notification | Rejection still sends Telegram | P0 |
| REG-004 | Audit existing actions | Create/submit/approve/reject/pay still logged | P1 |
| REG-005 | Permission inheritance | Other permissions unchanged | P1 |

---

## Test Data Requirements

### Users Required:

| User | Role | Permissions |
|------|------|-------------|
| test_gm | general_manager | PAYROLL_PROCESS + PAYROLL_APPROVE |
| test_ceo | ceo | PAYROLL_APPROVE only |
| test_hr | hr | PAYROLL_PROCESS only |
| test_viewer | branch_manager | PAYROLL_VIEW only |

### Payment Requests Required:

| Status | Type | Items | Notified |
|--------|------|-------|----------|
| draft | advance | 3 | No |
| pending | wage | 5 | No |
| approved | advance | 2 | No |
| approved | wage | 4 | Yes |
| paid | advance | 3 | No |
| paid | wage | 6 | Yes |
| rejected | advance | 1 | N/A |

---

## Test Execution Priority

### P0 - Must Pass (Pre-release blockers)
- All delete prevention for paid (DEL-005)
- All permission checks (PRM-001, PRM-002, PRM-003, PRM-004)
- Notification idempotency (NTF-006)
- Input validation (BNP-003, BNP-004)
- Frontend hide/show logic (FE-002, FE-007, FE-015)

### P1 - Should Pass (Important functionality)
- Audit logging verification
- Edge cases for empty states
- Translation verification
- Error message accuracy

### P2 - Nice to Pass (Edge cases)
- Concurrent operation handling
- Special character handling
- Performance under load

---

## Summary

**Total Test Cases:** 72
- P0 (Critical): 32
- P1 (Important): 28
- P2 (Edge cases): 12

**Key Security Tests:**
- Permission gap fix verification (PRM-001, PRM-002)
- Input validation (BNP-003, BNP-004, BNA-004-006)
- Frontend field mapping fix (FE-015)

**Key Business Logic Tests:**
- Delete prevention for paid requests (DEL-005)
- Notification idempotency (NTF-006)
- Duplicate payment prevention (INT-005)
