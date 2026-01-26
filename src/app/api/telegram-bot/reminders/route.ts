import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, isSupabaseAdminConfigured } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    if (!isSupabaseAdminConfigured()) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];
    const status = searchParams.get('status'); // pending, completed, scheduled, all
    const shiftType = searchParams.get('shift'); // day, night, all
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const format = searchParams.get('format'); // csv for export

    let query = supabaseAdmin!
      .from('checkout_reminders')
      .select(`
        *,
        employees(id, full_name, telegram_id, employee_id),
        attendance(id, check_in, check_out, date)
      `)
      .gte('created_at', `${date}T00:00:00`)
      .lte('created_at', `${date}T23:59:59`)
      .order('created_at', { ascending: false });

    // Only apply pagination for non-CSV requests
    if (format !== 'csv') {
      query = query.range(offset, offset + limit - 1);
    }

    // Apply filters
    if (status && status !== 'all') {
      if (status === 'pending') {
        query = query.in('status', ['pending', 'sent']);
      } else if (status === 'completed') {
        query = query.in('status', ['completed', 'responded']);
      } else if (status === 'scheduled') {
        query = query.eq('status', 'scheduled');
      }
    }

    if (shiftType && shiftType !== 'all') {
      query = query.eq('shift_type', shiftType);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching reminders:', error);
      return NextResponse.json({ error: 'Failed to fetch reminders' }, { status: 500 });
    }

    // Format the data for the frontend
    const reminders = (data || []).map(reminder => ({
      id: reminder.id,
      employeeId: reminder.employee_id,
      employeeName: reminder.employees?.full_name || 'Unknown',
      employeeCode: reminder.employees?.employee_id || '',
      telegramId: reminder.employees?.telegram_id,
      shiftType: reminder.shift_type,
      status: reminder.status,
      responseType: reminder.response_type,
      ipVerified: reminder.ip_verified,
      ipAddress: reminder.ip_address,
      sentAt: reminder.reminder_sent_at,
      respondedAt: reminder.response_received_at,
      scheduledFor: reminder.scheduled_for,
      createdAt: reminder.created_at,
      attendance: reminder.attendance ? {
        id: reminder.attendance.id,
        checkIn: reminder.attendance.check_in,
        checkOut: reminder.attendance.check_out,
        date: reminder.attendance.date,
      } : null,
    }));

    // Return CSV if requested
    if (format === 'csv') {
      const csvHeader = 'Employee Name,Employee Code,Shift Type,Status,Response,IP Verified,IP Address,Sent At,Responded At\n';
      const csvRows = reminders.map(r => {
        const responseLabels: Record<string, string> = {
          'i_left': 'I left',
          'im_at_work': 'At work',
          '45min': '45 minutes',
          '2hours': '2 hours',
          'all_day': 'All day',
        };
        return [
          `"${r.employeeName}"`,
          r.employeeCode,
          r.shiftType,
          r.status,
          r.responseType ? responseLabels[r.responseType] || r.responseType : '',
          r.ipVerified ? 'Yes' : 'No',
          r.ipAddress || '',
          r.sentAt ? new Date(r.sentAt).toLocaleString() : '',
          r.respondedAt ? new Date(r.respondedAt).toLocaleString() : '',
        ].join(',');
      }).join('\n');

      const csv = csvHeader + csvRows;

      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="checkout-reminders-${date}.csv"`,
        },
      });
    }

    // Get total count for pagination
    const { count } = await supabaseAdmin!
      .from('checkout_reminders')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', `${date}T00:00:00`)
      .lte('created_at', `${date}T23:59:59`);

    return NextResponse.json({
      success: true,
      reminders,
      total: count || 0,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Reminders list error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Retry failed reminders
export async function POST(request: NextRequest) {
  try {
    if (!isSupabaseAdminConfigured()) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const body = await request.json();
    const { action, reminderId, reminderIds } = body;

    if (action === 'retry') {
      // Reset status to pending for retry
      const ids = reminderIds || (reminderId ? [reminderId] : []);
      if (ids.length === 0) {
        return NextResponse.json({ error: 'No reminder IDs provided' }, { status: 400 });
      }

      const { error } = await supabaseAdmin!
        .from('checkout_reminders')
        .update({ status: 'pending', reminder_sent_at: null })
        .in('id', ids);

      if (error) {
        return NextResponse.json({ error: 'Failed to retry reminders' }, { status: 500 });
      }

      return NextResponse.json({ success: true, retriedCount: ids.length });
    }

    if (action === 'retry-all-pending') {
      // Get today's date
      const today = new Date().toISOString().split('T')[0];

      // Find all pending/sent reminders for today
      const { data: pendingReminders, error: fetchError } = await supabaseAdmin!
        .from('checkout_reminders')
        .select('id')
        .in('status', ['pending', 'sent'])
        .gte('created_at', `${today}T00:00:00`)
        .lte('created_at', `${today}T23:59:59`);

      if (fetchError) {
        console.error('Error fetching pending reminders:', fetchError);
        return NextResponse.json({ error: 'Failed to fetch pending reminders' }, { status: 500 });
      }

      if (!pendingReminders || pendingReminders.length === 0) {
        return NextResponse.json({ success: true, count: 0, message: 'No pending reminders to retry' });
      }

      const ids = pendingReminders.map(r => r.id);

      // Reset status to pending for retry
      const { error: updateError } = await supabaseAdmin!
        .from('checkout_reminders')
        .update({ status: 'pending', reminder_sent_at: null })
        .in('id', ids);

      if (updateError) {
        console.error('Error updating reminders:', updateError);
        return NextResponse.json({ error: 'Failed to retry reminders' }, { status: 500 });
      }

      return NextResponse.json({ success: true, count: ids.length });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Reminder action error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
