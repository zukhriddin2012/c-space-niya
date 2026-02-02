import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-auth';
import { PERMISSIONS } from '@/lib/permissions';
import { getAvailableEmployeesForShift } from '@/lib/db';
import type { User } from '@/types';

// GET /api/shifts/available-employees?date=YYYY-MM-DD&shift_type=day|night&branch_id=xxx
export const GET = withAuth(async (request: NextRequest, context: { user: User }) => {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    const shiftType = searchParams.get('shift_type') as 'day' | 'night' | null;
    const branchId = searchParams.get('branch_id') || undefined;

    if (!date || !shiftType) {
      return NextResponse.json(
        { error: 'date and shift_type are required' },
        { status: 400 }
      );
    }

    if (shiftType !== 'day' && shiftType !== 'night') {
      return NextResponse.json(
        { error: 'shift_type must be "day" or "night"' },
        { status: 400 }
      );
    }

    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json(
        { error: 'date must be in YYYY-MM-DD format' },
        { status: 400 }
      );
    }

    const employees = await getAvailableEmployeesForShift(date, shiftType, branchId);

    return NextResponse.json({ employees });
  } catch (error) {
    console.error('Error fetching available employees:', error);
    return NextResponse.json(
      { error: 'Failed to fetch available employees' },
      { status: 500 }
    );
  }
}, { permission: PERMISSIONS.SHIFTS_VIEW });
