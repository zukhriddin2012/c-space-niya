import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-auth';
import { PERMISSIONS } from '@/lib/permissions';
import { closeDeal } from '@/lib/db/branch-profit-deals';

// ============================================
// PATCH /api/branch-profit-deals/[id]
// Close a specific deal (set effective_until)
// ============================================
export const PATCH = withAuth(async (request: NextRequest, context) => {
  try {
    const dealId = context.params?.id;
    if (!dealId) {
      return NextResponse.json({ error: 'Deal ID is required' }, { status: 400 });
    }

    const body = await request.json();
    const { effectiveUntil } = body;

    if (!effectiveUntil || !/^\d{4}-\d{2}-\d{2}$/.test(effectiveUntil)) {
      return NextResponse.json(
        { error: 'Invalid date', details: ['effectiveUntil must be YYYY-MM-DD'] },
        { status: 400 }
      );
    }

    const result = await closeDeal(dealId, effectiveUntil);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error closing profit deal:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}, { permission: PERMISSIONS.FINANCES_EDIT });
