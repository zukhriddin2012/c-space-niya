import { supabaseAdmin, isSupabaseAdminConfigured, TAX_RATE, getTashkentDateString } from './connection';

// ============================================
// PAYSLIPS
// ============================================

export interface Payslip {
  id: string;
  employee_id: string;
  month: number;
  year: number;
  base_salary: number;
  bonuses: number;
  net_salary: number;
  status: 'draft' | 'approved' | 'paid';
  payment_date: string | null;
  created_at: string;
}

export async function getPayslipsByEmployee(employeeId: string): Promise<Payslip[]> {
  if (!isSupabaseAdminConfigured()) {
    // Return demo payslips for static data
    // Fixed monthly salary - no deductions or overtime calculations
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;
    const baseSalary = 8000000; // Fixed monthly salary

    return Array.from({ length: 6 }, (_, i) => {
      const month = currentMonth - i;
      const year = month <= 0 ? currentYear - 1 : currentYear;
      const adjustedMonth = month <= 0 ? month + 12 : month;

      // Occasional bonus (every 3rd month or so)
      const hasBonus = i % 3 === 0 && i > 0;
      const bonuses = hasBonus ? 1000000 : 0;

      return {
        id: `payslip-${i}`,
        employee_id: employeeId,
        month: adjustedMonth,
        year: year,
        base_salary: baseSalary,
        bonuses: bonuses,
        net_salary: baseSalary + bonuses,
        status: i === 0 ? 'approved' : 'paid',
        payment_date: i === 0 ? null : `${year}-${String(adjustedMonth).padStart(2, '0')}-25`,
        created_at: new Date().toISOString(),
      };
    });
  }

  const { data, error } = await supabaseAdmin!
    .from('payslips')
    .select('*')
    .eq('employee_id', employeeId)
    .order('year', { ascending: false })
    .order('month', { ascending: false });

  if (error) {
    console.error('Error fetching payslips:', error);
    return [];
  }

  return data || [];
}

// Extended payslip with employee info for payroll page
export interface PayrollRecord {
  id: string;
  employee_id: string;
  employee_name: string;
  employee_position: string;
  legal_entity: string;        // Entity/Branch name
  wage_category: 'primary' | 'additional';  // Primary (bank) or Additional (cash)
  month: number;
  year: number;
  gross_salary: number;  // Before tax (same as net for Additional wages)
  bonuses: number;
  deductions: number;    // Tax amount (0 for Additional wages)
  net_salary: number;    // What employee receives (the amount you imported)
  status: 'draft' | 'approved' | 'paid';
  payment_date: string | null;
}

// Calculate gross from net: gross = net / (1 - tax_rate) or net * 1.136 approximately
// But since tax is ON TOP of net: gross = net + (net * tax_rate) = net * 1.12
function calculateGrossFromNet(netSalary: number): number {
  return Math.round(netSalary * (1 + TAX_RATE));
}

function calculateTaxFromNet(netSalary: number): number {
  return Math.round(netSalary * TAX_RATE);
}

// Get all payroll records for a specific month/year
// Uses employee_wages (Primary/bank) and employee_branch_wages (Additional/cash) tables
export async function getPayrollByMonth(year: number, month: number): Promise<PayrollRecord[]> {
  if (!isSupabaseAdminConfigured()) {
    return [];
  }

  // Run all 4 queries in parallel
  const [employeesResult, primaryWagesResult, additionalWagesResult, payslipsResult] = await Promise.all([
    // Get all employees
    supabaseAdmin!
      .from('employees')
      .select('id, full_name, position')
      .order('full_name'),
    // Get all PRIMARY wages (bank - from legal entities)
    supabaseAdmin!
      .from('employee_wages')
      .select('*, legal_entities(id, name, short_name)')
      .eq('is_active', true),
    // Get all ADDITIONAL wages (cash - from branches)
    supabaseAdmin!
      .from('employee_branch_wages')
      .select('*, branches(id, name)')
      .eq('is_active', true),
    // Get existing payslips for this month (to check status)
    supabaseAdmin!
      .from('payslips')
      .select('*')
      .eq('year', year)
      .eq('month', month),
  ]);

  const employees = employeesResult.data || [];
  const primaryWages = primaryWagesResult.data || [];
  const additionalWages = additionalWagesResult.data || [];
  const payslips = payslipsResult.data || [];

  if (primaryWagesResult.error) {
    console.error('Error fetching primary wages:', primaryWagesResult.error);
  }
  if (additionalWagesResult.error) {
    console.error('Error fetching additional wages:', additionalWagesResult.error);
  }
  if (payslipsResult.error) {
    console.error('Error fetching payslips:', payslipsResult.error);
  }

  const payslipMap = new Map((payslips || []).map(p => [p.employee_id, p]));
  const employeeMap = new Map(employees.map(e => [e.id, e]));

  // Build payroll records from PRIMARY wages (with 12% tax)
  const seenPrimaryKeys = new Set<string>();
  const uniquePrimaryWages = (primaryWages || []).filter(wage => {
    const key = `${wage.employee_id}-${wage.legal_entity_id}`;
    if (seenPrimaryKeys.has(key)) {
      return false;
    }
    seenPrimaryKeys.add(key);
    return true;
  });

  const primaryRecords: PayrollRecord[] = uniquePrimaryWages.map(wage => {
    const employee = employeeMap.get(wage.employee_id);
    const payslip = payslipMap.get(wage.employee_id);
    const netSalary = wage.wage_amount || 0;
    const grossSalary = calculateGrossFromNet(netSalary);  // 12% tax applied
    const tax = calculateTaxFromNet(netSalary);

    return {
      id: payslip?.id || `primary-${wage.id}-${year}-${month}`,
      employee_id: wage.employee_id,
      employee_name: employee?.full_name || 'Unknown',
      employee_position: employee?.position || '',
      legal_entity: wage.legal_entities?.short_name || wage.legal_entities?.name || '-',
      wage_category: 'primary' as const,
      month,
      year,
      gross_salary: grossSalary,
      bonuses: payslip?.bonuses || 0,
      deductions: tax,
      net_salary: netSalary,
      status: payslip?.status || 'draft',
      payment_date: payslip?.payment_date || null,
    };
  });

  // Build payroll records from ADDITIONAL wages (NO tax - cash as-is)
  const seenAdditionalKeys = new Set<string>();
  const uniqueAdditionalWages = (additionalWages || []).filter(wage => {
    const key = `${wage.employee_id}-${wage.branch_id}`;
    if (seenAdditionalKeys.has(key)) {
      return false;
    }
    seenAdditionalKeys.add(key);
    return true;
  });

  const additionalRecords: PayrollRecord[] = uniqueAdditionalWages.map(wage => {
    const employee = employeeMap.get(wage.employee_id);
    const payslip = payslipMap.get(wage.employee_id);
    const netSalary = wage.wage_amount || 0;
    // NO tax for Additional wages - gross = net, deductions = 0

    return {
      id: `additional-${wage.id}-${year}-${month}`,
      employee_id: wage.employee_id,
      employee_name: employee?.full_name || 'Unknown',
      employee_position: employee?.position || '',
      legal_entity: wage.branches?.name || '-',
      wage_category: 'additional' as const,
      month,
      year,
      gross_salary: netSalary,  // Same as net (no tax)
      bonuses: 0,
      deductions: 0,  // NO tax for cash wages
      net_salary: netSalary,
      status: payslip?.status || 'draft',
      payment_date: payslip?.payment_date || null,
    };
  });

  // Combine and sort by net salary descending
  const allRecords = [...primaryRecords, ...additionalRecords];
  return allRecords.sort((a, b) => b.net_salary - a.net_salary);
}

// Calculate payroll statistics from payroll data (no extra DB call)
export function calculatePayrollStats(payroll: PayrollRecord[]) {
  // Separate Primary and Additional wages
  const primaryPayroll = payroll.filter(p => p.wage_category === 'primary');
  const additionalPayroll = payroll.filter(p => p.wage_category === 'additional');

  // Get unique employee count (employees may have both Primary and Additional wages)
  const uniqueEmployeeIds = new Set(payroll.map(p => p.employee_id));

  return {
    totalGross: payroll.reduce((sum, p) => sum + p.gross_salary + p.bonuses, 0),
    totalDeductions: payroll.reduce((sum, p) => sum + p.deductions, 0),
    totalNet: payroll.reduce((sum, p) => sum + p.net_salary, 0),
    // Primary wages breakdown (bank, with 12% tax)
    primaryGross: primaryPayroll.reduce((sum, p) => sum + p.gross_salary, 0),
    primaryNet: primaryPayroll.reduce((sum, p) => sum + p.net_salary, 0),
    primaryTax: primaryPayroll.reduce((sum, p) => sum + p.deductions, 0),
    // Additional wages breakdown (cash, no tax)
    additionalTotal: additionalPayroll.reduce((sum, p) => sum + p.net_salary, 0),
    // Status counts
    paid: payroll.filter(p => p.status === 'paid').length,
    approved: payroll.filter(p => p.status === 'approved').length,
    draft: payroll.filter(p => p.status === 'draft').length,
    totalRecords: payroll.length,
    totalEmployees: uniqueEmployeeIds.size,
  };
}

// Get employee attendance summary for a given month
export async function getEmployeeAttendanceSummary(employeeId: string, year: number, month: number) {
  const attendance = await getAttendanceByEmployeeAndMonth(employeeId, year, month);

  const workingDays = getWorkingDaysInMonth(year, month);
  const presentDays = attendance.filter(a => a.status === 'present' || a.status === 'late').length;
  const lateDays = attendance.filter(a => a.status === 'late').length;
  const absentDays = workingDays - presentDays;
  const totalHours = attendance.reduce((sum, a) => sum + (a.total_hours || 0), 0);
  const avgHoursPerDay = presentDays > 0 ? totalHours / presentDays : 0;

  return {
    workingDays,
    presentDays,
    lateDays,
    absentDays,
    totalHours: Math.round(totalHours * 10) / 10,
    avgHoursPerDay: Math.round(avgHoursPerDay * 10) / 10,
  };
}

function getWorkingDaysInMonth(year: number, month: number): number {
  const daysInMonth = new Date(year, month, 0).getDate();
  let workingDays = 0;

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month - 1, day);
    const dayOfWeek = date.getDay();
    // Monday = 1, Sunday = 0, Saturday = 6
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      workingDays++;
    }
  }

  return workingDays;
}

// Get weekly attendance summary for the current week from database
export async function getWeeklyAttendanceSummary(totalEmployees: number) {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  // Use Tashkent timezone for "today" - consistent with bot
  const now = new Date();
  const tashkentNow = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Tashkent' }));
  const today = tashkentNow;

  // Get start of week (Monday) in Tashkent timezone
  const dayOfWeek = today.getDay();
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Adjust for Sunday = 0
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() + diff);
  startOfWeek.setHours(0, 0, 0, 0);

  // Ensure total is at least 1 to avoid division by zero
  const safeTotal = Math.max(1, totalEmployees);

  // Build list of dates that need fetching
  const datesToFetch: { index: number; dateStr: string; dayName: string }[] = [];
  const weekData: { day: string; date: string; present: number; late: number; absent: number; total: number }[] = [];

  for (let i = 0; i < 7; i++) {
    const currentDate = new Date(startOfWeek);
    currentDate.setDate(startOfWeek.getDate() + i);
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
    const day = String(currentDate.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;

    const isWeekend = currentDate.getDay() === 0 || currentDate.getDay() === 6;
    const isPastOrToday = currentDate <= today;

    if (isPastOrToday && !isWeekend) {
      datesToFetch.push({ index: i, dateStr, dayName: days[i] });
    } else {
      // Future dates or weekends - no data needed
      weekData[i] = {
        day: days[i],
        date: dateStr,
        present: 0,
        late: 0,
        absent: isWeekend ? 0 : safeTotal,
        total: safeTotal,
      };
    }
  }

  // Fetch all weekday attendance in parallel
  if (datesToFetch.length > 0) {
    const attendanceResults = await Promise.all(
      datesToFetch.map(d => getAttendanceByDate(d.dateStr))
    );

    datesToFetch.forEach((d, idx) => {
      const attendance = attendanceResults[idx];
      const present = attendance.filter(a => a.status === 'present').length;
      const late = attendance.filter(a => a.status === 'late').length;
      const earlyLeave = attendance.filter(a => a.status === 'early_leave').length;
      const absent = safeTotal - present - late - earlyLeave;

      weekData[d.index] = {
        day: d.dayName,
        date: d.dateStr,
        present,
        late,
        absent: Math.max(0, absent),
        total: safeTotal,
      };
    });
  }

  // Sort by index to maintain correct order
  return weekData.filter(Boolean);
}

// Placeholder functions that need to be imported from other modules
// These should be defined elsewhere or imported when needed
async function getAttendanceByEmployeeAndMonth(employeeId: string, year: number, month: number): Promise<any[]> {
  // This should be implemented or imported from another module
  return [];
}

async function getAttendanceByDate(dateStr: string): Promise<any[]> {
  // This should be implemented or imported from another module
  return [];
}
