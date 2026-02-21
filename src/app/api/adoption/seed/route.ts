import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-auth';
import { PERMISSIONS } from '@/lib/permissions';
import { supabaseAdmin } from '@/lib/db/connection';
import { ROLE_MODULE_ACCESS, ROLE_DAILY_TARGETS, MODULE_MAP } from '@/lib/db/usage-tracking';

/**
 * POST /api/adoption/seed
 *
 * Seeds realistic usage_events for all active employees over the last 30 days.
 * Development/testing utility to populate the adoption dashboard.
 *
 * Requires REPORTS_ANALYTICS permission (general_manager or ceo).
 */

const ACTION_TYPES = ['view', 'create', 'edit', 'delete'];
const ACTION_WEIGHTS = [0.60, 0.20, 0.15, 0.05]; // cumulative: 60% view, 20% create, 15% edit, 5% delete

function pickWeightedAction(): string {
  const rand = Math.random();
  let cumulative = 0;
  for (let i = 0; i < ACTION_TYPES.length; i++) {
    cumulative += ACTION_WEIGHTS[i];
    if (rand <= cumulative) return ACTION_TYPES[i];
  }
  return 'view';
}

/** Map module name → a realistic API endpoint path */
/** UUID v4 pattern — usage_events.branch_id is UUID type */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isUUID(val: unknown): boolean {
  return typeof val === 'string' && UUID_RE.test(val);
}

function moduleToEndpoint(module: string): string {
  const entry = MODULE_MAP.find(m => m.module === module);
  return entry ? entry.prefix : `/api/${module}`;
}

/** Generate a random timestamp within working hours (08:00-18:00 UTC) on a given date */
function randomTimestamp(date: Date): string {
  const hour = 8 + Math.floor(Math.random() * 10); // 08-17
  const minute = Math.floor(Math.random() * 60);
  const second = Math.floor(Math.random() * 60);
  const d = new Date(date);
  d.setUTCHours(hour, minute, second, 0);
  return d.toISOString();
}

export const POST = withAuth(async (request: NextRequest) => {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    // 1. Fetch active employees
    const { data: employees, error: empError } = await supabaseAdmin
      .from('employees')
      .select('id, full_name, system_role, branch_id')
      .in('status', ['active', 'probation']);

    if (empError || !employees || employees.length === 0) {
      return NextResponse.json({
        error: 'No active employees found',
        detail: empError?.message,
      }, { status: 404 });
    }

    // 2. Generate events for last 30 days
    const events: Array<{
      user_id: string;
      module: string;
      action_type: string;
      endpoint: string;
      branch_id: string | null;
      metadata: Record<string, unknown>;
      created_at: string;
    }> = [];

    const now = new Date();

    for (const emp of employees) {
      const role = emp.system_role || 'employee';
      const modules = ROLE_MODULE_ACCESS[role] || ROLE_MODULE_ACCESS['employee'];
      const dailyTarget = ROLE_DAILY_TARGETS[role] || 5;

      // Generate events for last 30 days (skip weekends for realism)
      for (let daysAgo = 0; daysAgo < 30; daysAgo++) {
        const date = new Date(now);
        date.setUTCDate(date.getUTCDate() - daysAgo);

        // Skip weekends (0=Sun, 6=Sat)
        const dayOfWeek = date.getUTCDay();
        if (dayOfWeek === 0 || dayOfWeek === 6) continue;

        // Random daily activity: 50%-120% of daily target for variety
        const activityMultiplier = 0.5 + Math.random() * 0.7;
        const eventsToday = Math.max(2, Math.round(dailyTarget * activityMultiplier));

        // Some days employees are "absent" (10% chance)
        if (Math.random() < 0.1) continue;

        for (let i = 0; i < eventsToday; i++) {
          // Pick a random module from their accessible modules
          const module = modules[Math.floor(Math.random() * modules.length)];
          const actionType = pickWeightedAction();

          events.push({
            user_id: emp.id,
            module,
            action_type: actionType,
            endpoint: moduleToEndpoint(module),
            branch_id: isUUID(emp.branch_id) ? emp.branch_id : null,
            metadata: {},
            created_at: randomTimestamp(date),
          });
        }
      }
    }

    // 3. Batch insert (Supabase supports array inserts)
    // Insert in chunks of 500 to avoid payload limits
    const CHUNK_SIZE = 500;
    let inserted = 0;

    for (let i = 0; i < events.length; i += CHUNK_SIZE) {
      const chunk = events.slice(i, i + CHUNK_SIZE);
      const { error: insertError } = await supabaseAdmin
        .from('usage_events')
        .insert(chunk);

      if (insertError) {
        console.error('[Adoption Seed] Insert error:', insertError.message);
        return NextResponse.json({
          error: 'Failed to insert events',
          detail: insertError.message,
          insertedSoFar: inserted,
        }, { status: 500 });
      }
      inserted += chunk.length;
    }

    return NextResponse.json({
      success: true,
      employeeCount: employees.length,
      eventsCreated: inserted,
      periodDays: 30,
    });
  } catch (error) {
    console.error('[Adoption Seed] Error:', error);
    return NextResponse.json({ error: 'Failed to seed data' }, { status: 500 });
  }
}, { permission: PERMISSIONS.REPORTS_ANALYTICS });
