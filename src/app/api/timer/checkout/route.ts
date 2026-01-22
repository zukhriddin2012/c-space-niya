import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, isSupabaseAdminConfigured } from '@/lib/supabase';

// CORS headers for Mini App
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Telegram-Init-Data',
};

// Handle OPTIONS request for CORS
export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(request: NextRequest) {
  try {
    if (!isSupabaseAdminConfigured()) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 500, headers: corsHeaders }
      );
    }

    const body = await request.json();
    const { telegramId } = body;

    if (!telegramId) {
      return NextResponse.json(
        { error: 'telegramId is required' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Get employee by telegram_id
    const { data: employee, error: empError } = await supabaseAdmin!
      .from('employees')
      .select('id, full_name')
      .eq('telegram_id', telegramId)
      .single();

    if (empError || !employee) {
      return NextResponse.json(
        { error: 'Employee not found' },
        { status: 404, headers: corsHeaders }
      );
    }

    // Get active attendance record
    const { data: attendance, error: attError } = await supabaseAdmin!
      .from('attendance')
      .select('id, check_in, check_in_timestamp, check_in_branch_id')
      .eq('employee_id', employee.id)
      .is('check_out', null)
      .order('check_in', { ascending: false })
      .limit(1)
      .single();

    if (attError || !attendance) {
      return NextResponse.json(
        { error: 'No active check-in found' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Calculate total hours using full timestamp
    const checkIn = new Date(attendance.check_in_timestamp);
    const checkOut = new Date();
    const totalHours = ((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60)).toFixed(2);

    // Format check-out time for Tashkent timezone
    const tashkentOffset = 5 * 60; // UTC+5
    const checkOutTashkent = new Date(checkOut.getTime() + tashkentOffset * 60 * 1000);
    const checkOutFormatted = checkOutTashkent.toTimeString().slice(0, 5);

    // Determine if early leave (before 17:45 for day shift)
    const checkOutHour = checkOutTashkent.getHours();
    const checkOutMinute = checkOutTashkent.getMinutes();
    const isEarlyLeave = (checkOutHour < 17) || (checkOutHour === 17 && checkOutMinute < 45);

    // Update attendance record
    const { error: updateError } = await supabaseAdmin!
      .from('attendance')
      .update({
        check_out: checkOut.toISOString(),
        check_out_branch_id: attendance.check_in_branch_id, // Use same branch
        total_hours: parseFloat(totalHours),
        is_early_leave: isEarlyLeave,
      })
      .eq('id', attendance.id);

    if (updateError) {
      console.error('Update error:', updateError);
      return NextResponse.json(
        { error: 'Failed to record checkout' },
        { status: 500, headers: corsHeaders }
      );
    }

    return NextResponse.json({
      success: true,
      checkOut: checkOutFormatted,
      totalHours: totalHours,
      isEarlyLeave: isEarlyLeave,
      employeeName: employee.full_name,
    }, { headers: corsHeaders });
  } catch (error) {
    console.error('Checkout error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}
