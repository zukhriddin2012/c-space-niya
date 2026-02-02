import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// Get Tashkent time
function getTashkentTime() {
  const now = new Date();
  const tashkent = new Date(now.getTime() + (5 * 60 * 60 * 1000));
  return tashkent;
}

// Detect shift type from employee position or check-in time
function detectShift(position: string | null): 'day' | 'night' {
  // Check if position indicates night shift
  if (position && /night/i.test(position)) {
    return 'night';
  }
  // Otherwise, infer from check-in time:
  // If checking in between 15:00-23:59, likely night shift
  const tashkent = getTashkentTime();
  const hour = tashkent.getUTCHours();
  if (hour >= 15 && hour <= 23) {
    return 'night';
  }
  return 'day';
}

// Check if employee is late
function isLate(shiftId: string): boolean {
  const tashkent = getTashkentTime();
  const hour = tashkent.getUTCHours();
  const minute = tashkent.getUTCMinutes();
  const currentMinutes = hour * 60 + minute;
  const lateThreshold = shiftId === 'night' ? 18 * 60 + 15 : 9 * 60 + 15;
  return currentMinutes > lateThreshold;
}

export async function POST(request: NextRequest) {
  try {
    // Get the client's IP address
    const forwardedFor = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    const clientIp = forwardedFor?.split(',')[0]?.trim() || realIp || 'unknown';

    const body = await request.json();
    const { telegramId, shiftId: providedShiftId, remoteCheckin = false } = body;

    if (!telegramId) {
      return NextResponse.json({ success: false, error: 'Missing telegramId' }, { status: 400 });
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ success: false, error: 'Database not configured' }, { status: 500 });
    }

    // Get employee by telegram ID (including preferred_language and remote_work_enabled)
    const { data: employee, error: empError } = await supabaseAdmin
      .from('employees')
      .select('id, full_name, position, branch_id, preferred_language, remote_work_enabled')
      .eq('telegram_id', telegramId.toString())
      .single();

    if (empError || !employee) {
      return NextResponse.json({ success: false, error: 'Employee not found' }, { status: 404 });
    }

    // Auto-detect shift from position or time if not provided
    const shiftId = providedShiftId || detectShift(employee.position);

    // Check if employee has active check-in (use maybeSingle to handle 0 rows)
    const { data: activeCheckin } = await supabaseAdmin
      .from('attendance')
      .select('id, check_in')
      .eq('employee_id', employee.id)
      .is('check_out', null)
      .order('date', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (activeCheckin) {
      return NextResponse.json({
        success: false,
        error: 'active_checkin',
        message: 'You already have an active check-in',
        checkIn: activeCheckin.check_in?.substring(0, 5),
      }, { status: 400 });
    }

    // Handle remote check-in (user already chose "Working remotely")
    console.log('📡 ip-checkin called with remoteCheckin:', remoteCheckin);
    if (remoteCheckin) {
      // Verify employee has remote work enabled
      if (!employee.remote_work_enabled) {
        console.log('📡 Remote check-in denied - employee does not have remote_work_enabled:', employee.id);
        return NextResponse.json({
          success: false,
          error: 'remote_not_enabled',
          message: 'Remote work is not enabled for this employee',
        }, { status: 403 });
      }

      console.log('📡 Processing remote check-in for employee:', employee.id, 'branch_id:', employee.branch_id);
      const tashkent = getTashkentTime();
      const checkInTime = tashkent.toISOString().substring(11, 19);
      const today = tashkent.toISOString().split('T')[0];
      const late = isLate(shiftId);

      // Build insert data - branch_id is optional for remote check-ins
      const insertData: Record<string, unknown> = {
        employee_id: employee.id,
        date: today,
        check_in: checkInTime,
        check_in_latitude: 0,
        check_in_longitude: 0,
        shift_id: shiftId,
        status: late ? 'late' : 'present',
        verification_type: 'remote',
        is_remote: true,
      };

      // Only include branch_id if employee has one assigned
      if (employee.branch_id) {
        insertData.check_in_branch_id = employee.branch_id;
      }

      const { data: attendance, error: attError } = await supabaseAdmin
        .from('attendance')
        .insert(insertData)
        .select()
        .single();

      if (attError) {
        console.error('Remote check-in error:', attError);
        // Check if it's a unique constraint violation (duplicate check-in for same day)
        if (attError.code === '23505') {
          return NextResponse.json({
            success: false,
            error: 'duplicate_checkin',
            message: 'You already have a check-in record for today. Please check out first or contact admin.',
          }, { status: 409 });
        }
        return NextResponse.json({ success: false, error: 'Failed to record check-in', details: attError.message }, { status: 500 });
      }

      console.log('📡 Remote check-in success, attendance:', attendance?.id, 'verification_type:', attendance?.verification_type);

      const responseData = {
        id: attendance.id,
        checkIn: checkInTime.substring(0, 5),
        branchId: employee.branch_id,
        branchName: 'Remote',
        verificationType: 'remote',
        isLate: late,
        isRemote: true,
        shiftId,
        employeeName: employee.full_name,
        language: employee.preferred_language || 'uz',
      };

      return NextResponse.json({
        success: true,
        data: responseData,
      });
    }

    // Check if IP matches any branch's office IPs
    const { data: branches, error: branchError } = await supabaseAdmin
      .from('branches')
      .select('id, name, office_ips, latitude, longitude')
      .not('office_ips', 'is', null);

    if (branchError) {
      return NextResponse.json({ success: false, error: 'Failed to fetch branches' }, { status: 500 });
    }

    // Find matching branch by IP
    let matchedBranch = null;
    for (const branch of branches || []) {
      if (branch.office_ips && Array.isArray(branch.office_ips)) {
        if (branch.office_ips.includes(clientIp)) {
          matchedBranch = branch;
          break;
        }
      }
    }

    if (!matchedBranch) {
      // IP doesn't match - check if employee has remote work enabled
      const remoteWorkEnabled = employee.remote_work_enabled === true;

      // Notify bot to prompt for GPS or show remote work options
      const botWebhookUrl = process.env.TELEGRAM_BOT_WEBHOOK_URL;
      const botWebhookSecret = process.env.TELEGRAM_BOT_WEBHOOK_SECRET;

      // Notify bot via webhook (must await for Vercel serverless)
      if (botWebhookUrl && botWebhookSecret) {
        try {
          await fetch(`${botWebhookUrl}/webhook/checkin`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${botWebhookSecret}`,
            },
            body: JSON.stringify({
              telegramId,
              success: false,
              action: remoteWorkEnabled ? 'remote_choice' : 'need_gps',
              remoteWorkEnabled,
            }),
          });
        } catch (err) {
          console.error('Failed to notify bot webhook:', err);
        }
      }

      return NextResponse.json({
        success: false,
        error: 'ip_not_matched',
        message: 'Office network not detected',
        detectedIp: clientIp,
        remoteWorkEnabled,
      }, { status: 200 });
    }

    // IP matches - record check-in
    const tashkent = getTashkentTime();
    const checkInTime = tashkent.toISOString().substring(11, 19);
    const today = tashkent.toISOString().split('T')[0];
    const late = isLate(shiftId);

    const { data: attendance, error: attError } = await supabaseAdmin
      .from('attendance')
      .insert({
        employee_id: employee.id,
        date: today,
        check_in: checkInTime,
        check_in_branch_id: matchedBranch.id,
        check_in_latitude: matchedBranch.latitude || 0,
        check_in_longitude: matchedBranch.longitude || 0,
        shift_id: shiftId,
        status: late ? 'late' : 'present',
        verification_type: 'ip',
        ip_address: clientIp,
      })
      .select()
      .single();

    if (attError) {
      console.error('Check-in error:', attError);
      return NextResponse.json({ success: false, error: 'Failed to record check-in' }, { status: 500 });
    }

    const responseData = {
      id: attendance.id,
      checkIn: checkInTime.substring(0, 5),
      branchId: matchedBranch.id,
      branchName: matchedBranch.name,
      verificationType: 'ip',
      isLate: late,
      shiftId,
      employeeName: employee.full_name,
      language: employee.preferred_language || 'uz',
    };

    // Notify Telegram bot via webhook (must await for Vercel serverless)
    const botWebhookUrl = process.env.TELEGRAM_BOT_WEBHOOK_URL;
    const botWebhookSecret = process.env.TELEGRAM_BOT_WEBHOOK_SECRET;

    if (botWebhookUrl && botWebhookSecret) {
      try {
        const webhookResponse = await fetch(`${botWebhookUrl}/webhook/checkin`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${botWebhookSecret}`,
          },
          body: JSON.stringify({
            telegramId,
            success: true,
            data: responseData,
          }),
        });
        console.log('Webhook response:', webhookResponse.status);
      } catch (err) {
        console.error('Failed to notify bot webhook:', err);
      }
    }

    return NextResponse.json({
      success: true,
      data: responseData,
    });
  } catch (error) {
    console.error('IP check-in error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

// GET endpoint to check IP status (for testing/debugging)
export async function GET(request: NextRequest) {
  const forwardedFor = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const clientIp = forwardedFor?.split(',')[0]?.trim() || realIp || 'unknown';

  if (!supabaseAdmin) {
    return NextResponse.json({ ip: clientIp, matched: false, error: 'Database not configured' });
  }

  // Check if IP matches any branch
  const { data: branches } = await supabaseAdmin
    .from('branches')
    .select('id, name, office_ips')
    .not('office_ips', 'is', null);

  let matchedBranch = null;
  for (const branch of branches || []) {
    if (branch.office_ips && Array.isArray(branch.office_ips)) {
      if (branch.office_ips.includes(clientIp)) {
        matchedBranch = branch;
        break;
      }
    }
  }

  // Also check latest attendance for debugging
  const telegramId = request.nextUrl.searchParams.get('telegramId');
  let latestAttendance = null;
  if (telegramId) {
    const { data: emp } = await supabaseAdmin
      .from('employees')
      .select('id')
      .eq('telegram_id', telegramId)
      .single();

    if (emp) {
      const { data: att } = await supabaseAdmin
        .from('attendance')
        .select('id, verification_type, check_in, date, status')
        .eq('employee_id', emp.id)
        .order('date', { ascending: false })
        .order('check_in', { ascending: false })
        .limit(1)
        .single();
      latestAttendance = att;
    }
  }

  return NextResponse.json({
    ip: clientIp,
    matched: !!matchedBranch,
    branch: matchedBranch ? { id: matchedBranch.id, name: matchedBranch.name } : null,
    latestAttendance,
  });
}
