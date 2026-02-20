import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-auth';
import { trackUsage, ALL_MODULES } from '@/lib/db';

const VALID_ACTION_TYPES = ['view', 'create', 'edit', 'delete', 'export', 'approve'];
const MAX_METADATA_SIZE = 1024; // 1KB

export const POST = withAuth(async (request: NextRequest, { user }) => {
  try {
    const body = await request.json();
    const { module, actionType, metadata } = body;

    if (!module || !actionType) {
      return NextResponse.json({ error: 'module and actionType are required' }, { status: 400 });
    }

    // SEC: Validate module against whitelist — prevent arbitrary data injection
    if (!ALL_MODULES.includes(module)) {
      return NextResponse.json({ error: 'Invalid module' }, { status: 400 });
    }

    // SEC: Validate actionType against whitelist
    if (!VALID_ACTION_TYPES.includes(actionType)) {
      return NextResponse.json({ error: 'Invalid actionType' }, { status: 400 });
    }

    // SEC: Validate metadata size and type to prevent DB bloat
    if (metadata !== undefined && metadata !== null) {
      if (typeof metadata !== 'object' || Array.isArray(metadata)) {
        return NextResponse.json({ error: 'metadata must be an object' }, { status: 400 });
      }
      if (JSON.stringify(metadata).length > MAX_METADATA_SIZE) {
        return NextResponse.json({ error: 'metadata exceeds maximum size' }, { status: 400 });
      }
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
