import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-auth';
import { PERMISSIONS, hasPermission } from '@/lib/permissions';
import {
  createFeedback,
  getAllFeedback,
  getGMTelegramId,
  getEmployeeById,
  type FeedbackCategory,
  type FeedbackStatus
} from '@/lib/db';
import { notifyNewFeedback } from '@/lib/telegram-notifications';
import type { User } from '@/types';

// GET /api/feedback - List all feedback (GM only)
export const GET = withAuth(async (request: NextRequest, context: { user: User }) => {
  try {
    const { user } = context;
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') as FeedbackStatus | undefined;

    // Only GM/CEO can view all feedback
    const canViewAll = hasPermission(user.role, PERMISSIONS.FEEDBACK_VIEW_ALL);

    if (!canViewAll) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const feedback = await getAllFeedback(status || undefined);

    return NextResponse.json({ feedback });
  } catch (error) {
    console.error('Error fetching feedback:', error);
    return NextResponse.json({ error: 'Failed to fetch feedback' }, { status: 500 });
  }
}, { permission: PERMISSIONS.FEEDBACK_SUBMIT });

// POST /api/feedback - Submit new feedback (all employees)
export const POST = withAuth(async (request: NextRequest, context: { user: User }) => {
  try {
    const { user } = context;
    const { category, feedback_text, is_anonymous, rating } = await request.json();

    // Validate required fields
    if (!category || !feedback_text) {
      return NextResponse.json(
        { error: 'Category and feedback text are required' },
        { status: 400 }
      );
    }

    // Validate category
    const validCategories: FeedbackCategory[] = [
      'work_environment', 'management', 'career', 'compensation', 'suggestion', 'other'
    ];
    if (!validCategories.includes(category)) {
      return NextResponse.json(
        { error: 'Invalid category' },
        { status: 400 }
      );
    }

    // Validate rating if provided
    if (rating !== undefined && rating !== null && (rating < 1 || rating > 5)) {
      return NextResponse.json(
        { error: 'Rating must be between 1 and 5' },
        { status: 400 }
      );
    }

    // Create feedback
    // BUG-010 fix: user.employeeId is the employee code (e.g. "HN001"), not UUID.
    // feedback_submissions.employee_id is UUID FK to employees.id — use user.id instead.
    const result = await createFeedback({
      employee_id: user.id,
      is_anonymous: is_anonymous || false,
      category: category as FeedbackCategory,
      feedback_text,
      rating: rating || null,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    // Send Telegram notification to GM
    try {
      const gmTelegramId = await getGMTelegramId();
      if (gmTelegramId && result.feedback) {
        // Get employee name for non-anonymous feedback
        let employeeName: string | undefined;
        if (!is_anonymous) {
          const employee = await getEmployeeById(user.id);
          employeeName = employee?.full_name;
        }

        await notifyNewFeedback({
          gmTelegramId,
          feedbackId: result.feedback.id,
          category,
          isAnonymous: is_anonymous || false,
          employeeName,
          rating,
          feedbackText: feedback_text,
        });
      }
    } catch (notifyError) {
      // Don't fail the request if notification fails
      console.error('Failed to send Telegram notification:', notifyError);
    }

    return NextResponse.json({
      success: true,
      feedback: result.feedback,
    });
  } catch (error) {
    console.error('Error creating feedback:', error);
    return NextResponse.json({ error: 'Failed to create feedback' }, { status: 500 });
  }
}, { permission: PERMISSIONS.FEEDBACK_SUBMIT });
