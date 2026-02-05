# Session Handover: ARC-017 - Architecture for Wages Section Fixes

**Session:** Platform Architect (architecta)
**Date:** 2026-02-05
**Task ID:** ARC-017 (depends on PR2-018/DES-017)

---

## Completed

1. **Reviewed Previous Handovers** - PRD-017 and DES-017 requirements understood
2. **Analyzed Existing Patterns** - Reviewed payment_requests schema, API routes, audit patterns
3. **Designed Database Migration** - New columns + audit table + indexes
4. **Designed API Specifications** - 5 endpoints with full request/response specs
5. **Created Implementation Pseudocode** - Ready-to-implement code templates

---

## Files Created

| File | Description |
|------|-------------|
| `ARC-017_architecta/ARCHITECTURE.md` | Full architecture spec (400+ lines) |
| `ARC-017_architecta/migration_20260205_payment_request_notifications.sql` | Ready-to-deploy SQL migration |
| `ARC-017_architecta/HANDOVER.md` | This handover document |

---

## Architecture Summary

### Database Changes

**New columns on `payment_requests`:**
- `notification_sent_at` TIMESTAMPTZ - When notifications were sent
- `notification_sent_by` UUID - Who triggered notifications

**New table `payment_request_audit`:**
- Stores action history (created, submitted, approved, rejected, paid, notified, deleted)
- No FK constraint to allow logging deleted request info
- JSONB `details` for flexible context storage

**New indexes:**
- `idx_pr_notification` - Fast lookup of un-notified paid requests
- `idx_pr_paid_period` - Fast duplicate prevention queries
- 3 audit table indexes for efficient queries

### API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/payment-requests/[id]` | DELETE | Hard delete (non-paid only) |
| `/api/payment-requests/[id]` | PATCH | Modified - remove auto-notify |
| `/api/payment-requests/[id]/notify` | POST | Send notifications for single request |
| `/api/payment-requests/notify-all` | POST | Bulk send for period |
| `/api/payment-requests/paid-status` | GET | Get paid employees for duplicate prevention |

### Key Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Delete approach | Hard delete | Cascade FK exists; audit table preserves history |
| Audit table FK | No FK constraint | Allows logging deleted requests |
| Rejection notify | Keep auto-notify | Employee needs immediate feedback |
| Duplicate check | Both UI + API | UI for UX, API for security |

---

## For Developer (deva)

### Migration File
The SQL migration is ready at:
```
tasks/.../ARC-017_architecta/migration_20260205_payment_request_notifications.sql
```
Copy to `supabase/migrations/` with proper timestamp prefix.

### Implementation Order
1. **Run migration** - Add columns and create audit table
2. **Add `getEmployeePaidStatus()`** - In `src/lib/db/payments.ts`
3. **Add DELETE handler** - In `/api/payment-requests/[id]/route.ts`
4. **Create `/notify` endpoint** - New file
5. **Create `/notify-all` endpoint** - New file
6. **Create `/paid-status` endpoint** - New file
7. **Modify PATCH handler** - Remove auto-notify for approve/pay
8. **Add frontend duplicate blocking** - Use paid-status API

### Type Definitions
Add to `src/types/payroll.ts`:
```typescript
interface EmployeePaidStatus {
  advancePaid: number | null;
  advancePaidAt: string | null;
  wagePaid: number | null;
  wagePaidAt: string | null;
}
```

---

## Important Notes

1. **Cascade Delete Already Exists:**
   - `payment_request_items` has `ON DELETE CASCADE` in original migration
   - No additional cleanup needed when deleting payment_requests

2. **Keep Rejection Auto-Notify:**
   - Unlike approve/pay, rejection should still auto-notify
   - Employee needs immediate feedback when request is rejected

3. **Audit Before Delete:**
   - Always log to `payment_request_audit` BEFORE hard deleting
   - Capture request_type, employee_count, total_amount in details

4. **Bulk Notify Rate Limiting:**
   - Process requests sequentially (not parallel)
   - Prevents Telegram API rate limiting issues

---

## Blockers

None. Architecture is complete and ready for implementation.

---

## Suggested Next Steps

1. **Copy migration** to `supabase/migrations/20260205_payment_request_notifications.sql`
2. **Run `supabase db push`** to apply migration
3. **Start with DELETE endpoint** - Simplest to implement, immediate value
4. **Then paid-status API** - Needed for duplicate prevention UI
5. **Then notify endpoints** - Single first, then bulk
6. **Finally modify PATCH** - Remove auto-notify

---

## Files for Developer Reference

| Source | Purpose |
|--------|---------|
| `ARCHITECTURE.md` Section 3 | Full API specifications with pseudocode |
| `ARCHITECTURE.md` Section 5 | Duplicate prevention logic |
| `ARCHITECTURE.md` Section 6 | Type definitions |
| `migration_*.sql` | Ready-to-deploy SQL |
