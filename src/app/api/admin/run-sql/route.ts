import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-auth';
import { PERMISSIONS } from '@/lib/permissions';
import { supabaseAdmin, isSupabaseAdminConfigured } from '@/lib/supabase';

// POST /api/admin/run-sql - Run SQL query (development only)
export const POST = withAuth(async (request: NextRequest) => {
  // SEC-005: Block in production
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 404 });
  }

  try {
    if (!isSupabaseAdminConfigured()) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const { sql } = await request.json();

    if (!sql || typeof sql !== 'string') {
      return NextResponse.json({ error: 'SQL query is required' }, { status: 400 });
    }

    // Execute the SQL using Supabase's rpc or direct query
    const { data, error } = await supabaseAdmin!.rpc('exec_sql', { query: sql });

    if (error) {
      // If rpc doesn't exist, try a different approach
      console.error('SQL execution error:', error);
      return NextResponse.json({
        error: error.message,
        hint: 'You may need to run this SQL directly in Supabase SQL Editor'
      }, { status: 400 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error running SQL:', error);
    return NextResponse.json({ error: 'Failed to run SQL' }, { status: 500 });
  }
}, { permission: PERMISSIONS.DASHBOARD_ADMIN });
