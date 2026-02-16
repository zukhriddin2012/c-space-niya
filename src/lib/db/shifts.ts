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
  start_time: string | null;  // Custom start time (e.g., "09:00") or null for default
  end_time: string | null;    // Custom end time (e.g., "13:00") or null for default
  confirmed_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  employees?: { full_name: string; employee_id: string; position: string; primary_branch_id?: string | null; branch_id?: string | null };
  branches?: { name: string };
  // Computed cross-branch fields
  is_cross_branch?: boolean;
  home_branch_id?: string | null;
  home_branch_name?: string | null;
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
  start_time?: string;  // Optional custom start time (e.g., "09:00")
  end_time?: string;    // Optional custom end time (e.g., "13:00")
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
      employees(full_name, employee_id, position, primary_branch_id, branch_id),
      branches(name)
    `)
    .eq('schedule_id', scheduleId)
    .order('date')
    .order('shift_type');

  if (error) {
    console.error('Error fetching assignments:', error);
    return [];
  }
  const enriched = enrichAssignmentsWithCrossBranch(data || []);
  return enrichAssignmentsWithHomeBranchNames(enriched);
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
      employees(full_name, employee_id, position, primary_branch_id, branch_id),
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
  const enriched = enrichAssignmentsWithCrossBranch(data || []);
  return enrichAssignmentsWithHomeBranchNames(enriched);
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
      employees(full_name, employee_id, position, primary_branch_id, branch_id),
      branches(name)
    `)
    .eq('date', date)
    .order('branch_id')
    .order('shift_type');

  if (error) {
    console.error('Error fetching assignments by date:', error);
    return [];
  }
  const enriched = enrichAssignmentsWithCrossBranch(data || []);
  return enrichAssignmentsWithHomeBranchNames(enriched);
}

export async function createAssignment(input: CreateAssignmentInput): Promise<ShiftAssignment | null> {
  if (!isSupabaseAdminConfigured()) return null;

  const { data, error } = await supabaseAdmin!
    .from('shift_assignments')
    .insert(input)
    .select(`
      *,
      employees(full_name, employee_id, position, primary_branch_id, branch_id),
      branches(name)
    `)
    .single();

  if (error) {
    console.error('Error creating assignment:', error);
    return null;
  }
  const enriched = enrichAssignmentsWithCrossBranch([data]);
  const withNames = await enrichAssignmentsWithHomeBranchNames(enriched);
  return withNames[0];
}

export async function createAssignmentsBulk(inputs: CreateAssignmentInput[]): Promise<ShiftAssignment[]> {
  if (!isSupabaseAdminConfigured() || inputs.length === 0) return [];

  const { data, error } = await supabaseAdmin!
    .from('shift_assignments')
    .insert(inputs)
    .select(`
      *,
      employees(full_name, employee_id, position, primary_branch_id, branch_id),
      branches(name)
    `);

  if (error) {
    console.error('Error creating bulk assignments:', error);
    return [];
  }
  const enriched = enrichAssignmentsWithCrossBranch(data || []);
  return enrichAssignmentsWithHomeBranchNames(enriched);
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
// CROSS-BRANCH HELPERS
// ============================================

// Enrich assignments with cross-branch computed fields
function enrichAssignmentsWithCrossBranch(
  assignments: ShiftAssignment[]
): ShiftAssignment[] {
  if (assignments.length === 0) return [];

  return assignments.map(a => {
    const homeBranch = a.employees?.primary_branch_id || a.employees?.branch_id || null;
    const isCrossBranch = homeBranch ? homeBranch !== a.branch_id : false;
    return {
      ...a,
      is_cross_branch: isCrossBranch,
      home_branch_id: isCrossBranch ? homeBranch : null,
      home_branch_name: null, // Will be populated by enrichAssignmentsWithHomeBranchNames if needed
    };
  });
}

// Enrich assignments with home branch names (async, for responses that need branch names)
export async function enrichAssignmentsWithHomeBranchNames(
  assignments: ShiftAssignment[]
): Promise<ShiftAssignment[]> {
  if (assignments.length === 0) return [];

  // Collect unique home branch IDs that differ from assignment branch
  const homeBranchIds = new Set<string>();
  assignments.forEach(a => {
    if (a.is_cross_branch && a.home_branch_id) {
      homeBranchIds.add(a.home_branch_id);
    }
  });

  if (homeBranchIds.size === 0) return assignments;

  // Batch-fetch branch names
  if (!isSupabaseAdminConfigured()) return assignments;
  const { data: branches } = await supabaseAdmin!
    .from('branches')
    .select('id, name')
    .in('id', Array.from(homeBranchIds));

  const branchNameMap: Record<string, string> = {};
  (branches || []).forEach(b => { branchNameMap[b.id] = b.name; });

  return assignments.map(a => ({
    ...a,
    home_branch_name: a.is_cross_branch && a.home_branch_id
      ? (branchNameMap[a.home_branch_id] || null)
      : null,
  }));
}

// Enhanced conflict check that returns conflict details including branch name
export async function getEmployeeConflictDetails(
  employeeId: string,
  date: string,
  shiftType: ShiftType,
  excludeAssignmentId?: string
): Promise<{
  hasConflict: boolean;
  conflictBranchName?: string;
  conflictBranchId?: string;
  conflictDate?: string;
  conflictShiftType?: ShiftType;
}> {
  if (!isSupabaseAdminConfigured()) return { hasConflict: false };

  let query = supabaseAdmin!
    .from('shift_assignments')
    .select('id, branch_id, date, shift_type, branches(name)')
    .eq('employee_id', employeeId)
    .eq('date', date)
    .eq('shift_type', shiftType);

  if (excludeAssignmentId) {
    query = query.neq('id', excludeAssignmentId);
  }

  const { data, error } = await query;

  if (error || !data || data.length === 0) {
    return { hasConflict: false };
  }

  const conflict = data[0] as any;
  return {
    hasConflict: true,
    conflictBranchName: conflict.branches?.name || 'Unknown',
    conflictBranchId: conflict.branch_id,
    conflictDate: conflict.date,
    conflictShiftType: conflict.shift_type,
  };
}

// Get assignments where employees from a specific home branch are working at OTHER branches
export async function getAwayAssignmentsForBranch(
  scheduleId: string,
  homeBranchId: string
): Promise<Array<{
  employee_id: string;
  employee_name: string;
  date: string;
  shift_type: ShiftType;
  away_branch_id: string;
  away_branch_name: string;
}>> {
  if (!isSupabaseAdminConfigured()) return [];

  // Step 1: Get employee IDs belonging to this branch
  const { data: homeEmployees } = await supabaseAdmin!
    .from('employees')
    .select('id')
    .or(`primary_branch_id.eq.${homeBranchId},branch_id.eq.${homeBranchId}`)
    .eq('status', 'active');

  const homeEmployeeIds = (homeEmployees || []).map(e => e.id);
  if (homeEmployeeIds.length === 0) return [];

  // Step 2: Get their assignments at OTHER branches for this schedule
  const { data, error } = await supabaseAdmin!
    .from('shift_assignments')
    .select('employee_id, date, shift_type, branch_id, branches(name), employees(full_name)')
    .eq('schedule_id', scheduleId)
    .neq('branch_id', homeBranchId)
    .in('employee_id', homeEmployeeIds);

  if (error) {
    console.error('Error fetching away assignments:', error);
    return [];
  }

  return (data || []).map((a: any) => ({
    employee_id: a.employee_id,
    employee_name: a.employees?.full_name || 'Unknown',
    date: a.date,
    shift_type: a.shift_type,
    away_branch_id: a.branch_id,
    away_branch_name: a.branches?.name || 'Unknown',
  }));
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

// Get employees available for a specific shift
export async function getAvailableEmployeesForShift(
  date: string,
  shiftType: ShiftType,
  branchId?: string,
  options?: { includeAllBranches?: boolean }
): Promise<{ id: string; full_name: string; position: string; is_floater: boolean; primary_branch_id: string | null; branch_name: string | null }[]> {
  if (!isSupabaseAdminConfigured()) return [];

  // Get day of week (0=Sunday)
  const dayOfWeek = new Date(date).getDay();

  // Get all active employees
  // Note: primary_branch_id is preferred, but fall back to branch_id for existing employees
  let employeesQuery = supabaseAdmin!
    .from('employees')
    .select('id, full_name, position, is_floater, primary_branch_id, branch_id, can_work_night, home_branch:branches!employees_primary_branch_id_fkey(name)')
    .eq('status', 'active');

  // Filter by night shift capability if night shift
  if (shiftType === 'night') {
    employeesQuery = employeesQuery.eq('can_work_night', true);
  }

  // Filter by branch if specified (include floaters and employees assigned to this branch)
  // Note: Check both primary_branch_id and branch_id for backwards compatibility
  // When includeAllBranches is true (admin), skip branch filter to show all employees
  if (branchId && !options?.includeAllBranches) {
    employeesQuery = employeesQuery.or(`primary_branch_id.eq.${branchId},branch_id.eq.${branchId},is_floater.eq.true`);
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
      // Use primary_branch_id if set, otherwise fall back to branch_id
      primary_branch_id: emp.primary_branch_id || emp.branch_id || null,
      branch_name: (emp as any).home_branch?.name || null,
    }));
}

// ============================================
// RECEPTION DASHBOARD — SHIFT SUMMARY (CSN-030)
// ============================================

export async function getShiftDashboardData(
  branchId: string,
  operatorId: string | null
): Promise<{
  today: {
    date: string;
    dayShift: { assigned: number; required: number; employees: Array<{ employeeId: string; employeeName: string; employeeStatus: string }> };
    nightShift: { assigned: number; required: number; employees: Array<{ employeeId: string; employeeName: string; employeeStatus: string }> };
  };
  week: {
    weekStart: string;
    days: Array<{
      date: string;
      dayOfWeek: string;
      dayCount: number;
      nightCount: number;
      dayRequired: number;
      nightRequired: number;
    }>;
  };
  myShifts: Array<{ date: string; shiftType: 'day' | 'night'; branchName: string }>;
} | null> {
  if (!isSupabaseAdminConfigured()) return null;

  // Step 1: Get today's date (Tashkent timezone: UTC+5)
  const now = new Date();
  const tashkentOffset = 5 * 60 * 60 * 1000;
  const tashkentNow = new Date(now.getTime() + tashkentOffset);
  const todayStr = tashkentNow.toISOString().split('T')[0];

  // Step 2: Calculate current week's Monday
  const dayOfWeek = tashkentNow.getUTCDay(); // 0=Sun ... 6=Sat
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(tashkentNow);
  monday.setUTCDate(monday.getUTCDate() + mondayOffset);
  const weekStart = monday.toISOString().split('T')[0];

  // Step 3: Find published schedule for this week
  const { data: schedule } = await supabaseAdmin!
    .from('shift_schedules')
    .select('id')
    .eq('week_start_date', weekStart)
    .eq('status', 'published')
    .maybeSingle();

  if (!schedule) {
    return null; // "No published schedule" state
  }

  // Step 4: Parallel fetch — assignments + requirements + operator's shifts
  // Only fetch operator shifts if operatorId is a valid UUID (not a kiosk ID like "kiosk:xxx")
  const isValidOperatorId = operatorId && !operatorId.startsWith('kiosk:');

  const [assignmentsResult, requirementsResult, myShiftsResult] = await Promise.all([
    supabaseAdmin!
      .from('shift_assignments')
      .select('date, shift_type, employee_id, employee:employees(id, full_name, status)')
      .eq('schedule_id', schedule.id)
      .eq('branch_id', branchId),

    supabaseAdmin!
      .from('branch_shift_requirements')
      .select('shift_type, min_staff, has_shift')
      .eq('branch_id', branchId),

    isValidOperatorId
      ? supabaseAdmin!
          .from('shift_assignments')
          .select('date, shift_type, branch:branches(name)')
          .eq('schedule_id', schedule.id)
          .eq('employee_id', operatorId!)
          .gte('date', todayStr)
          .order('date', { ascending: true })
          .limit(7)
      : Promise.resolve({ data: null, error: null }),
  ]);

  // Step 5: Build requirements lookup
  const requirements: Record<string, number> = { day: 0, night: 0 };
  (requirementsResult.data || []).forEach((r: any) => {
    if (r.has_shift) requirements[r.shift_type] = r.min_staff;
  });

  // Step 6: Build 7-day week structure
  const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const days: Array<{ date: string; dayOfWeek: string; dayCount: number; nightCount: number; dayRequired: number; nightRequired: number }> = [];

  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setUTCDate(d.getUTCDate() + i);
    const dateStr = d.toISOString().split('T')[0];
    days.push({
      date: dateStr,
      dayOfWeek: DAY_NAMES[d.getUTCDay()],
      dayCount: 0,
      nightCount: 0,
      dayRequired: requirements.day,
      nightRequired: requirements.night,
    });
  }

  // Step 7: Populate counts and today's employee lists
  const todayDayEmployees: Array<{ employeeId: string; employeeName: string; employeeStatus: string }> = [];
  const todayNightEmployees: Array<{ employeeId: string; employeeName: string; employeeStatus: string }> = [];

  (assignmentsResult.data || []).forEach((a: any) => {
    const dayEntry = days.find(d => d.date === a.date);
    if (!dayEntry) return;

    if (a.shift_type === 'day') {
      dayEntry.dayCount++;
    } else if (a.shift_type === 'night') {
      dayEntry.nightCount++;
    }

    if (a.date === todayStr && a.employee) {
      const emp = {
        employeeId: a.employee.id,
        employeeName: a.employee.full_name,
        employeeStatus: a.employee.status || 'active',
      };
      if (a.shift_type === 'day') todayDayEmployees.push(emp);
      else todayNightEmployees.push(emp);
    }
  });

  // Step 8: Build myShifts (operator's upcoming)
  const myShifts = (myShiftsResult.data || [])
    .filter((s: any) => s.date > todayStr)
    .map((s: any) => ({
      date: s.date,
      shiftType: s.shift_type as 'day' | 'night',
      branchName: s.branch?.name || '',
    }));

  return {
    today: {
      date: todayStr,
      dayShift: {
        assigned: todayDayEmployees.length,
        required: requirements.day,
        employees: todayDayEmployees,
      },
      nightShift: {
        assigned: todayNightEmployees.length,
        required: requirements.night,
        employees: todayNightEmployees,
      },
    },
    week: { weekStart, days },
    myShifts,
  };
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

  // Get operational branches only (exclude rented, facility_management, under_construction, headquarters)
  const { data: operationalBranches } = await supabaseAdmin!
    .from('branches')
    .select('id')
    .or('operational_status.is.null,operational_status.eq.operational');

  const operationalBranchIds = new Set((operationalBranches || []).map(b => b.id));

  // Get requirements only for operational branches
  const { data: requirements } = await supabaseAdmin!
    .from('branch_shift_requirements')
    .select('*')
    .eq('has_shift', true);

  // Filter to only operational branches
  const filteredRequirements = (requirements || []).filter(r => operationalBranchIds.has(r.branch_id));

  if (filteredRequirements.length === 0) return { total_shifts: 0, filled_shifts: 0, empty_shifts: 0, understaffed_shifts: 0, coverage_percentage: 0 };

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

    filteredRequirements.forEach(req => {
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
