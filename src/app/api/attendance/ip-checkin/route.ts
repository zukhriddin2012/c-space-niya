import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// Get Tashkent time
function getTashkentTime() {
  const now = new Date();
  const tashkent = new Date(now.getTime() + (5 * 60 * 60 * 1000));
  return tashkent;
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
    const { telegramId, shiftId = 'day' } = body;

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

    // Check if employee has active check-in
    const { data: activeCheckin } = await supabaseAdmin
      .from('attendance')
      .select('id, check_in')
      .eq('employee_id', employee.id)
      .is('check_out', null)
      .order('date', { ascending: false })
      .limit(1)
      .single();

    if (activeCheckin) {
      return NextResponse.json({
        success: false,
        error: 'active_checkin',
        message: 'You already have an active check-in',
        checkIn: activeCheckin.check_in?.substring(0, 5),
      }, { status: 400 });
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

  return NextResponse.json({
    ip: clientIp,
    matched: !!matchedBranch,
    branch: matchedBranch ? { id: matchedBranch.id, name: matchedBranch.name } : null,
  });
}
