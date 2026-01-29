import { supabaseAdmin, isSupabaseAdminConfigured, Attendance, getTashkentDateString } from './connection';
import { getEmployees } from './employees';

// ============================================
// ATTENDANCE
// ============================================

export async function getTodayAttendance(): Promise<Attendance[]> {
  if (!isSupabaseAdminConfigured()) {
    // Return empty for static data (no real attendance)
    return [];
  }

  // Use Tashkent timezone for "today" - consistent with bot
  const today = getTashkentDateString();

  const { data, error } = await supabaseAdmin!
    .from('attendance')
    .select(`
      *,
      employees(full_name, employee_id, position),
      check_in_branch:branches!attendance_check_in_branch_id_fkey(name),
      check_out_branch:branches!attendance_check_out_branch_id_fkey(name)
    `)
    .eq('date', today)
    .order('check_in', { ascending: false });

  if (error) {
    console.error('Error fetching today attendance:', error);
    return [];
  }

  return data || [];
}

export async function getAttendanceByDate(date: string): Promise<Attendance[]> {
  if (!isSupabaseAdminConfigured()) {
    return [];
  }

  // Run all 3 queries in parallel for better performance
  const [todayResult, activeOvernightResult, checkoutOnDateResult] = await Promise.all([
    // Query 1: Get attendance records for the requested date
    supabaseAdmin!
      .from('attendance')
      .select(`
        *,
        employees(full_name, employee_id, position),
        check_in_branch:branches!attendance_check_in_branch_id_fkey(name),
        check_out_branch:branches!attendance_check_out_branch_id_fkey(name)
      `)
      .eq('date', date)
      .order('check_in', { ascending: false }),

    // Query 2: Fetch records that started on a previous day but are still active (no checkout)
    supabaseAdmin!
      .from('attendance')
      .select(`
        *,
        employees(full_name, employee_id, position),
        check_in_branch:branches!attendance_check_in_branch_id_fkey(name),
        check_out_branch:branches!attendance_check_out_branch_id_fkey(name)
      `)
      .lt('date', date)
      .is('check_out', null),

    // Query 3: Fetch records that checked out on the viewing date
    supabaseAdmin!
      .from('attendance')
      .select(`
        *,
        employees(full_name, employee_id, position),
        check_in_branch:branches!attendance_check_in_branch_id_fkey(name),
        check_out_branch:branches!attendance_check_out_branch_id_fkey(name)
      `)
      .lt('date', date)
      .not('check_out', 'is', null)
      .gte('check_out_timestamp', `${date}T00:00:00`)
      .lt('check_out_timestamp', `${date}T23:59:59`),
  ]);

  if (todayResult.error) {
    console.error('Error fetching attendance by date:', todayResult.error);
  }
  if (activeOvernightResult.error) {
    console.error('Error fetching active overnight attendance:', activeOvernightResult.error);
  }
  if (checkoutOnDateResult.error) {
    console.error('Error fetching checkout-on-date attendance:', checkoutOnDateResult.error);
  }

  const data = todayResult.data || [];
  const activeOvernightData = activeOvernightResult.data || [];
  const checkoutOnDateData = checkoutOnDateResult.data || [];

  // Mark overnight records and combine with today's records
  const overnightRecords = [
    ...activeOvernightData.map(record => ({
      ...record,
      is_overnight: true,
      overnight_from_date: record.date,
    })),
    ...checkoutOnDateData.map(record => ({
      ...record,
      is_overnight: true,
      overnight_from_date: record.date,
      is_checkout_day: true,
    })),
  ];

  // Filter out employees who already have a record for today (avoid duplicates)
  const todayEmployeeIds = new Set(data.map(r => r.employee_id));
  const filteredOvernightRecords = overnightRecords.filter(
    r => !todayEmployeeIds.has(r.employee_id)
  );

  return [...data, ...filteredOvernightRecords];
}

export async function getAttendanceByEmployee(employeeId: string, days: number = 30): Promise<Attendance[]> {
  if (!isSupabaseAdminConfigured()) {
    return [];
  }

  const { data, error } = await supabaseAdmin!
    .from('attendance')
    .select(`
      *,
      check_in_branch:branches!attendance_check_in_branch_id_fkey(name),
      check_out_branch:branches!attendance_check_out_branch_id_fkey(name)
    `)
    .eq('employee_id', employeeId)
    .order('date', { ascending: false })
    .limit(days);

  if (error) {
    console.error('Error fetching employee attendance:', error);
    return [];
  }

  return data || [];
}

export async function getAttendanceStats(date?: string) {
  // Use Tashkent timezone for default "today" - consistent with bot
  const targetDate = date || getTashkentDateString();
  const attendance = await getAttendanceByDate(targetDate);
  const employees = await getEmployees();
  // Only count active employees for attendance stats
  const activeEmployees = employees.filter(e => e.status === 'active');

  return {
    total: activeEmployees.length,
    // Present = currently in office (checked in but not checked out), includes both on-time and late arrivals
    present: attendance.filter(a => (a.status === 'present' || a.status === 'late') && !a.check_out).length,
    late: attendance.filter(a => a.status === 'late').length,
    earlyLeave: attendance.filter(a => a.status === 'early_leave').length,
    absent: activeEmployees.length - attendance.length,
    checkedOut: attendance.filter(a => a.check_out).length,
  };
}

// Get attendance for an employee within a date range (for monthly reports)
export async function getAttendanceByEmployeeAndMonth(
  employeeId: string,
  year: number,
  month: number
): Promise<Attendance[]> {
  if (!isSupabaseAdminConfigured()) {
    return [];
  }

  // Calculate start and end of month
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

  const { data, error } = await supabaseAdmin!
    .from('attendance')
    .select(`
      *,
      check_in_branch:branches!attendance_check_in_branch_id_fkey(name),
      check_out_branch:branches!attendance_check_out_branch_id_fkey(name)
    `)
    .eq('employee_id', employeeId)
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: true });

  if (error) {
    console.error('Error fetching monthly attendance:', error);
    return [];
  }

  return data || [];
}
