import { getSession } from '@/lib/auth-server';
import { redirect } from 'next/navigation';
import { Download } from 'lucide-react';
import { getBranches, getEmployees, getAttendanceByDate } from '@/lib/db';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import AttendanceFilters from '../AttendanceFilters';
import AttendanceTable from '../AttendanceTable';
import { unstable_cache } from 'next/cache';

// Get current date in Tashkent timezone (UTC+5) - consistent with bot
function getTashkentDateString(): string {
  const now = new Date();
  const tashkentTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Tashkent' }));
  const year = tashkentTime.getFullYear();
  const month = String(tashkentTime.getMonth() + 1).padStart(2, '0');
  const day = String(tashkentTime.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Cache branches for 5 minutes (they rarely change)
const getCachedBranches = unstable_cache(
  async () => getBranches(),
  ['branches'],
  { revalidate: 300 }
);

// Cache employees for 1 minute (changes more frequently)
const getCachedEmployees = unstable_cache(
  async () => getEmployees(),
  ['employees'],
  { revalidate: 60 }
);

interface AttendanceRecord {
  id: string;
  attendanceDbId: string | null;
  employeeDbId: string;
  employeeId: string;
  employeeName: string;
  position: string;
  branchId: string | null;
  branchName: string;
  checkInTime: string | null;
  checkOutTime: string | null;
  status: 'present' | 'late' | 'absent' | 'early_leave';
  source: 'telegram' | 'web' | 'manual' | null;
  totalHours: number | null;
  isOvernight?: boolean;
  overnightFromDate?: string;
}

// Fetch attendance data for a specific date (uses pre-fetched branches/employees)
async function getAttendanceForDate(
  date: string,
  employees: Awaited<ReturnType<typeof getEmployees>>,
  branches: Awaited<ReturnType<typeof getBranches>>
): Promise<AttendanceRecord[]> {
  const attendance = await getAttendanceByDate(date);

  const branchMap = new Map(branches.map(b => [b.id, b.name]));
  const employeeMap = new Map(employees.map(e => [e.id, e]));

  // Deduplicate attendance records by employee_id
  const employeeAttendanceMap = new Map<string, any>();
  for (const a of attendance) {
    const existing = employeeAttendanceMap.get(a.employee_id);
    if (!existing) {
      employeeAttendanceMap.set(a.employee_id, a);
    } else {
      const existingHasNoCheckout = !existing.check_out;
      const currentHasNoCheckout = !a.check_out;

      if (currentHasNoCheckout && !existingHasNoCheckout) {
        employeeAttendanceMap.set(a.employee_id, a);
      } else if (!currentHasNoCheckout && existingHasNoCheckout) {
        // Keep existing
      } else {
        if (a.check_in && existing.check_in && a.check_in > existing.check_in) {
          employeeAttendanceMap.set(a.employee_id, a);
        }
      }
    }
  }

  const attendanceRecords: AttendanceRecord[] = Array.from(employeeAttendanceMap.values()).map((a: any) => {
    const employee = employeeMap.get(a.employee_id) || a.employees;
    const recordDate = a.is_overnight ? a.overnight_from_date : date;
    return {
      id: a.id,
      attendanceDbId: a.id,
      employeeDbId: a.employee_id,
      employeeId: employee?.employee_id || a.employee_id,
      employeeName: employee?.full_name || 'Unknown',
      position: employee?.position || '',
      branchId: a.check_in_branch_id,
      branchName: a.check_in_branch?.name || branchMap.get(a.check_in_branch_id) || '-',
      checkInTime: a.check_in ? `${recordDate}T${a.check_in}` : null,
      checkOutTime: a.check_out ? `${date}T${a.check_out}` : null,
      status: a.status as 'present' | 'late' | 'absent' | 'early_leave',
      source: 'telegram' as const,
      totalHours: a.total_hours,
      isOvernight: a.is_overnight || false,
      overnightFromDate: a.overnight_from_date,
    };
  });

  const checkedInIds = new Set(employeeAttendanceMap.keys());
  const activeEmployees = employees.filter(e => e.status === 'active');
  const absentEmployees = activeEmployees
    .filter(e => !checkedInIds.has(e.id))
    .map(e => ({
      id: `absent-${e.id}`,
      attendanceDbId: null,
      employeeDbId: e.id,
      employeeId: e.employee_id,
      employeeName: e.full_name,
      position: e.position,
      branchId: e.branch_id,
      branchName: branchMap.get(e.branch_id || '') || '-',
      checkInTime: null,
      checkOutTime: null,
      status: 'absent' as const,
      source: null,
      totalHours: null,
    }));

  return [...attendanceRecords, ...absentEmployees];
}

export default async function AttendanceSheetPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; branch?: string; status?: string }>;
}) {
  const user = await getSession();
  if (!user) redirect('/login');

  const isEmployee = user.role === 'employee';
  const canEditAttendance = hasPermission(user.role, PERMISSIONS.ATTENDANCE_EDIT);

  const params = await searchParams;
  const selectedDate = params.date || getTashkentDateString();
  const selectedBranch = params.branch || '';
  const selectedStatus = params.status || '';

  // Fetch branches and employees once (cached), then use for attendance processing
  const [branches, employees] = await Promise.all([
    getCachedBranches(),
    getCachedEmployees(),
  ]);

  const allAttendance = await getAttendanceForDate(selectedDate, employees, branches);

  let filteredAttendance = allAttendance;
  if (selectedBranch) {
    filteredAttendance = filteredAttendance.filter(a => a.branchId === selectedBranch);
  }
  if (selectedStatus) {
    filteredAttendance = filteredAttendance.filter(a => a.status === selectedStatus);
  }

  const activeBranches = branches.filter(b => allAttendance.some(a => a.branchId === b.id));

  return (
    <div>
      {/* Export Button */}
      {!isEmployee && (
        <div className="flex justify-end mb-4">
          <button className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition-colors text-sm">
            <Download size={18} />
            Export
          </button>
        </div>
      )}

      {/* Filters */}
      <AttendanceFilters
        branches={activeBranches.map(b => ({ id: b.id, name: b.name }))}
        isEmployee={isEmployee}
      />

      {/* Sortable Attendance Table */}
      <AttendanceTable
        records={filteredAttendance}
        canEditAttendance={canEditAttendance}
      />
    </div>
  );
}
