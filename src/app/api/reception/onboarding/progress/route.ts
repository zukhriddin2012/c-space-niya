import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-auth';
import { supabaseAdmin, isSupabaseAdminConfigured } from '@/lib/db/connection';

// ============================================
// POST /api/reception/onboarding/progress
// Update user's onboarding progress
// ============================================
export const POST = withAuth(async (request: NextRequest, { user }) => {
  try {
    if (!isSupabaseAdminConfigured()) {
      return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
    }

    const body = await request.json();
    const { guideId, lastStep, completed } = body;

    if (!guideId) {
      return NextResponse.json({ error: 'guideId is required' }, { status: 400 });
    }

    // Upsert progress
    const { data, error } = await supabaseAdmin!
      .from('onboarding_progress')
      .upsert({
        user_id: user.id,
        guide_id: guideId,
        last_step: lastStep || 0,
        completed: completed || false,
        completed_at: completed ? new Date().toISOString() : null,
        first_opened_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,guide_id',
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to update onboarding progress:', error);
      return NextResponse.json({ error: 'Failed to update progress' }, { status: 500 });
    }

    return NextResponse.json({ success: true, progress: data });
  } catch (error) {
    console.error('Onboarding progress API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}, { allowKiosk: true });
