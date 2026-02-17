import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-auth';
import { PERMISSIONS } from '@/lib/permissions';
import { getAllDeals, getDealsByBranch, createDeal } from '@/lib/db/branch-profit-deals';

// ============================================
// GET /api/branch-profit-deals
// List all deals or filter by branch
// ============================================
export const GET = withAuth(async (request: NextRequest, { user }) => {
  try {
    const branchId = request.nextUrl.searchParams.get('branchId');

    const data = branchId
      ? await getDealsByBranch(branchId)
      : await getAllDeals();

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Error listing profit deals:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}, { permission: PERMISSIONS.FINANCES_VIEW });

// ============================================
// POST /api/branch-profit-deals
// Create a new deal (auto-closes existing)
// ============================================
export const POST = withAuth(async (request: NextRequest, { user }) => {
  try {
    const body = await request.json();

    // Validate required fields
    const { branchId, investorName, cspacePercentage, investorPercentage, effectiveFrom, notes } = body;

    if (!branchId || !investorName || cspacePercentage == null || investorPercentage == null || !effectiveFrom) {
      return NextResponse.json(
        { error: 'Missing required fields', details: ['branchId, investorName, cspacePercentage, investorPercentage, effectiveFrom are required'] },
        { status: 400 }
      );
    }

    // Validate percentages
    const cPct = Number(cspacePercentage);
    const iPct = Number(investorPercentage);
    if (isNaN(cPct) || isNaN(iPct) || cPct < 0 || iPct < 0 || Math.abs(cPct + iPct - 100) > 0.01) {
      return NextResponse.json(
        { error: 'Invalid percentages', details: ['cspacePercentage + investorPercentage must equal 100'] },
        { status: 400 }
      );
    }

    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(effectiveFrom)) {
      return NextResponse.json(
        { error: 'Invalid date format', details: ['effectiveFrom must be YYYY-MM-DD'] },
        { status: 400 }
      );
    }

    const result = await createDeal({
      branchId,
      investorName: String(investorName).trim(),
      cspacePercentage: cPct,
      investorPercentage: iPct,
      effectiveFrom,
      notes: notes ? String(notes).trim() : undefined,
      createdBy: user.id,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ data: result.deal }, { status: 201 });
  } catch (error) {
    console.error('Error creating profit deal:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}, { permission: PERMISSIONS.FINANCES_EDIT });
