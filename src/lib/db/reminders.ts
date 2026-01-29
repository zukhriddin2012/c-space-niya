import { supabaseAdmin, isSupabaseAdminConfigured } from './connection';

export interface CheckoutReminder {
  id: string;
  employee_id: string;
  attendance_id: string;
  shift_type: 'day' | 'night';
  status: 'pending' | 'sent' | 'scheduled' | 'responded' | 'completed' | 'auto_completed';
  reminder_sent_at: string | null;  // When reminder was sent
  response_received_at: string | null;
  response_type: string | null;
  ip_address: string | null;
  ip_verified: boolean | null;
  scheduled_for: string | null;
  created_at: string;
  employees?: { full_name: string };
}

// Get reminders for attendance records on a specific date
export async function getCheckoutRemindersForDate(date: string): Promise<CheckoutReminder[]> {
  if (!isSupabaseAdminConfigured()) {
    return [];
  }

  // Get all attendance IDs for this date
  const { data: attendance, error: attError } = await supabaseAdmin!
    .from('attendance')
    .select('id, employee_id')
    .eq('date', date);

  if (attError || !attendance || attendance.length === 0) {
    return [];
  }

  const attendanceIds = attendance.map(a => a.id);

  // Get reminders for these attendance records
  const { data, error } = await supabaseAdmin!
    .from('checkout_reminders')
    .select(`
      *,
      employees(full_name)
    `)
    .in('attendance_id', attendanceIds)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching checkout reminders:', error);
    return [];
  }

  return data || [];
}

// Get the latest reminder for a specific attendance record
export async function getLatestReminderForAttendance(attendanceId: string): Promise<CheckoutReminder | null> {
  if (!isSupabaseAdminConfigured()) {
    return null;
  }

  const { data, error } = await supabaseAdmin!
    .from('checkout_reminders')
    .select('*')
    .eq('attendance_id', attendanceId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    // No reminder found is not an error
    return null;
  }

  return data;
}

// Get reminders grouped by attendance_id for efficient lookup
export async function getCheckoutRemindersMap(date: string): Promise<Map<string, CheckoutReminder[]>> {
  const reminders = await getCheckoutRemindersForDate(date);
  const map = new Map<string, CheckoutReminder[]>();

  for (const reminder of reminders) {
    const existing = map.get(reminder.attendance_id) || [];
    existing.push(reminder);
    map.set(reminder.attendance_id, existing);
  }

  return map;
}

// Get reminders for specific attendance IDs (useful for overnight records)
export async function getCheckoutRemindersByAttendanceIds(attendanceIds: string[]): Promise<Map<string, CheckoutReminder[]>> {
  if (!isSupabaseAdminConfigured() || attendanceIds.length === 0) {
    return new Map();
  }

  const { data, error } = await supabaseAdmin!
    .from('checkout_reminders')
    .select(`
      *,
      employees(full_name)
    `)
    .in('attendance_id', attendanceIds)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching checkout reminders by IDs:', error);
    return new Map();
  }

  const map = new Map<string, CheckoutReminder[]>();
  for (const reminder of (data || [])) {
    const existing = map.get(reminder.attendance_id) || [];
    existing.push(reminder);
    map.set(reminder.attendance_id, existing);
  }

  return map;
}
