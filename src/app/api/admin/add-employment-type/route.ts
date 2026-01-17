import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-auth';
import { PERMISSIONS } from '@/lib/permissions';
import { supabaseAdmin, isSupabaseAdminConfigured } from '@/lib/supabase';

// POST /api/admin/add-employment-type - Add employment_type column to employees
export const POST = withAuth(async () => {
  try {
    if (!isSupabaseAdminConfigured()) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    // Check if column exists by trying to query it
    const { data: testData, error: testError } = await supabaseAdmin!
      .from('employees')
      .select('employment_type')
      .limit(1);

    if (!testError) {
      // Column already exists, just update null values
      const { error: updateError } = await supabaseAdmin!
        .from('employees')
        .update({ employment_type: 'full-time' })
        .is('employment_type', null);

      if (updateError) {
        return NextResponse.json({
          error: `Failed to update null values: ${updateError.message}`
        }, { status: 400 });
      }

      return NextResponse.json({
        success: true,
        message: 'Column already exists. Updated null values to "full-time".'
      });
    }

    // Column doesn't exist - need to run ALTER TABLE via SQL Editor
    return NextResponse.json({
      success: false,
      message: 'Column does not exist. Please run this SQL in Supabase SQL Editor:',
      sql: `ALTER TABLE employees ADD COLUMN IF NOT EXISTS employment_type TEXT DEFAULT 'full-time';`
    });
  } catch (error) {
    console.error('Error adding employment_type:', error);
    return NextResponse.json({ error: 'Failed to add employment_type' }, { status: 500 });
  }
}, { permission: PERMISSIONS.ADMIN });
