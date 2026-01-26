import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    // Get the client's IP address
    const forwardedFor = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    const clientIp = forwardedFor?.split(',')[0]?.trim() || realIp || 'unknown';

    const body = await request.json();
    const { telegramId, attendanceId } = body;

    if (!telegramId) {
      return NextResponse.json({ success: false, error: 'Missing telegramId' }, { status: 400 });
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ success: false, error: 'Database not configured' }, { status: 500 });
    }

    // Get employee by telegram ID
    const { data: employee, error: empError } = await supabaseAdmin
      .from('employees')
      .select('id, full_name, branch_id')
      .eq('telegram_id', telegramId.toString())
      .single();

    if (empError || !employee) {
      return NextResponse.json({ success: false, error: 'Employee not found' }, { status: 404 });
    }

    // Find active attendance record
    let attendance;
    if (attendanceId) {
      const { data, error } = await supabaseAdmin
        .from('attendance')
        .select('*, check_in_branch:branches!attendance_check_in_branch_id_fkey(id, name)')
        .eq('id', attendanceId)
        .single();

      if (!error && data) {
        attendance = data;
      }
    }

    // If no specific attendance, get active one
    if (!attendance) {
      const { data, error } = await supabaseAdmin
        .from('attendance')
        .select('*, check_in_branch:branches!attendance_check_in_branch_id_fkey(id, name)')
        .eq('employee_id', employee.id)
        .is('check_out', null)
        .order('date', { ascending: false })
        .limit(1)
        .single();

      if (error || !data) {
        return NextResponse.json({ success: false, error: 'No active check-in found' }, { status: 404 });
      }
      attendance = data;
    }

    // Check if IP matches any branch's office IPs
    const { data: branches } = await supabaseAdmin
      .from('branches')
      .select('id, name, office_ips')
      .not('office_ips', 'is', null);

    let ipMatched = false;
    let matchedBranch = null;
    for (const branch of branches || []) {
      if (branch.office_ips && Array.isArray(branch.office_ips)) {
        if (branch.office_ips.includes(clientIp)) {
          ipMatched = true;
          matchedBranch = branch;
          break;
        }
      }
    }

    // Create or update checkout reminder
    const { data: existingReminder } = await supabaseAdmin
      .from('checkout_reminders')
      .select('id')
      .eq('attendance_id', attendance.id)
      .in('status', ['pending', 'sent'])
      .limit(1);

    let reminderId: string;
    if (existingReminder && existingReminder.length > 0) {
      reminderId = existingReminder[0].id;
      // Update with IP info and set sent_at if not already set
      await supabaseAdmin
        .from('checkout_reminders')
        .update({
          ip_address: clientIp,
          ip_verified: ipMatched,
          status: 'sent',
          reminder_sent_at: new Date().toISOString(),
        })
        .eq('id', reminderId)
        .is('reminder_sent_at', null);

      // Also update IP info for records where sent_at is already set
      await supabaseAdmin
        .from('checkout_reminders')
        .update({
          ip_address: clientIp,
          ip_verified: ipMatched,
        })
        .eq('id', reminderId);
    } else {
      // Create new reminder
      const shiftType = attendance.check_in?.substring(0, 5) <= '15:30' ? 'day' : 'night';
      const { data: newReminder, error: reminderError } = await supabaseAdmin
        .from('checkout_reminders')
        .insert({
          employee_id: employee.id,
          attendance_id: attendance.id,
          shift_type: shiftType,
          status: 'sent',
          reminder_sent_at: new Date().toISOString(),
          ip_address: clientIp,
          ip_verified: ipMatched,
        })
        .select()
        .single();

      if (reminderError || !newReminder) {
        console.error('Failed to create reminder:', reminderError);
        return NextResponse.json({ success: false, error: 'Failed to create reminder' }, { status: 500 });
      }
      reminderId = newReminder.id;
    }

    return NextResponse.json({
      success: true,
      ipMatched,
      branchName: ipMatched ? matchedBranch?.name : (attendance.check_in_branch?.name || ''),
      attendanceId: attendance.id,
      reminderId,
      clientIp,
    });
  } catch (error) {
    console.error('Checkout check error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
