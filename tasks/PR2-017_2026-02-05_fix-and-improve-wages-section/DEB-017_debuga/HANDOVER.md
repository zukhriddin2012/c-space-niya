# Session Handover: DEB-017 - Bug Hunting & Fixes for Wages Section

**Session:** Bug Hunter (debuga)
**Date:** 2026-02-05
**Task ID:** DEB-017 (reviews PR2-017 implementation)

---

## Summary

Fixed **3 bugs** identified during security review and code inspection:
- 1 Medium security issue (permission gap)
- 1 Low validation issue
- 1 Frontend API response mapping bug

---

## Bugs Fixed

### Bug #1: MEDIUM - Approve/Reject Permission Gap (SEC-017 Finding #1)

**File:** `src/app/api/payment-requests/[id]/route.ts`

**Problem:** The PATCH endpoint allowed users with `PAYROLL_PROCESS` permission to approve/reject payment requests, but those actions should require `PAYROLL_APPROVE` permission. This meant HR users could approve their own payment requests.

**Fix:** Added explicit `hasPermission()` check for `PAYROLL_APPROVE` in both `approve` and `reject` cases.

```typescript
// Before
case 'approve': {
  const result = await approvePaymentRequest(id, user.id);
  // ...
}

// After
case 'approve': {
  // Check PAYROLL_APPROVE permission for approve action
  if (!hasPermission(user.role, PERMISSIONS.PAYROLL_APPROVE)) {
    return NextResponse.json({ error: 'Approval permission required' }, { status: 403 });
  }
  const result = await approvePaymentRequest(id, user.id);
  // ...
}
```

**Impact:** Prevents unauthorized approvals/rejections.

---

### Bug #2: LOW - Type Validation Missing in Bulk Notify (SEC-017 Finding #2)

**File:** `src/app/api/payment-requests/notify-all/route.ts`

**Problem:** The POST endpoint accepted `year` and `month` from the request body without type validation. If strings were passed, they would be truthy but could cause unexpected behavior.

**Fix:** Added comprehensive validation for both GET and POST endpoints:
- Type checking (must be numbers)
- Range checking (month 1-12)
- Year reasonability check (2020 to current year + 1)

```typescript
// Added validation
if (typeof year !== 'number' || typeof month !== 'number') {
  return NextResponse.json({ error: 'Year and month must be numbers' }, { status: 400 });
}
if (month < 1 || month > 12) {
  return NextResponse.json({ error: 'Month must be between 1 and 12' }, { status: 400 });
}
```

**Impact:** Prevents invalid data from reaching database queries.

---

### Bug #3: LOW - Frontend API Response Field Mapping

**File:** `src/app/(dashboard)/payroll/PayrollActions.tsx`

**Problem:** The bulk notify response handler was reading wrong field names from the API response:
```typescript
// Bug: API returns employeesNotified/skipped, not totalSent/totalSkipped
const sent = data.summary?.totalSent || 0;       // Wrong!
const skipped = data.summary?.totalSkipped || 0; // Wrong!
```

**Fix:** Corrected field names to match API response:
```typescript
const sent = data.summary?.employeesNotified || 0;
const skipped = data.summary?.skipped || 0;
```

**Impact:** Notification success message now shows correct counts.

---

## Files Changed

| File | Changes |
|------|---------|
| `src/app/api/payment-requests/[id]/route.ts` | Added `hasPermission` import, added PAYROLL_APPROVE check for approve/reject |
| `src/app/api/payment-requests/notify-all/route.ts` | Added type and range validation for year/month in both GET and POST |
| `src/app/(dashboard)/payroll/PayrollActions.tsx` | Fixed API response field names in bulk notify handler |

---

## Testing Performed

- Verified brace matching in all modified files
- Code review of changes for correctness
- No TypeScript compilation errors introduced

---

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| Added both approve/reject checks | Both actions require approval authority |
| Year range 2020 to current+1 | Reasonable business constraint |
| Fixed GET validation too | Consistency with POST endpoint |

---

## Not Fixed (Deferred)

### Finding #3 from SEC-017: Rate Limiting

**Reason:** Low priority, already mitigated by:
- Permission requirements (limited users)
- Idempotency check (notification_sent_at)
- Audit logging

**Recommendation:** Add application-level rate limiting in a future sprint.

---

## Code Quality Notes

1. **Type casting in notify endpoint:** The code uses `(paymentRequest as any).notification_sent_at` - this is a workaround for incomplete TypeScript types. The `PaymentRequest` interface should be updated to include `notification_sent_at` and `notification_sent_by` fields.

2. **API response consistency:** All new endpoints follow consistent response patterns with `success`, `error`, and `code` fields.

---

## Blockers

None. All critical bugs fixed.

---

## Verification Commands

To verify the fixes work correctly, test these scenarios:

1. **Permission Check:**
   - Login as HR user (has PAYROLL_PROCESS but not PAYROLL_APPROVE)
   - Try to approve a payment request
   - Should get 403 "Approval permission required"

2. **Validation Check:**
   - Call POST `/api/payment-requests/notify-all` with `{ year: "2026", month: "2" }`
   - Should get 400 "Year and month must be numbers"

3. **Frontend Check:**
   - Click "Notify All Paid" button
   - Verify notification count shows correctly in success message
