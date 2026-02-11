import { supabaseAdmin, isSupabaseAdminConfigured, getTashkentDateString } from './connection';

// ==================== ROLE-SPECIFIC DASHBOARD FUNCTIONS ====================

// Get pending approvals for GM (terminations, wage changes, accounting)
export async function getPendingApprovalsForGM(): Promise<{
  terminations: number;
  wageChanges: number;
  paymentRequests: number;
  total: number;
}> {
  if (!isSupabaseAdminConfigured()) {
    return { terminations: 0, wageChanges: 0, paymentRequests: 0, total: 0 };
  }

  const [terminations, wageChanges, paymentRequests] = await Promise.all([
    supabaseAdmin!.from('termination_requests').select('id', { count: 'exact' }).eq('status', 'pending'),
    supabaseAdmin!.from('wage_change_requests').select('id', { count: 'exact' }).eq('status', 'pending'),
    supabaseAdmin!.from('payment_requests').select('id', { count: 'exact' }).in('status', ['submitted', 'pending_review', 'approved']),
  ]);

  const terminationCount = terminations.count || 0;
  const wageChangeCount = wageChanges.count || 0;
  const paymentRequestCount = paymentRequests.count || 0;

  return {
    terminations: terminationCount,
    wageChanges: wageChangeCount,
    paymentRequests: paymentRequestCount,
    total: terminationCount + wageChangeCount + paymentRequestCount,
  };
}

// Get accounting stats for Chief Accountant and Accountant dashboards
export async function getAccountingDashboardStats(forChiefAccountant: boolean = false): Promise<{
  pendingRequests: number;
  awaitingApproval: number;
  processedToday: number;
  totalThisMonth: number;
  inProgress: number;
}> {
  if (!isSupabaseAdminConfigured()) {
    return { pendingRequests: 0, awaitingApproval: 0, processedToday: 0, totalThisMonth: 0, inProgress: 0 };
  }

  const today = new Date().toISOString().split('T')[0];
  const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

  const [pending, awaitingApproval, processedToday, totalThisMonth, inProgress] = await Promise.all([
    // Pending requests (submitted or pending_review)
    supabaseAdmin!.from('payment_requests').select('id', { count: 'exact' }).in('status', ['submitted', 'pending_review']),
    // Awaiting approval (for chief accountant - approved but not paid)
    forChiefAccountant
      ? supabaseAdmin!.from('payment_requests').select('id', { count: 'exact' }).eq('status', 'approved')
      : Promise.resolve({ count: 0 }),
    // Processed today
    supabaseAdmin!.from('payment_requests').select('id', { count: 'exact' }).eq('status', 'paid').gte('updated_at', today),
    // Total this month
    supabaseAdmin!.from('payment_requests').select('id', { count: 'exact' }).gte('created_at', startOfMonth),
    // In progress
    supabaseAdmin!.from('payment_requests').select('id', { count: 'exact' }).eq('status', 'pending_review'),
  ]);

  return {
    pendingRequests: pending.count || 0,
    awaitingApproval: awaitingApproval.count || 0,
    processedToday: processedToday.count || 0,
    totalThisMonth: totalThisMonth.count || 0,
    inProgress: inProgress.count || 0,
  };
}

// Get pending payment requests for approval (Chief Accountant)
// BUG-009 fix: removed request_number — column doesn't exist in payment_requests table
export async function getPendingPaymentRequestsForApproval(limit: number = 5): Promise<{
  id: string;
  request_type: string;
  total_amount: number;
  description: string | null;
  status: string;
  created_at: string;
}[]> {
  if (!isSupabaseAdminConfigured()) {
    return [];
  }

  const { data, error } = await supabaseAdmin!
    .from('payment_requests')
    .select('id, request_type, total_amount, description, status, created_at')
    .in('status', ['submitted', 'pending_review', 'approved'])
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching pending payment requests:', error);
    return [];
  }

  return data || [];
}

// Get my payment requests (for any role that can submit requests)
export async function getMyPaymentRequestStats(employeeId: string): Promise<{
  myRequests: number;
  pending: number;
  approved: number;
}> {
  if (!isSupabaseAdminConfigured()) {
    return { myRequests: 0, pending: 0, approved: 0 };
  }

  const { data, error } = await supabaseAdmin!
    .from('payment_requests')
    .select('id, status')
    .eq('created_by', employeeId);

  if (error) {
    console.error('Error fetching my payment request stats:', error);
    return { myRequests: 0, pending: 0, approved: 0 };
  }

  const requests = data || [];
  return {
    myRequests: requests.length,
    pending: requests.filter(r => ['submitted', 'pending_review'].includes(r.status)).length,
    approved: requests.filter(r => ['approved', 'paid'].includes(r.status)).length,
  };
}

// Get recent payment requests by employee
// BUG-009 fix: removed request_number — column doesn't exist in payment_requests table
export async function getMyRecentPaymentRequests(employeeId: string, limit: number = 5): Promise<{
  id: string;
  request_type: string;
  total_amount: number;
  description: string | null;
  status: string;
  created_at: string;
}[]> {
  if (!isSupabaseAdminConfigured()) {
    return [];
  }

  const { data, error } = await supabaseAdmin!
    .from('payment_requests')
    .select('id, request_type, total_amount, description, status, created_at')
    .eq('created_by', employeeId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching my recent payment requests:', error);
    return [];
  }

  return data || [];
}

// Get HR dashboard stats
export async function getHRDashboardStats(): Promise<{
  totalEmployees: number;
  onProbation: number;
  activeCandidates: number;
  absentToday: number;
  probationEnding: number;
}> {
  if (!isSupabaseAdminConfigured()) {
    return { totalEmployees: 0, onProbation: 0, activeCandidates: 0, absentToday: 0, probationEnding: 0 };
  }

  const today = new Date();

  const [employees, probation, candidates, attendanceToday] = await Promise.all([
    supabaseAdmin!.from('employees').select('id', { count: 'exact' }).in('status', ['active', 'probation']),
    supabaseAdmin!.from('employees').select('id', { count: 'exact' }).eq('status', 'probation'),
    supabaseAdmin!.from('candidates').select('id', { count: 'exact' }).not('stage', 'in', '("hired","rejected")'),
    supabaseAdmin!.from('daily_attendance').select('employee_id', { count: 'exact' }).eq('date', today.toISOString().split('T')[0]),
  ]);

  const totalEmployees = employees.count || 0;
  const presentToday = attendanceToday.count || 0;
  const absentToday = Math.max(0, totalEmployees - presentToday);

  return {
    totalEmployees: totalEmployees,
    onProbation: probation.count || 0,
    activeCandidates: candidates.count || 0,
    absentToday: absentToday,
    probationEnding: 0, // Could add probation end date tracking if needed
  };
}

// Get recruitment dashboard stats for Recruiter
export async function getRecruiterDashboardStats(): Promise<{
  totalCandidates: number;
  screening: number;
  interview: number;
  underReview: number;
  probation: number;
  hiredThisMonth: number;
}> {
  if (!isSupabaseAdminConfigured()) {
    return { totalCandidates: 0, screening: 0, interview: 0, underReview: 0, probation: 0, hiredThisMonth: 0 };
  }

  const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();

  const [allCandidates, hiredThisMonth] = await Promise.all([
    supabaseAdmin!.from('candidates').select('id, stage'),
    supabaseAdmin!.from('candidates').select('id', { count: 'exact' }).eq('stage', 'hired').gte('updated_at', startOfMonth),
  ]);

  const candidates = allCandidates.data || [];

  return {
    totalCandidates: candidates.length,
    screening: candidates.filter(c => c.stage === 'screening').length,
    interview: candidates.filter(c => c.stage === 'interview_1' || c.stage === 'interview_2').length,
    underReview: candidates.filter(c => c.stage === 'under_review').length,
    probation: candidates.filter(c => c.stage === 'probation').length,
    hiredThisMonth: hiredThisMonth.count || 0,
  };
}

// Get branch-specific attendance for today (for Branch Manager dashboard)
export async function getBranchAttendanceToday(branchId: string): Promise<{
  present: number;
  absent: number;
  late: number;
  total: number;
  absentEmployees: { id: string; full_name: string; position: string }[];
  lateEmployees: { id: string; full_name: string; position: string; check_in: string }[];
}> {
  if (!isSupabaseAdminConfigured()) {
    return { present: 0, absent: 0, late: 0, total: 0, absentEmployees: [], lateEmployees: [] };
  }

  const today = new Date().toISOString().split('T')[0];

  // Get all employees in this branch
  const { data: employees } = await supabaseAdmin!
    .from('employees')
    .select('id, full_name, position')
    .eq('branch_id', branchId)
    .in('status', ['active', 'probation']);

  const branchEmployees = employees || [];
  const employeeIds = branchEmployees.map(e => e.id);

  if (employeeIds.length === 0) {
    return { present: 0, absent: 0, late: 0, total: 0, absentEmployees: [], lateEmployees: [] };
  }

  // Get today's attendance for these employees
  const { data: attendance } = await supabaseAdmin!
    .from('daily_attendance')
    .select('employee_id, status, check_in')
    .eq('date', today)
    .in('employee_id', employeeIds);

  const attendanceRecords = attendance || [];
  const presentIds = new Set(attendanceRecords.map(a => a.employee_id));
  const lateIds = new Set(attendanceRecords.filter(a => a.status === 'late').map(a => a.employee_id));

  const absentEmployees = branchEmployees.filter(e => !presentIds.has(e.id));
  const lateEmployees = branchEmployees
    .filter(e => lateIds.has(e.id))
    .map(e => {
      const record = attendanceRecords.find(a => a.employee_id === e.id);
      return { ...e, check_in: record?.check_in || '' };
    });

  return {
    present: presentIds.size,
    absent: branchEmployees.length - presentIds.size,
    late: lateIds.size,
    total: branchEmployees.length,
    absentEmployees,
    lateEmployees,
  };
}

// Get pending terminations and wage changes for GM
export async function getPendingHRApprovals(limit: number = 5): Promise<{
  terminations: {
    id: string;
    employee_name: string;
    requested_date: string;
    reason: string;
  }[];
  wageChanges: {
    id: string;
    employee_name: string;
    current_salary: number;
    new_salary: number;
    change_percentage: number;
  }[];
}> {
  if (!isSupabaseAdminConfigured()) {
    return { terminations: [], wageChanges: [] };
  }

  const [terminations, wageChanges] = await Promise.all([
    supabaseAdmin!
      .from('termination_requests')
      .select(`
        id,
        requested_date,
        reason,
        employee:employees!employee_id(full_name)
      `)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(limit),
    supabaseAdmin!
      .from('wage_change_requests')
      .select(`
        id,
        current_salary,
        new_salary,
        employee:employees!employee_id(full_name)
      `)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(limit),
  ]);

  return {
    terminations: (terminations.data || []).map((t: any) => ({
      id: t.id,
      employee_name: t.employee?.full_name || 'Unknown',
      requested_date: t.requested_date,
      reason: t.reason,
    })),
    wageChanges: (wageChanges.data || []).map((w: any) => ({
      id: w.id,
      employee_name: w.employee?.full_name || 'Unknown',
      current_salary: w.current_salary,
      new_salary: w.new_salary,
      change_percentage: w.current_salary > 0 ? Math.round((w.new_salary - w.current_salary) / w.current_salary * 100) : 0,
    })),
  };
}

// Get branch attendance summary for GM dashboard
export async function getBranchAttendanceSummaryForGM(): Promise<{
  id: string;
  name: string;
  present: number;
  total: number;
}[]> {
  if (!isSupabaseAdminConfigured()) {
    return [];
  }

  const today = new Date().toISOString().split('T')[0];

  // Get all branches
  const { data: branches } = await supabaseAdmin!
    .from('branches')
    .select('id, name')
    .eq('is_active', true);

  if (!branches || branches.length === 0) {
    return [];
  }

  // Get all employees by branch
  const { data: employees } = await supabaseAdmin!
    .from('employees')
    .select('id, branch_id')
    .in('status', ['active', 'probation'])
    .not('branch_id', 'is', null);

  // Get today's attendance
  const { data: attendance } = await supabaseAdmin!
    .from('daily_attendance')
    .select('employee_id')
    .eq('date', today);

  const employeeList = employees || [];
  const presentIds = new Set((attendance || []).map(a => a.employee_id));

  return branches.map(branch => {
    const branchEmployees = employeeList.filter(e => e.branch_id === branch.id);
    const present = branchEmployees.filter(e => presentIds.has(e.id)).length;
    return {
      id: branch.id,
      name: branch.name,
      present,
      total: branchEmployees.length,
    };
  }).filter(b => b.total > 0);
}
