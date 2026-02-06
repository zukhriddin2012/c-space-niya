import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-auth';
import { PERMISSIONS } from '@/lib/permissions';
import { supabaseAdmin, isSupabaseAdminConfigured } from '@/lib/db/connection';
import type { User } from '@/types';

// DELETE /api/employees/[id]/operator-pin - Remove operator PIN
export const DELETE = withAuth(
  async (request: NextRequest, context: { user: User; params?: Record<string, string> }) => {
    try {
      const { params } = context;
      const employeeId = params?.id;

      if (!employeeId) {
        return NextResponse.json({ error: 'Employee ID is required' }, { status: 400 });
      }

      if (!isSupabaseAdminConfigured()) {
        return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
      }

      const { error } = await supabaseAdmin!
        .from('employees')
        .update({ operator_pin_hash: null })
        .eq('id', employeeId);

      if (error) {
        console.error('Error removing operator PIN:', error);
        return NextResponse.json({ error: 'Failed to remove PIN' }, { status: 500 });
      }

      return NextResponse.json({ success: true });
    } catch (error) {
      console.error('Error removing operator PIN:', error);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  },
  { permission: PERMISSIONS.OPERATOR_PIN_MANAGE }
);
