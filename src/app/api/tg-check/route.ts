import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, isSupabaseAdminConfigured } from '@/lib/supabase';

// CORS headers for Telegram WebApp
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, Accept',
  'Access-Control-Max-Age': '86400',
};

// Get client IP address from request
function getClientIp(request: NextRequest): string {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) return forwardedFor.split(',')[0].trim();
  const realIp = request.headers.get('x-real-ip');
  if (realIp) return realIp;
  const cfConnectingIp = request.headers.get('cf-connecting-ip');
  if (cfConnectingIp) return cfConnectingIp;
  return 'unknown';
}

// Check if IP matches any branch's office IPs
async function checkIpAgainstBranches(ipAddress: string) {
  if (!isSupabaseAdminConfigured() || !ipAddress || ipAddress === 'unknown') {
    return { matched: false, branch: null };
  }

  try {
    const { data: branches, error } = await supabaseAdmin!
      .from('branches')
      .select('id, name, office_ips')
      .not('office_ips', 'is', null);

    if (error || !branches) return { matched: false, branch: null };

    for (const branch of branches) {
      if (branch.office_ips && Array.isArray(branch.office_ips)) {
        if (branch.office_ips.includes(ipAddress)) {
          return { matched: true, branch: { id: branch.id, name: branch.name } };
        }
      }
    }
    return { matched: false, branch: null };
  } catch {
    return { matched: false, branch: null };
  }
}

// Handle OPTIONS for CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}

// Handle GET for testing
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'Use POST with telegramId and attendanceId',
    timestamp: new Date().toISOString()
  }, { headers: corsHeaders });
}

export async function POST(request: NextRequest) {
  console.log('[TgCheck] POST request received');

  try {
    const body = await request.json();
    const { telegramId, attendanceId } = body;

    console.log('[TgCheck] Body:', { telegramId, attendanceId });

    if (!telegramId) {
      return NextResponse.json({ success: false, error: 'Missing telegramId' }, { status: 400, headers: corsHeaders });
    }

    if (!isSupabaseAdminConfigured()) {
      return NextResponse.json({ success: false, error: 'Database not configured' }, { status: 500, headers: corsHeaders });
    }

    const clientIp = getClientIp(request);
    console.log(`[TgCheck] Telegram ID: ${telegramId}, IP: ${clientIp}`);

    // Get employee by telegram ID
    const { data: employee, error: empError } = await supabaseAdmin!
      .from('employees')
      .select('id, full_name, branch_id')
      .eq('telegram_id', telegramId)
      .single();

    if (empError || !employee) {
      return NextResponse.json({ success: false, error: 'Employee not found' }, { status: 404, headers: corsHeaders });
    }

    // Find active attendance record
    let attendance;
    if (attendanceId) {
      const { data, error } = await supabaseAdmin!
        .from('attendance')
        .select('*, check_in_branch:branches!attendance_check_in_branch_id_fkey(id, name)')
        .eq('id', attendanceId)
        .single();
      if (!error && data) attendance = data;
    }

    if (!attendance) {
      const { data, error } = await supabaseAdmin!
        .from('attendance')
        .select('*, check_in_branch:branches!attendance_check_in_branch_id_fkey(id, name)')
        .eq('employee_id', employee.id)
        .is('check_out', null)
        .order('date', { ascending: false })
        .limit(1)
        .single();

      if (error || !data) {
        return NextResponse.json({ success: false, error: 'No active check-in found' }, { status: 404, headers: corsHeaders });
      }
      attendance = data;
    }

    const ipCheck = await checkIpAgainstBranches(clientIp);

    // Create or update checkout reminder
    const { data: existingReminder } = await supabaseAdmin!
      .from('checkout_reminders')
      .select('id')
      .eq('attendance_id', attendance.id)
      .in('status', ['pending', 'sent'])
      .limit(1);

    let reminderId: string;
    if (existingReminder && existingReminder.length > 0) {
      reminderId = existingReminder[0].id;
      await supabaseAdmin!
        .from('checkout_reminders')
        .update({ ip_address: clientIp, ip_verified: ipCheck.matched })
        .eq('id', reminderId);
    } else {
      const shiftType = attendance.check_in?.substring(0, 5) <= '15:30' ? 'day' : 'night';
      const { data: newReminder, error: reminderError } = await supabaseAdmin!
        .from('checkout_reminders')
        .insert({
          employee_id: employee.id,
          attendance_id: attendance.id,
          shift_type: shiftType,
          status: 'sent',
          reminder_sent_at: new Date().toISOString(),
          ip_address: clientIp,
          ip_verified: ipCheck.matched,
        })
        .select()
        .single();

      if (reminderError || !newReminder) {
        console.error('Failed to create reminder:', reminderError);
        return NextResponse.json({ success: false, error: 'Failed to create reminder' }, { status: 500, headers: corsHeaders });
      }
      reminderId = newReminder.id;
    }

    return NextResponse.json({
      success: true,
      ipMatched: ipCheck.matched,
      branchName: ipCheck.matched ? ipCheck.branch?.name : (attendance.check_in_branch?.name || ''),
      attendanceId: attendance.id,
      reminderId,
      clientIp,
    }, { headers: corsHeaders });
  } catch (error) {
    console.error('[TgCheck] Error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500, headers: corsHeaders });
  }
}
