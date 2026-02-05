# Deployment Checklist: PR2-017 - Fix and Improve Wages Section

**Version:** 1.0.0
**Date:** 2026-02-05
**Prepared by:** DevOps (Claude)

---

## Pre-Deployment Checklist

### 1. Code Review
- [x] All code reviewed by Security (SEC-017)
- [x] All security findings fixed (DEB-017)
- [x] All test cases defined (TST-017)
- [x] TypeScript types verified - no new errors

### 2. Database Migration
- [x] Migration file created: `20260205_payment_request_notifications.sql`
- [x] Migration file copied to `supabase/migrations/`
- [ ] Migration tested in staging

### 3. Environment Variables
- No new environment variables required

---

## Deployment Steps

### Step 0: Verify Prerequisites (CRITICAL)

```bash
# Check if payment_requests table exists
psql $DATABASE_URL -c "
  SELECT table_name FROM information_schema.tables
  WHERE table_name = 'payment_requests';
"
# Expected: 1 row showing 'payment_requests'

# If table does NOT exist, run base migration first:
# supabase db push  (will run ALL pending migrations in order)
# OR run specific migration:
# psql $DATABASE_URL -f supabase/migrations/20240120_payment_requests.sql
```

**IMPORTANT:** The PR2-017 migration (`20260205_payment_request_notifications.sql`) depends on `payment_requests` table created by `20240120_payment_requests.sql`. All base migrations must be applied first.

### Step 1: Database Migration (CRITICAL - DO FIRST)

```bash
# 1. Backup database first
pg_dump -Fc $DATABASE_URL > backup_pre_pr2017_$(date +%Y%m%d_%H%M%S).dump

# 2. Run ALL pending migrations (recommended - ensures correct order)
supabase db push

# 3. Verify migration
psql $DATABASE_URL -c "
  SELECT column_name, data_type
  FROM information_schema.columns
  WHERE table_name = 'payment_requests'
  AND column_name IN ('notification_sent_at', 'notification_sent_by');
"
# Expected: 2 rows (notification_sent_at, notification_sent_by)

# 4. Verify audit table created
psql $DATABASE_URL -c "
  SELECT table_name FROM information_schema.tables
  WHERE table_name = 'payment_request_audit';
"
# Expected: 1 row

# 5. Verify indexes
psql $DATABASE_URL -c "
  SELECT indexname FROM pg_indexes
  WHERE indexname LIKE 'idx_pr_%';
"
# Expected: idx_pr_notification, idx_pr_paid_period, idx_pr_audit_*
```

### Step 2: Deploy Application

```bash
# 1. Pull latest code
git pull origin main

# 2. Install dependencies (if any changed)
npm install

# 3. Build application
npm run build

# 4. Verify build succeeded
ls -la .next/

# 5. Restart application
pm2 restart c-space-niya  # or your process manager
```

### Step 3: Verify Deployment

```bash
# 1. Check application health
curl -s https://app.c-space-niya.com/api/health | jq .

# 2. Test DELETE endpoint (should require auth)
curl -s -X DELETE https://app.c-space-niya.com/api/payment-requests/test-id
# Expected: 401 Unauthorized

# 3. Test notify-all endpoint (should require auth)
curl -s https://app.c-space-niya.com/api/payment-requests/notify-all?year=2026&month=2
# Expected: 401 Unauthorized
```

---

## Files Changed

### Modified Files (9)

| File | Change Summary |
|------|----------------|
| `src/app/api/payment-requests/[id]/route.ts` | Added DELETE handler, PAYROLL_APPROVE check |
| `src/app/(dashboard)/payroll/PaymentRequestsSection.tsx` | Delete/Notify buttons and dialogs |
| `src/app/(dashboard)/payroll/PayrollActions.tsx` | Bulk notify button with modal |
| `src/app/(dashboard)/payroll/PayrollContent.tsx` | Notification stats fetch |
| `src/lib/db/payments.ts` | 6 new database functions |
| `src/lib/i18n/en.ts` | 28 new translation keys |
| `src/lib/i18n/ru.ts` | 28 new translation keys |
| `src/lib/i18n/uz.ts` | 28 new translation keys |
| `src/lib/i18n/types.ts` | TypeScript types for new keys |

### New Files (4)

| File | Purpose |
|------|---------|
| `src/app/api/payment-requests/[id]/notify/route.ts` | Single request notifications |
| `src/app/api/payment-requests/notify-all/route.ts` | Bulk notifications + counts |
| `src/app/api/payment-requests/paid-status/route.ts` | Paid status for duplicate prevention |
| `supabase/migrations/20260205_payment_request_notifications.sql` | DB migration |

---

## New API Endpoints

| Endpoint | Method | Permission | Purpose |
|----------|--------|------------|---------|
| `/api/payment-requests/[id]` | DELETE | PAYROLL_PROCESS | Delete non-paid requests |
| `/api/payment-requests/[id]/notify` | POST | PAYROLL_PROCESS | Send notifications |
| `/api/payment-requests/notify-all` | GET | PAYROLL_VIEW_ALL | Get pending counts |
| `/api/payment-requests/notify-all` | POST | PAYROLL_PROCESS | Bulk send notifications |
| `/api/payment-requests/paid-status` | GET | PAYROLL_VIEW_ALL | Check paid status |

---

## Rollback Plan

### If Migration Fails

```bash
# Restore from backup
pg_restore -d $DATABASE_URL backup_pre_pr2017_TIMESTAMP.dump
```

### If Application Fails

```bash
# Revert to previous commit
git checkout HEAD~1

# Rebuild and restart
npm run build
pm2 restart c-space-niya
```

### If Issues After Deployment

1. **Cannot delete requests** - Check PAYROLL_PROCESS permission
2. **Cannot approve/reject** - Check PAYROLL_APPROVE permission
3. **Notifications not sending** - Check Telegram bot token and API
4. **Wrong notification counts** - Verify employeesNotified vs totalSent fields

---

## Post-Deployment Verification

### Manual Tests (Required)

| Test | Steps | Expected |
|------|-------|----------|
| Delete non-paid | 1. Login as HR<br>2. View draft request<br>3. Click delete | Request deleted |
| Cannot delete paid | 1. View paid request<br>2. Check for delete button | No delete button |
| HR cannot approve | 1. Login as HR<br>2. Try to approve | 403 error |
| CEO can approve | 1. Login as CEO<br>2. Approve request | Success |
| Notify single | 1. View approved request<br>2. Click notify | Notifications sent |
| Bulk notify | 1. Click "Notify All Paid"<br>2. Confirm | All notified |

### Monitor (First 24 Hours)

- [ ] Error logs for 500 errors
- [ ] Audit table for unexpected actions
- [ ] Telegram API rate limit errors
- [ ] User feedback on new features

---

## Troubleshooting

### Error: "relation payment_requests does not exist"

**Cause:** The base `payment_requests` table migration hasn't been applied yet.

**Solution:**
```bash
# 1. Check which migrations have been applied
psql $DATABASE_URL -c "SELECT * FROM supabase_migrations ORDER BY version;"

# 2. Ensure 20240120_payment_requests.sql has been applied
# If not, run all migrations in order:
supabase db push

# 3. Or manually run the base migration first:
psql $DATABASE_URL -f supabase/migrations/20240120_payment_requests.sql

# 4. Then run the PR2-017 migration:
psql $DATABASE_URL -f supabase/migrations/20260205_payment_request_notifications.sql
```

### Error: "column notification_sent_at already exists"

**Cause:** Migration was partially applied or already run.

**Solution:** This is safe - the migration uses `IF NOT EXISTS` clauses. Verify the columns exist:
```bash
psql $DATABASE_URL -c "\\d payment_requests" | grep notification
```

---

## Contacts

| Role | Action |
|------|--------|
| DevOps | Deployment execution |
| Backend Dev | Code issues |
| Security | Permission issues |
| QA | Functional issues |

---

## Sign-Off

| Role | Name | Date | Status |
|------|------|------|--------|
| QA Engineer | TST-017 | 2026-02-05 | Approved |
| Security | SEC-017 | 2026-02-05 | Approved |
| Bug Hunter | DEB-017 | 2026-02-05 | Approved |
| DevOps | OPS-017 | 2026-02-05 | Ready |
