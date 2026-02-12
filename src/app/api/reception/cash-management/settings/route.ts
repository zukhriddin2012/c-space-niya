import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-auth';
import { PERMISSIONS } from '@/lib/permissions';
import { getCashSettings, updateCashSettings } from '@/lib/db/cash-management';
import { validateBranchAccess, MAX_LENGTH } from '@/lib/security';
import { audit, getRequestMeta } from '@/lib/audit';

// ============================================
// GET /api/reception/cash-management/settings
// Get cash management settings for a branch
// ============================================
export const GET = withAuth(async (request: NextRequest, { user }) => {
  try {
    // H-02: Validate branch access (IDOR prevention)
    const branchAccess = validateBranchAccess(user, request.nextUrl.searchParams.get('branchId'));
    if (branchAccess.error) {
      return NextResponse.json({ error: branchAccess.error }, { status: branchAccess.status });
    }
    if (!branchAccess.branchId) {
      return NextResponse.json({ error: 'branchId is required' }, { status: 400 });
    }

    const settings = await getCashSettings(branchAccess.branchId);
    return NextResponse.json(settings);
  } catch (error) {
    console.error('Failed to get cash settings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}, { permission: PERMISSIONS.RECEPTION_CASH_VIEW, allowKiosk: true });

// ============================================
// PUT /api/reception/cash-management/settings
// Update cash management settings for a branch
// ============================================
export const PUT = withAuth(async (request: NextRequest, { user }) => {
  try {
    const body = await request.json();
    const { branchId, marketingPercentage, transferThreshold } = body;

    // H-02: Validate branch access (IDOR prevention)
    const branchAccess = validateBranchAccess(user, branchId);
    if (branchAccess.error) {
      return NextResponse.json({ error: branchAccess.error }, { status: branchAccess.status });
    }
    if (!branchAccess.branchId) {
      return NextResponse.json({ error: 'branchId is required' }, { status: 400 });
    }

    if (marketingPercentage !== 2.5 && marketingPercentage !== 5.0) {
      return NextResponse.json({ error: 'marketingPercentage must be 2.5 or 5.0' }, { status: 400 });
    }
    if (!transferThreshold || transferThreshold <= 0) {
      return NextResponse.json({ error: 'transferThreshold must be positive' }, { status: 400 });
    }

    const settings = await updateCashSettings(branchAccess.branchId, {
      branchId: branchAccess.branchId,
      marketingPercentage,
      transferThreshold,
    });

    // SEC-024: Audit trail for settings change
    await audit({
      user_id: user.id,
      action: 'cash.settings_updated',
      resource_type: 'branches',
      resource_id: branchAccess.branchId,
      details: { marketingPercentage, transferThreshold },
      severity: 'medium',
      ...getRequestMeta(request),
    });

    return NextResponse.json(settings);
  } catch (error) {
    console.error('Failed to update cash settings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}, { permission: PERMISSIONS.RECEPTION_CASH_SETTINGS, allowKiosk: false });
