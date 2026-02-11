import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-auth';
import { PERMISSIONS } from '@/lib/permissions';
import { getMyFeedback } from '@/lib/db';
import type { User } from '@/types';

// GET /api/feedback/my - Get employee's own feedback submissions
export const GET = withAuth(async (request: NextRequest, context: { user: User }) => {
  try {
    const { user } = context;

    // BUG-010 fix: user.employeeId contains the employee code (e.g. "HN001"), not the UUID.
    // user.id IS the employee UUID (set in auth.ts as employee.id), which matches
    // feedback_submissions.employee_id (UUID FK to employees.id).
    const feedback = await getMyFeedback(user.id);

    return NextResponse.json({ feedback });
  } catch (error) {
    console.error('Error fetching my feedback:', error);
    return NextResponse.json({ error: 'Failed to fetch feedback' }, { status: 500 });
  }
}, { permission: PERMISSIONS.FEEDBACK_SUBMIT });
