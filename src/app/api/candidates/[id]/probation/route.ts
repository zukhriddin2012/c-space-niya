import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-auth';
import { PERMISSIONS } from '@/lib/permissions';
import { supabaseAdmin, isSupabaseAdminConfigured } from '@/lib/supabase';
import type { User } from '@/types';

// POST /api/candidates/[id]/probation - Update probation status
export const POST = withAuth(async (
  request: NextRequest,
  context: { user: User; params?: Record<string, string> }
) => {
  try {
    if (!isSupabaseAdminConfigured() || !supabaseAdmin) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const id = context.params?.id;
    if (!id) {
      return NextResponse.json({ error: 'Candidate ID is required' }, { status: 400 });
    }

    const body = await request.json();
    const { action, probation_start_date, probation_end_date } = body;

    // Validate action
    const validActions = ['sign_term_sheet', 'unsign_term_sheet', 'create_account', 'remove_account', 'set_dates', 'start_probation'];
    if (!validActions.includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    // Get current candidate
    const { data: candidate, error: fetchError } = await supabaseAdmin
      .from('candidates')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !candidate) {
      return NextResponse.json({ error: 'Candidate not found' }, { status: 404 });
    }

    let updates: Record<string, unknown> = {};

    switch (action) {
      case 'sign_term_sheet':
        updates.term_sheet_signed = true;
        break;
      case 'unsign_term_sheet':
        updates.term_sheet_signed = false;
        break;
      case 'create_account':
        updates.probation_account_created = true;
        break;
      case 'remove_account':
        updates.probation_account_created = false;
        break;
      case 'set_dates':
        if (probation_start_date) updates.probation_start_date = probation_start_date;
        if (probation_end_date) updates.probation_end_date = probation_end_date;
        break;
      case 'start_probation':
        // Move to probation stage and set dates
        updates.stage = 'probation';

        // Calculate probation dates
        const startDate = new Date();
        updates.probation_start_date = startDate.toISOString().split('T')[0];

        // Check if CM role - 2 weeks, otherwise default (e.g., 3 months)
        const isCM = candidate.applied_role?.toLowerCase().includes('community manager') ||
                     candidate.applied_role?.toLowerCase().includes('cm');

        const endDate = new Date(startDate);
        if (isCM) {
          // 2 weeks for Community Managers
          endDate.setDate(endDate.getDate() + 14);
        } else {
          // 3 months for others
          endDate.setMonth(endDate.getMonth() + 3);
        }
        updates.probation_end_date = endDate.toISOString().split('T')[0];
        break;
    }

    // Update candidate
    const { data: updatedCandidate, error: updateError } = await supabaseAdmin
      .from('candidates')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating candidate probation:', updateError);
      return NextResponse.json({ error: 'Failed to update probation status' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      candidate: updatedCandidate,
      action,
    });
  } catch (error) {
    console.error('Error in probation update:', error);
    return NextResponse.json({ error: 'Failed to update probation status' }, { status: 500 });
  }
}, { permission: PERMISSIONS.RECRUITMENT_MANAGE });
