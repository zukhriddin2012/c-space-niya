import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { withAuth } from '@/lib/api-auth';
import { PERMISSIONS } from '@/lib/permissions';

// DELETE - Disconnect Telegram from employee
export const DELETE = withAuth(
  async (request: NextRequest, { user, params }) => {
    const id = params?.id;

    if (!id) {
      return NextResponse.json(
        { error: 'Employee ID is required' },
        { status: 400 }
      );
    }

    if (!supabase) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 500 }
      );
    }

    try {
      // First check if employee exists and has telegram_id
      const { data: employee, error: fetchError } = await supabase
        .from('employees')
        .select('id, full_name, telegram_id')
        .eq('id', id)
        .single();

      if (fetchError || !employee) {
        return NextResponse.json(
          { error: 'Employee not found' },
          { status: 404 }
        );
      }

      if (!employee.telegram_id) {
        return NextResponse.json(
          { error: 'Employee is not connected to Telegram' },
          { status: 400 }
        );
      }

      // Update employee to remove telegram_id
      const { error: updateError } = await supabase
        .from('employees')
        .update({ telegram_id: null })
        .eq('id', id);

      if (updateError) {
        console.error('Error disconnecting Telegram:', updateError);
        return NextResponse.json(
          { error: 'Failed to disconnect Telegram' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: `Telegram disconnected for ${employee.full_name}`,
      });
    } catch (error) {
      console.error('Error in telegram disconnect:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  },
  { permission: PERMISSIONS.EMPLOYEES_EDIT }
);
