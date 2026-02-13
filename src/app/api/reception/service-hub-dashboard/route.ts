import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-auth';
import { PERMISSIONS, hasPermission } from '@/lib/permissions';
import { validateBranchAccess } from '@/lib/security';
import { getLegalRequestStats } from '@/lib/db/legal-requests';
import { getMaintenanceStats } from '@/lib/db/maintenance-issues';
import { getAccountingRequestStatusCounts } from '@/lib/db/dashboards';
import { getCashPositionSummary } from '@/lib/db/cash-management';
import { getShiftDashboardData } from '@/lib/db/shifts';
import type { UserRole } from '@/types';

/**
 * CSN-030: Aggregated ServiceHub Dashboard API
 * Returns request statuses, cash summary, and shift data in a single call.
 * Uses Promise.allSettled for section-level error isolation.
 */
export const GET = withAuth(async (request: NextRequest, { user }) => {
  const { searchParams } = new URL(request.url);

  // 1. Branch validation
  const branchAccess = validateBranchAccess(
    user,
    searchParams.get('branchId'),
    PERMISSIONS.RECEPTION_VIEW
  );
  if (branchAccess.error) {
    return NextResponse.json({ error: branchAccess.error }, { status: branchAccess.status });
  }
  const branchId = branchAccess.branchId;

  if (!branchId) {
    return NextResponse.json({ error: 'Branch ID is required' }, { status: 400 });
  }

  // 2. Resolve operator employee ID from header
  const operatorId = request.headers.get('X-Operator-Id') || null;

  // 3. Check sub-permissions for graceful degradation
  const userRole = user.role as UserRole;
  const canViewLegal = hasPermission(userRole, PERMISSIONS.RECEPTION_LEGAL_VIEW);
  const canViewMaintenance = hasPermission(userRole, PERMISSIONS.RECEPTION_MAINTENANCE_VIEW);
  const canViewAccounting = hasPermission(userRole, PERMISSIONS.RECEPTION_ACCOUNTING_VIEW);
  const canViewCash = hasPermission(userRole, PERMISSIONS.RECEPTION_CASH_VIEW);
  const canViewShifts = hasPermission(userRole, PERMISSIONS.RECEPTION_SHIFTS_VIEW);

  // 4. Parallel queries with error isolation
  const [legalResult, maintenanceResult, accountingResult, cashResult, shiftsResult] =
    await Promise.allSettled([
      canViewLegal ? getLegalRequestStats(branchId) : Promise.resolve(null),
      canViewMaintenance ? getMaintenanceStats(branchId) : Promise.resolve(null),
      canViewAccounting ? getAccountingRequestStatusCounts(branchId) : Promise.resolve(null),
      canViewCash ? getCashPositionSummary(branchId) : Promise.resolve(null),
      canViewShifts ? getShiftDashboardData(branchId, operatorId) : Promise.resolve(null),
    ]);

  // 5. Extract results, treat rejections as null
  const legalStats = legalResult.status === 'fulfilled' ? legalResult.value : null;
  const maintenanceStats = maintenanceResult.status === 'fulfilled' ? maintenanceResult.value : null;
  const accountingStats = accountingResult.status === 'fulfilled' ? accountingResult.value : null;
  const cashData = cashResult.status === 'fulfilled' ? cashResult.value : null;
  const shiftsData = shiftsResult.status === 'fulfilled' ? shiftsResult.value : null;

  // Log errors for debugging (non-blocking)
  if (legalResult.status === 'rejected') console.error('[Dashboard] Legal stats failed:', legalResult.reason);
  if (maintenanceResult.status === 'rejected') console.error('[Dashboard] Maintenance stats failed:', maintenanceResult.reason);
  if (accountingResult.status === 'rejected') console.error('[Dashboard] Accounting stats failed:', accountingResult.reason);
  if (cashResult.status === 'rejected') console.error('[Dashboard] Cash data failed:', cashResult.reason);
  if (shiftsResult.status === 'rejected') console.error('[Dashboard] Shifts data failed:', shiftsResult.reason);

  // 6. Shape response
  return NextResponse.json({
    requests: {
      legal: legalStats ? legalStats.byStatus : null,
      maintenance: maintenanceStats ? {
        ...maintenanceStats.byStatus,
        slaBreached: maintenanceStats.slaBreachedCount,
      } : null,
      accounting: accountingStats,
    },
    cash: cashData ? {
      totalBalance: cashData.balance.allocation.opex.available
        + cashData.balance.allocation.marketing.available
        + cashData.balance.allocation.dividend.available,
      inkassoPendingCount: cashData.inkasso.pending.count,
      inkassoPendingAmount: cashData.inkasso.pending.amount,
      transferThreshold: cashData.balance.settings.transferThreshold,
      isOverThreshold: cashData.balance.thresholdExceeded,
    } : null,
    shifts: shiftsData,
  });
}, { permission: PERMISSIONS.RECEPTION_VIEW, allowKiosk: true });
