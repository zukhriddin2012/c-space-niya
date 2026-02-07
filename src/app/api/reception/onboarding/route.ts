import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-auth';
import { supabaseAdmin, isSupabaseAdminConfigured } from '@/lib/db/connection';

// ============================================
// GET /api/reception/onboarding?moduleKey=requests-hub
// Returns guide + steps + user progress
// ============================================
export const GET = withAuth(async (request: NextRequest, { user }) => {
  try {
    if (!isSupabaseAdminConfigured()) {
      return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
    }

    const moduleKey = request.nextUrl.searchParams.get('moduleKey');
    if (!moduleKey) {
      return NextResponse.json({ error: 'moduleKey is required' }, { status: 400 });
    }

    const db = supabaseAdmin!;

    // Fetch guide
    const { data: guide, error: guideError } = await db
      .from('onboarding_guides')
      .select('*')
      .eq('module_key', moduleKey)
      .eq('is_active', true)
      .single();

    if (guideError || !guide) {
      return NextResponse.json({ error: 'Guide not found' }, { status: 404 });
    }

    // Fetch steps
    const { data: steps, error: stepsError } = await db
      .from('onboarding_steps')
      .select('*')
      .eq('guide_id', guide.id)
      .eq('is_active', true)
      .order('step_number', { ascending: true });

    if (stepsError) {
      return NextResponse.json({ error: 'Failed to load steps' }, { status: 500 });
    }

    // Fetch user progress
    const { data: progress } = await db
      .from('onboarding_progress')
      .select('*')
      .eq('user_id', user.id)
      .eq('guide_id', guide.id)
      .single();

    return NextResponse.json({
      guide: {
        id: guide.id,
        moduleKey: guide.module_key,
        pagePath: guide.page_path,
        titleEn: guide.title_en,
        titleRu: guide.title_ru,
        titleUz: guide.title_uz,
        subtitleEn: guide.subtitle_en,
        subtitleRu: guide.subtitle_ru,
        subtitleUz: guide.subtitle_uz,
        autoShow: guide.auto_show,
      },
      steps: (steps || []).map((s: Record<string, unknown>) => ({
        id: s.id,
        stepNumber: s.step_number,
        titleEn: s.title_en,
        titleRu: s.title_ru,
        titleUz: s.title_uz,
        bodyEn: s.body_en,
        bodyRu: s.body_ru,
        bodyUz: s.body_uz,
        tipEn: s.tip_en,
        tipRu: s.tip_ru,
        tipUz: s.tip_uz,
        featuresEn: s.features_en,
        featuresRu: s.features_ru,
        featuresUz: s.features_uz,
        animationKey: s.animation_key,
      })),
      progress: progress ? {
        completed: progress.completed,
        lastStep: progress.last_step,
        completedAt: progress.completed_at,
      } : null,
    });
  } catch (error) {
    console.error('Onboarding API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}, { allowKiosk: true });
