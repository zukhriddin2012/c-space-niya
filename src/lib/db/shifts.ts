import { supabaseAdmin, isSupabaseAdminConfigured } from './connection';

// ============================================
// SHIFT PLANNING TYPES
// ============================================

export type ShiftType = 'day' | 'night';
export type ScheduleStatus = 'draft' | 'published' | 'locked';
export type TimeOffStatus = 'pending' | 'approved' | 'rejected';

export interface ShiftSchedule {
  id: string;
  week_start_date: string;  // YYYY-MM-DD (always Monday)
  status: ScheduleStatus;
  published_at: string | null;
  published_by: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ShiftAssignment {
  id: string;
  schedule_id: string;
  branch_id: string;
  date: string;  // YYYY-MM-DD
  shift_type: ShiftType;
  employee_id: string;
  role: string;
  confirmed_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  employees?: { full_name: string; employee_id: string; position: string };
  branches?: { name: string };
}

export interface BranchShiftRequirement {
  id: string;
  branch_id: string;
  shift_type: ShiftType;
  min_staff: number;
  max_staff: number | null;
  has_shift: boolean;
  created_at: string;
  updated_at: string;
  // Joined data
  branches?: { name: string };
}

export interface TimeOffRequest {
  id: string;
  employee_id: string;
  start_date: string;
  end_date: string;
  total_days: number;
  reason: string | null;
  status: TimeOffStatus;
  auto_approved: boolean;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  // Joined data
  employees?: { full_name: string };
  reviewer?: { full_name: string };
}

export interface EmployeeAvailability {
  id: string;
  employee_id: string;
  day_of_week: number;  // 0=Sunday, 1=Monday, ..., 6=Saturday
  available_day: boolean;
  available_night: boolean;
  effective_from: string;
  created_at: string;
  updated_at: string;
}

// Input types for creating/updating
export interface CreateScheduleInput {
  week_start_date: string;
  notes?: string;
}

export interface CreateAssignmentInput {
  schedule_id: string;
  branch_id: string;
  date: string;
  shift_type: ShiftType;
  employee_id: string;
  role?: string;
  notes?: string;
}

export interface CreateTimeOffInput {
  employee_id: string;
  start_date: string;
  end_date: string;
  reason?: string;
}

export interface UpdateAvailabilityInput {
  employee_id: string;
  day_of_week: number;
  available_day: boolean;
  available_night: boolean;
  effective_from?: string;
}

// ============================================
// SHIFT SCHEDULES
// ============================================

export async function getScheduleByWeek(weekStartDate: string): Promise<ShiftSchedule | null> {
  if (!isSupabaseAdminConfigured()) return null;

  const { data, error } = await supabaseAdmin!
    .from('shift_schedules')
    .select('*')
    .eq('week_start_date', weekStartDate)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    console.error('Error fetching schedule:', error);
    return null;
  }
  return data;
}

export async function getSchedules(
  options: { status?: ScheduleStatus; limit?: number } = {}
): Promise<ShiftSchedule[]> {
  if (!isSupabaseAdminConfigured()) return [];

  let query = supabaseAdmin!
    .from('shift_schedules')
    .select('*')
    .order('week_start_date', { ascending: false });

  if (options.status) {
    query = query.eq('status', options.status);
  }

  if (options.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching schedules:', error);
    return [];
  }
  return data || [];
}

export async function createSchedule(input: CreateScheduleInput): Promise<ShiftSchedule | null> {
  if (!isSupabaseAdminConfigured()) return null;

  const { data, error } = await supabaseAdmin!
    .from('shift_schedules')
    .insert(input)
    .select()
    .single();

  if (error) {
    console.error('Error creating schedule:', error);
    return null;
  }
  return data;
}

export async function updateSchedule(
  scheduleId: string,
  updates: Partial<Pick<ShiftSchedule, 'notes' | 'status'>>
): Promise<ShiftSchedule | null> {
  if (!isSupabaseAdminConfigured()) return null;

  const { data, error } = await supabaseAdmin!
    .from('shift_schedules')
    .update(updates)
    .eq('id', scheduleId)
    .select()
    .single();

  if (error) {
    console.error('Error updating schedule:', error);
    return null;
  }
  return data;
}

export async function publishSchedule(scheduleId: string, publisherId: string): Promise<boolean> {
  if (!isSupabaseAdminConfigured()) return false;

  const { error } = await supabaseAdmin!
    .from('shift_schedules')
    .update({
      status: 'published',
      published_at: new Date().toISOString(),
      published_by: publisherId,
    })
    .eq('id', scheduleId);

  if (error) {
    console.error('Error publishing schedule:', error);
    return false;
  }
  return true;
}

export async function lockSchedule(scheduleId: string): Promise<boolean> {
  if (!isSupabaseAdminConfigured()) return false;

  const { error } = await supabaseAdmin!
    .from('shift_schedules')
    .update({ status: 'locked' })
    .eq('id', scheduleId);

  if (error) {
    console.error('Error locking schedule:', error);
    return false;
  }
  return true;
}

// ============================================
// SHIFT ASSIGNMENTS
// ============================================

export async function getAssignmentsBySchedule(scheduleId: string): Promise<ShiftAssignment[]> {
  if (!isSupabaseAdminConfigured()) return [];

  const { data, error } = await supabaseAdmin!
    .from('shift_assignments')
    .select(`
      *,
      employees(full_name, employee_id, position),
      branches(name)
    `)
    .eq('schedule_id', scheduleId)
    .order('date')
    .order('shift_type');

  if (error) {
    console.error('Error fetching assignments:', error);
    return [];
  }
  return data || [];
}

export async function getAssignmentsByBranchAndSchedule(
  scheduleId: string,
  branchId: string
): Promise<ShiftAssignment[]> {
  if (!isSupabaseAdminConfigured()) return [];

  const { data, error } = await supabaseAdmin!
    .from('shift_assignments')
    .select(`
      *,
      employees(full_name, employee_id, position),
      branches(name)
    `)
    .eq('schedule_id', scheduleId)
    .eq('branch_id', branchId)
    .order('date')
    .order('shift_type');

  if (error) {
    console.error('Error fetching branch assignments:', error);
    return [];
  }
  return data || [];
}

export async function getAssignmentsByEmployee(
  employeeId: string,
  fromDate: string,
  toDate: string
): Promise<ShiftAssignment[]> {
  if (!isSupabaseAdminConfigured()) return [];

  const { data, error } = await supabaseAdmin!
    .from('shift_assignments')
    .select(`
      *,
      branches(name),
      shift_schedules(status)
    `)
    .eq('employee_id', employeeId)
    .gte('date', fromDate)
    .lte('date', toDate)
    .order('date');

  if (error) {
    console.error('Error fetching employee assignments:', error);
    return [];
  }
  return data || [];
}

export async function getAssignmentsByDate(date: string): Promise<ShiftAssignment[]> {
  if (!isSupabaseAdminConfigured()) return [];

  const { data, error } = await supabaseAdmin!
    .from('shift_assignments')
    .select(`
      *,
      employees(full_name, employee_id, position),
      branches(name)
    `)
    .eq('date', date)
    .order('branch_id')
    .order('shift_type');

  if (error) {
    console.error('Error fetching assignments by date:', error);
    return [];
  }
  return data || [];
}

export async function createAssignment(input: CreateAssignmentInput): Promise<ShiftAssignment | null> {
  if (!isSupabaseAdminConfigured()) return null;

  const { data, error } = await supabaseAdmin!
    .from('shift_assignments')
    .insert(input)
    .select(`
      *,
      employees(full_name, employee_id, position),
      branches(name)
    `)
    .single();

  if (error) {
    console.error('Error creating assignment:', error);
    return null;
  }
  return data;
}

export async function updateAssignment(
  assignmentId: string,
  updates: Partial<Pick<ShiftAssignment, 'employee_id' | 'role' | 'notes'>>
): Promise<ShiftAssignment | null> {
  if (!isSupabaseAdminConfigured()) return null;

  const { data, error } = await supabaseAdmin!
    .from('shift_assignments')
    .update(updates)
    .eq('id', assignmentId)
    .select(`
      *,
      employees(full_name, employee_id, position),
      branches(name)
    `)
    .single();

  if (error) {
    console.error('Error updating assignment:', error);
    return null;
  }
  return data;
}

export async function deleteAssignment(assignmentId: string): Promise<boolean> {
  if (!isSupabaseAdminConfigured()) return false;

  const { error } = await supabaseAdmin!
    .from('shift_assignments')
    .delete()
    .eq('id', assignmentId);

  if (error) {
    console.error('Error deleting assignment:', error);
    return false;
  }
  return true;
}

export async function confirmAssignment(assignmentId: string): Promise<boolean> {
  if (!isSupabaseAdminConfigured()) return false;

  const { error } = await supabaseAdmin!
    .from('shift_assignments')
    .update({ confirmed_at: new Date().toISOString() })
    .eq('id', assignmentId);

  if (error) {
    console.error('Error confirming assignment:', error);
    return false;
  }
  return true;
}

// Check if employee is already assigned on a given date
export async function checkEmployeeConflict(
  employeeId: string,
  date: string,
  shiftType: ShiftType,
  excludeAssignmentId?: string
): Promise<boolean> {
  if (!isSupabaseAdminConfigured()) return false;

  let query = supabaseAdmin!
    .from('shift_assignments')
    .select('id')
    .eq('employee_id', employeeId)
    .eq('date', date)
    .eq('shift_type', shiftType);

  if (excludeAssignmentId) {
    query = query.neq('id', excludeAssignmentId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error checking conflict:', error);
    return false;
  }
  return (data?.length || 0) > 0;
}

// ============================================
// BRANCH REQUIREMENTS
// ============================================

export async function getBranchRequirements(branchId?: string): Promise<BranchShiftRequirement[]> {
  if (!isSupabaseAdminConfigured()) return [];

  let query = supabaseAdmin!
    .from('branch_shift_requirements')
    .select(`
      *,
      branches(name)
    `);

  if (branchId) {
    query = query.eq('branch_id', branchId);
  }

  const { data, error } = await query.order('branch_id');

  if (error) {
    console.error('Error fetching requirements:', error);
    return [];
  }
  return data || [];
}

export async function updateBranchRequirements(
  branchId: string,
  shiftType: ShiftType,
  updates: Partial<Pick<BranchShiftRequirement, 'min_staff' | 'max_staff' | 'has_shift'>>
): Promise<BranchShiftRequirement | null> {
  if (!isSupabaseAdminConfigured()) return null;

  const { data, error } = await supabaseAdmin!
    .from('branch_shift_requirements')
    .update(updates)
    .eq('branch_id', branchId)
    .eq('shift_type', shiftType)
    .select()
    .single();

  if (error) {
    console.error('Error updating requirements:', error);
    return null;
  }
  return data;
}

// ============================================
// TIME OFF REQUESTS
// ============================================

export async function createTimeOffRequest(input: CreateTimeOffInput): Promise<TimeOffRequest | null> {
  if (!isSupabaseAdminConfigured()) return null;

  const { data, error } = await supabaseAdmin!
    .from('time_off_requests')
    .insert(input)
    .select(`
      *,
      employees(full_name)
    `)
    .single();

  if (error) {
    console.error('Error creating time off request:', error);
    return null;
  }
  return data;
}

export async function getTimeOffByEmployee(employeeId: string): Promise<TimeOffRequest[]> {
  if (!isSupabaseAdminConfigured()) return [];

  const { data, error } = await supabaseAdmin!
    .from('time_off_requests')
    .select(`
      *,
      employees(full_name)
    `)
    .eq('employee_id', employeeId)
    .order('start_date', { ascending: false });

  if (error) {
    console.error('Error fetching time off:', error);
    return [];
  }
  return data || [];
}

export async function getPendingTimeOffRequests(): Promise<TimeOffRequest[]> {
  if (!isSupabaseAdminConfigured()) return [];

  const { data, error } = await supabaseAdmin!
    .from('time_off_requests')
    .select(`
      *,
      employees(full_name)
    `)
    .eq('status', 'pending')
    .order('created_at');

  if (error) {
    console.error('Error fetching pending requests:', error);
    return [];
  }
  return data || [];
}

export async function getTimeOffByDateRange(
  fromDate: string,
  toDate: string
): Promise<TimeOffRequest[]> {
  if (!isSupabaseAdminConfigured()) return [];

  const { data, error } = await supabaseAdmin!
    .from('time_off_requests')
    .select(`
      *,
      employees(full_name)
    `)
    .eq('status', 'approved')
    .lte('start_date', toDate)
    .gte('end_date', fromDate)
    .order('start_date');

  if (error) {
    console.error('Error fetching time off by date range:', error);
    return [];
  }
  return data || [];
}

export async function reviewTimeOffRequest(
  requestId: string,
  reviewerId: string,
  approved: boolean,
  reason?: string
): Promise<boolean> {
  if (!isSupabaseAdminConfigured()) return false;

  const updates: Record<string, unknown> = {
    status: approved ? 'approved' : 'rejected',
    reviewed_by: reviewerId,
    reviewed_at: new Date().toISOString(),
  };

  if (reason) {
    updates.reason = reason;
  }

  const { error } = await supabaseAdmin!
    .from('time_off_requests')
    .update(updates)
    .eq('id', requestId);

  if (error) {
    console.error('Error reviewing request:', error);
    return false;
  }
  return true;
}

// ============================================
// EMPLOYEE AVAILABILITY
// ============================================

export async function getEmployeeAvailability(employeeId: string): Promise<EmployeeAvailability[]> {
  if (!isSupabaseAdminConfigured()) return [];

  const { data, error } = await supabaseAdmin!
    .from('employee_availability')
    .select('*')
    .eq('employee_id', employeeId)
    .order('day_of_week');

  if (error) {
    console.error('Error fetching availability:', error);
    return [];
  }
  return data || [];
}

export async function setEmployeeAvailability(
  input: UpdateAvailabilityInput
): Promise<EmployeeAvailability | null> {
  if (!isSupabaseAdminConfigured()) return null;

  const { employee_id, day_of_week, available_day, available_night, effective_from } = input;

  const { data, error } = await supabaseAdmin!
    .from('employee_availability')
    .upsert(
      {
        employee_id,
        day_of_week,
        available_day,
        available_night,
        effective_from: effective_from || new Date().toISOString().split('T')[0],
      },
      { onConflict: 'employee_id,day_of_week,effective_from' }
    )
    .select()
    .single();

  if (error) {
    console.error('Error setting availability:', error);
    return null;
  }
  return data;
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

// Get employees available for a specific shift
export async function getAvailableEmployeesForShift(
  date: string,
  shiftType: ShiftType,
  branchId?: string
): Promise<{ id: string; full_name: string; position: string; is_floater: boolean; primary_branch_id: string | null }[]> {
  if (!isSupabaseAdminConfigured()) return [];

  // Get day of week (0=Sunday)
  const dayOfWeek = new Date(date).getDay();

  // Get all active employees
  let employeesQuery = supabaseAdmin!
    .from('employees')
    .select('id, full_name, position, is_floater, primary_branch_id, can_work_night')
    .eq('status', 'active');

  // Filter by night shift capability if night shift
  if (shiftType === 'night') {
    employeesQuery = employeesQuery.eq('can_work_night', true);
  }

  // Filter by branch if specified (include floaters and employees with no branch set)
  // Note: Include null primary_branch_id since column was recently added
  if (branchId) {
    employeesQuery = employeesQuery.or(`primary_branch_id.eq.${branchId},is_floater.eq.true,primary_branch_id.is.null`);
  }

  const { data: employees, error: empError } = await employeesQuery;

  if (empError || !employees) {
    console.error('Error fetching employees:', empError);
    return [];
  }

  // Get existing assignments for this date/shift
  const { data: existingAssignments } = await supabaseAdmin!
    .from('shift_assignments')
    .select('employee_id')
    .eq('date', date)
    .eq('shift_type', shiftType);

  const assignedIds = new Set((existingAssignments || []).map(a => a.employee_id));

  // Get approved time off for this date
  const { data: timeOff } = await supabaseAdmin!
    .from('time_off_requests')
    .select('employee_id')
    .eq('status', 'approved')
    .lte('start_date', date)
    .gte('end_date', date);

  const onTimeOffIds = new Set((timeOff || []).map(t => t.employee_id));

  // Get availability restrictions for this day
  const { data: availability } = await supabaseAdmin!
    .from('employee_availability')
    .select('employee_id, available_day, available_night')
    .eq('day_of_week', dayOfWeek)
    .lte('effective_from', date);

  const unavailableIds = new Set<string>();
  (availability || []).forEach(a => {
    const isAvailable = shiftType === 'day' ? a.available_day : a.available_night;
    if (!isAvailable) {
      unavailableIds.add(a.employee_id);
    }
  });

  // Filter available employees
  return employees
    .filter(emp =>
      !assignedIds.has(emp.id) &&
      !onTimeOffIds.has(emp.id) &&
      !unavailableIds.has(emp.id)
    )
    .map(emp => ({
      id: emp.id,
      full_name: emp.full_name,
      position: emp.position,
      is_floater: emp.is_floater || false,
      primary_branch_id: emp.primary_branch_id || null,
    }));
}

// Calculate coverage status for a schedule
export async function getScheduleCoverageStatus(scheduleId: string): Promise<{
  total_shifts: number;
  filled_shifts: number;
  empty_shifts: number;
  understaffed_shifts: number;
  coverage_percentage: number;
}> {
  if (!isSupabaseAdminConfigured()) {
    return { total_shifts: 0, filled_shifts: 0, empty_shifts: 0, understaffed_shifts: 0, coverage_percentage: 0 };
  }

  // Get schedule to find week dates
  const { data: schedule } = await supabaseAdmin!
    .from('shift_schedules')
    .select('week_start_date')
    .eq('id', scheduleId)
    .single();

  if (!schedule) return { total_shifts: 0, filled_shifts: 0, empty_shifts: 0, understaffed_shifts: 0, coverage_percentage: 0 };

  // Get all requirements
  const { data: requirements } = await supabaseAdmin!
    .from('branch_shift_requirements')
    .select('*')
    .eq('has_shift', true);

  if (!requirements) return { total_shifts: 0, filled_shifts: 0, empty_shifts: 0, understaffed_shifts: 0, coverage_percentage: 0 };

  // Get assignments for this schedule
  const { data: assignments } = await supabaseAdmin!
    .from('shift_assignments')
    .select('branch_id, date, shift_type')
    .eq('schedule_id', scheduleId);

  // Count assignments per shift slot
  const assignmentCounts = new Map<string, number>();
  (assignments || []).forEach(a => {
    const key = `${a.branch_id}-${a.date}-${a.shift_type}`;
    assignmentCounts.set(key, (assignmentCounts.get(key) || 0) + 1);
  });

  // Calculate coverage
  let totalShifts = 0;
  let filledShifts = 0;
  let emptyShifts = 0;
  let understaffedShifts = 0;

  const weekStart = new Date(schedule.week_start_date);

  for (let i = 0; i < 7; i++) {
    const date = new Date(weekStart);
    date.setDate(date.getDate() + i);
    const dateStr = date.toISOString().split('T')[0];

    requirements.forEach(req => {
      totalShifts++;
      const key = `${req.branch_id}-${dateStr}-${req.shift_type}`;
      const count = assignmentCounts.get(key) || 0;

      if (count === 0) {
        emptyShifts++;
      } else if (count < req.min_staff) {
        understaffedShifts++;
        filledShifts++;
      } else {
        filledShifts++;
      }
    });
  }

  return {
    total_shifts: totalShifts,
    filled_shifts: filledShifts,
    empty_shifts: emptyShifts,
    understaffed_shifts: understaffedShifts,
    coverage_percentage: totalShifts > 0 ? Math.round((filledShifts / totalShifts) * 100) : 0,
  };
}
