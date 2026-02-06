import { NextResponse } from 'next/server';
import { supabaseAdmin, isSupabaseAdminConfigured } from '@/lib/supabase';

// GET /api/test-accounts - Get all accounts for testing (dev only)
export async function GET() {
  // SEC-006: Only available in development
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ enabled: false, accounts: [], message: 'Not available' }, { status: 404 });
  }

  const isTestEnv = process.env.ENABLE_DEMO_USERS === 'true';

  if (!isTestEnv) {
    return NextResponse.json({
      enabled: false,
      accounts: [],
      message: 'Test mode is not enabled'
    });
  }

  if (!isSupabaseAdminConfigured()) {
    return NextResponse.json({
      enabled: true,
      accounts: [],
      error: 'Database not configured'
    }, { status: 500 });
  }

  try {
    // Fetch all active employees with their branches
    const { data: employees, error } = await supabaseAdmin!
      .from('employees')
      .select(`
        id,
        full_name,
        email,
        position,
        system_role,
        branches!employees_branch_id_fkey(name)
      `)
      .eq('status', 'active')
      .not('email', 'is', null)
      .order('system_role')
      .order('full_name');

    if (error) {
      console.error('Error fetching test accounts:', error);
      return NextResponse.json({
        enabled: true,
        accounts: [],
        error: 'Failed to fetch accounts'
      }, { status: 500 });
    }

    // SEC-006: Never expose passwords, even in dev
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const accounts = (employees || []).map((emp: any) => ({
      id: emp.id,
      name: emp.full_name,
      email: emp.email,
      role: emp.system_role || 'employee',
      position: emp.position || 'Unknown',
      branch: emp.branches?.name || 'No branch',
    }));

    // Sort by role priority
    const rolePriority: Record<string, number> = {
      'general_manager': 1,
      'ceo': 2,
      'hr': 3,
      'branch_manager': 4,
      'community_manager': 5,
      'recruiter': 6,
      'accountant': 7,
      'night_shift': 8,
      'employee': 9,
    };

    accounts.sort((a: { role: string }, b: { role: string }) => {
      const aPriority = rolePriority[a.role] || 99;
      const bPriority = rolePriority[b.role] || 99;
      return aPriority - bPriority;
    });

    return NextResponse.json({
      enabled: true,
      accounts,
    });
  } catch (error) {
    console.error('Error in test-accounts API:', error);
    return NextResponse.json({
      enabled: true,
      accounts: [],
      error: 'Internal server error'
    }, { status: 500 });
  }
}
