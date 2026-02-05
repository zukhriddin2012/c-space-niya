# Session Handover: SEC-017 - Security Review for Wages Section Fixes

**Session:** Security Analyst (secura)
**Date:** 2026-02-05
**Task ID:** SEC-017 (reviews PR2-017 implementation)

---

## Summary

**Overall Risk Assessment: LOW**

The implementation follows good security practices. A few minor improvements are recommended but no critical vulnerabilities were identified.

---

## Files Reviewed

| File | Purpose |
|------|---------|
| `src/app/api/payment-requests/[id]/route.ts` | DELETE, PATCH endpoints |
| `src/app/api/payment-requests/[id]/notify/route.ts` | Single request notifications |
| `src/app/api/payment-requests/notify-all/route.ts` | Bulk notifications |
| `src/app/api/payment-requests/paid-status/route.ts` | Paid status query |
| `src/lib/db/payments.ts` | Database functions |
| `src/lib/api-auth.ts` | Authentication middleware |
| `src/lib/permissions.ts` | Authorization system |

---

## Security Findings

### 1. Authentication & Authorization ✅ PASS

All new endpoints properly use the `withAuth` middleware:

| Endpoint | Method | Permission Required | Status |
|----------|--------|---------------------|--------|
| `/api/payment-requests/[id]` | DELETE | `PAYROLL_PROCESS` | ✅ |
| `/api/payment-requests/[id]` | PATCH | `PAYROLL_PROCESS` | ⚠️ See Finding #1 |
| `/api/payment-requests/[id]/notify` | POST | `PAYROLL_PROCESS` | ✅ |
| `/api/payment-requests/notify-all` | GET | `PAYROLL_VIEW_ALL` | ✅ |
| `/api/payment-requests/notify-all` | POST | `PAYROLL_PROCESS` | ✅ |
| `/api/payment-requests/paid-status` | GET | `PAYROLL_VIEW_ALL` | ✅ |

**Verified:**
- JWT token verification in cookies
- Role-based permission checks
- 401/403 responses for unauthorized access

---

### 2. SQL Injection Prevention ✅ PASS

All database queries use Supabase's query builder with parameterized queries:

```typescript
// Example from deletePaymentRequest - SAFE
await supabaseAdmin!
  .from('payment_requests')
  .delete()
  .eq('id', id);  // id is parameterized
```

**No raw SQL with string interpolation detected.**

---

### 3. Input Validation ⚠️ PARTIAL

| Endpoint | Validation | Status |
|----------|-----------|--------|
| GET paid-status | `parseInt()` + range check (1-12) | ✅ |
| POST notify-all | Year/month from body, no type check | ⚠️ See Finding #2 |
| DELETE | ID from params, existence check | ✅ |
| PATCH | Action validated against enum | ✅ |

---

### 4. Data Exposure ✅ PASS

- Deleted request returns minimal metadata (type, count, amount) - acceptable for admin feedback
- Error messages are generic, don't leak internal details
- Sensitive employee data (Telegram IDs) not exposed in responses

---

### 5. Audit Logging ✅ EXCELLENT

All critical actions properly logged to `payment_request_audit`:

| Action | Logged Data | Status |
|--------|-------------|--------|
| Delete | Full request details before deletion | ✅ |
| Notify | Count notified/skipped | ✅ |
| Bulk Notify | Per-request counts, marked as bulk | ✅ |

**Actor ID tracked in all cases.**

---

### 6. Business Logic Security ✅ PASS

- **Cannot delete paid requests** - Enforced at database function level
- **Notification idempotency** - `notification_sent_at` prevents duplicate sends
- **Rate limiting for bulk** - Sequential processing prevents Telegram API abuse

---

## Findings & Recommendations

### Finding #1: MEDIUM - Approve/Reject Permission Gap

**Location:** `src/app/api/payment-requests/[id]/route.ts` line 104-107

**Issue:** The PATCH endpoint uses `PAYROLL_PROCESS` permission for all actions, but approve/reject should require `PAYROLL_APPROVE`. The comment acknowledges this but says "we'll validate in the db functions" - however, no such validation exists.

**Impact:** Users with `PAYROLL_PROCESS` but not `PAYROLL_APPROVE` (e.g., HR role) could potentially approve/reject payment requests.

**Current State:** Looking at permissions.ts, HR role has `PAYROLL_PROCESS` but NOT `PAYROLL_APPROVE`. CEO has `PAYROLL_APPROVE` but NOT `PAYROLL_PROCESS`.

**Recommendation:** Add permission check in PATCH handler:
```typescript
case 'approve':
case 'reject': {
  // Add permission check
  if (!hasPermission(user.role, PERMISSIONS.PAYROLL_APPROVE)) {
    return NextResponse.json({ error: 'Approval permission required' }, { status: 403 });
  }
  // ... rest of logic
}
```

**Risk:** MEDIUM - Could allow unauthorized approvals

---

### Finding #2: LOW - Type Validation Missing in Bulk Notify

**Location:** `src/app/api/payment-requests/notify-all/route.ts` line 36-37

**Issue:** Year and month are extracted from request body without type validation:
```typescript
const { year, month } = body;
if (!year || !month) { ... }
```

If a string is passed, it would be truthy but could cause unexpected behavior.

**Recommendation:** Add explicit type checking:
```typescript
const { year, month } = body;
if (typeof year !== 'number' || typeof month !== 'number') {
  return NextResponse.json({ error: 'Year and month must be numbers' }, { status: 400 });
}
if (month < 1 || month > 12) {
  return NextResponse.json({ error: 'Invalid month' }, { status: 400 });
}
```

**Risk:** LOW - Would cause query to return empty results, not a security breach

---

### Finding #3: LOW - No Rate Limiting on Single Notify

**Location:** `src/app/api/payment-requests/[id]/notify/route.ts`

**Issue:** While bulk notify processes sequentially, single notify endpoint has no rate limiting. A malicious user could spam the endpoint for different request IDs.

**Mitigating Factors:**
- Requires `PAYROLL_PROCESS` permission (limited users)
- `notification_sent_at` check prevents repeat notifications for same request
- Audit logging tracks all notification attempts

**Recommendation:** Consider adding application-level rate limiting for notification endpoints.

**Risk:** LOW - Mitigated by permission requirements and idempotency

---

## Security Checklist

| Check | Status |
|-------|--------|
| Authentication required on all endpoints | ✅ |
| Authorization (RBAC) enforced | ⚠️ (Finding #1) |
| Input validation | ⚠️ (Finding #2) |
| SQL injection prevention | ✅ |
| XSS prevention (no user input in responses) | ✅ |
| CSRF protection (cookie-based auth) | ✅ |
| Sensitive data exposure | ✅ |
| Audit logging | ✅ |
| Error handling (no info leakage) | ✅ |
| Business logic validation | ✅ |

---

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| Risk Assessment: LOW | No critical vulnerabilities, good security patterns |
| Finding #1 Priority: MEDIUM | Permission gap could allow unauthorized approvals |
| Finding #2 Priority: LOW | Input issue causes graceful failure |
| Finding #3 Priority: LOW | Mitigated by existing controls |

---

## Recommendations Summary

### Must Fix (Before Production)
1. **Finding #1** - Add `PAYROLL_APPROVE` permission check for approve/reject actions

### Should Fix (Next Sprint)
2. **Finding #2** - Add type validation for year/month in bulk notify

### Consider (Future)
3. **Finding #3** - Implement rate limiting on notification endpoints

---

## What's Left to Do

For **Developer (deva)** to address:
- [ ] Fix Finding #1: Add PAYROLL_APPROVE permission check in PATCH handler
- [ ] Fix Finding #2: Add type validation in notify-all POST

---

## Blockers

None. Security review complete.

---

## Files Changed

None. This was a review-only session.

---

## Notes

1. The overall implementation follows security best practices
2. Supabase query builder provides good SQL injection protection
3. Audit logging is comprehensive and will help with incident investigation
4. The permission system is well-designed with clear role hierarchies

---

## Appendix: Permission Matrix for Payroll

| Role | PAYROLL_VIEW | PAYROLL_VIEW_ALL | PAYROLL_PROCESS | PAYROLL_APPROVE |
|------|--------------|------------------|-----------------|-----------------|
| general_manager | ✅ | ✅ | ✅ | ✅ |
| ceo | ✅ | ✅ | ❌ | ✅ |
| hr | ✅ | ✅ | ✅ | ❌ |
| chief_accountant | ❌ | ❌ | ❌ | ❌ |
| accountant | ❌ | ❌ | ❌ | ❌ |
| branch_manager | ✅ | ❌ | ❌ | ❌ |
| employee | ✅ | ❌ | ❌ | ❌ |
