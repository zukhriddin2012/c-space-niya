import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-auth';
import { trackUsage } from '@/lib/db';

export const POST = withAuth(async (request: NextRequest, { user }) => {
  try {
    const body = await request.json();
    const { module, actionType, metadata } = body;

    if (!module || !actionType) {
      return NextResponse.json({ error: 'module and actionType are required' }, { status: 400 });
    }

    // Fire-and-forget
    trackUsage(
      user.id,
      module,
      actionType,
      '/frontend',
      user.branchId,
      metadata
    ).catch(() => {});

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error in POST /api/adoption/track:', error);
    return NextResponse.json({ error: 'Failed to track event' }, { status: 500 });
  }
});
