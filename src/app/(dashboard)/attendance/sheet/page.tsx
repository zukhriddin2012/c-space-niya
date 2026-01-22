import { getSession } from '@/lib/auth-server';
import { redirect } from 'next/navigation';
import { Download } from 'lucide-react';
import { getBranches, getEmployees, getAttendanceByDate } from '@/lib/db';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import AttendanceFilters from '../AttendanceFilters';
import AttendanceTable from '../AttendanceTable';
import BranchView from '../BranchView';
import ViewToggle from '../ViewToggle';
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

interface AttendanceSession {
  id: string;
  checkIn: string | null;
  checkOut: string | null;
  branchName: string;
  totalHours: number | null;
  status: 'present' | 'late' | 'early_leave';
  isActive: boolean;
}

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
  // Multi-session support
  sessions: AttendanceSession[];
  sessionCount: number;
  totalSessionHours: number;
  hasActiveSession: boolean;
}

// Fetch attendance data for a specific date (uses pre-fetched branches/employees)
// Groups multiple sessions per employee
async function getAttendanceForDate(
  date: string,
  employees: Awaited<ReturnType<typeof getEmployees>>,
  branches: Awaited<ReturnType<typeof getBranches>>
): Promise<AttendanceRecord[]> {
  const attendance = await getAttendanceByDate(date);

  const branchMap = new Map(branches.map(b => [b.id, b.name]));
  const employeeMap = new Map(employees.map(e => [e.id, e]));

  // Group all attendance records by employee_id (support multiple sessions)
  const employeeSessionsMap = new Map<string, any[]>();
  for (const a of attendance) {
    const existing = employeeSessionsMap.get(a.employee_id) || [];
    existing.push(a);
    employeeSessionsMap.set(a.employee_id, existing);
  }

  const attendanceRecords: AttendanceRecord[] = Array.from(employeeSessionsMap.entries()).map(([empId, sessions]) => {
    // Sort sessions by check_in time
    sessions.sort((a, b) => (a.check_in || '').localeCompare(b.check_in || ''));

    const employee = employeeMap.get(empId) || sessions[0]?.employees;
    const latestSession = sessions[sessions.length - 1];
    const activeSession = sessions.find(s => !s.check_out);

    // Calculate total hours across all sessions
    const totalSessionHours = sessions.reduce((sum, s) => sum + (s.total_hours || 0), 0);

    // Build sessions array for expandable view
    const sessionsList: AttendanceSession[] = sessions.map((s, idx) => ({
      id: s.id,
      checkIn: s.check_in ? `${date}T${s.check_in}` : null,
      checkOut: s.check_out ? `${date}T${s.check_out}` : null,
      branchName: s.check_in_branch?.name || branchMap.get(s.check_in_branch_id) || '-',
      totalHours: s.total_hours,
      status: s.status as 'present' | 'late' | 'early_leave',
      isActive: !s.check_out,
    }));

    // Use the latest session for main display, but include all sessions
    const recordDate = latestSession.is_overnight ? latestSession.overnight_from_date : date;

    return {
      id: latestSession.id,
      attendanceDbId: activeSession?.id || latestSession.id,
      employeeDbId: empId,
      employeeId: employee?.employee_id || empId,
      employeeName: employee?.full_name || 'Unknown',
      position: employee?.position || '',
      branchId: latestSession.check_in_branch_id,
      branchName: latestSession.check_in_branch?.name || branchMap.get(latestSession.check_in_branch_id) || '-',
      checkInTime: latestSession.check_in ? `${recordDate}T${latestSession.check_in}` : null,
      checkOutTime: latestSession.check_out ? `${date}T${latestSession.check_out}` : null,
      status: latestSession.status as 'present' | 'late' | 'absent' | 'early_leave',
      source: 'telegram' as const,
      totalHours: latestSession.total_hours,
      isOvernight: latestSession.is_overnight || false,
      overnightFromDate: latestSession.overnight_from_date,
      // Multi-session data
      sessions: sessionsList,
      sessionCount: sessions.length,
      totalSessionHours: Math.round(totalSessionHours * 10) / 10,
      hasActiveSession: !!activeSession,
    };
  });

  const checkedInIds = new Set(employeeSessionsMap.keys());
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
      sessions: [],
      sessionCount: 0,
      totalSessionHours: 0,
      hasActiveSession: false,
    }));

  return [...attendanceRecords, ...absentEmployees];
}

export default async function AttendanceSheetPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; branch?: string; status?: string; view?: string }>;
}) {
  const user = await getSession();
  if (!user) redirect('/login');

  const isEmployee = user.role === 'employee';
  const canEditAttendance = hasPermission(user.role, PERMISSIONS.ATTENDANCE_EDIT);

  const params = await searchParams;
  const selectedDate = params.date || getTashkentDateString();
  const selectedBranch = params.branch || '';
  const selectedStatus = params.status || '';
  const currentView = (params.view || 'branch') as 'table' | 'branch';

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

  // Default sort: present employees first (by check-in time), then absent
  filteredAttendance = [...filteredAttendance].sort((a, b) => {
    // Present/checked-in employees first
    const aHasCheckIn = a.checkInTime !== null;
    const bHasCheckIn = b.checkInTime !== null;

    if (aHasCheckIn && !bHasCheckIn) return -1;
    if (!aHasCheckIn && bHasCheckIn) return 1;

    // Both have check-in: sort by check-in time (earliest first)
    if (aHasCheckIn && bHasCheckIn) {
      return (a.checkInTime || '').localeCompare(b.checkInTime || '');
    }

    // Both absent: sort by name
    return a.employeeName.localeCompare(b.employeeName);
  });

  const activeBranches = branches.filter(b => allAttendance.some(a => a.branchId === b.id));

  // Calculate stats
  const presentCount = allAttendance.filter(a => a.status === 'present' || a.status === 'late').length;
  const lateCount = allAttendance.filter(a => a.status === 'late').length;
  const checkedOutCount = allAttendance.filter(a => a.checkOutTime !== null).length;
  const absentCount = allAttendance.filter(a => a.status === 'absent').length;

  return (
    <div>
      {/* Stats Row + View Toggle */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4 text-sm">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
            <span className="text-gray-600">Present:</span>
            <span className="font-semibold text-gray-900">{presentCount}</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
            <span className="text-gray-600">Late:</span>
            <span className="font-semibold text-gray-900">{lateCount}</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
            <span className="text-gray-600">Left:</span>
            <span className="font-semibold text-gray-900">{checkedOutCount}</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 bg-red-500 rounded-full"></span>
            <span className="text-gray-600">Absent:</span>
            <span className="font-semibold text-gray-900">{absentCount}</span>
          </span>
        </div>

        <div className="flex items-center gap-3">
          {!isEmployee && (
            <button className="inline-flex items-center gap-2 px-3 py-1.5 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition-colors text-sm">
              <Download size={16} />
              Export
            </button>
          )}
          <ViewToggle currentView={currentView} />
        </div>
      </div>

      {/* Filters - only show in table view */}
      {currentView === 'table' && (
        <AttendanceFilters
          branches={activeBranches.map(b => ({ id: b.id, name: b.name }))}
          isEmployee={isEmployee}
        />
      )}

      {/* Branch View or Table View */}
      {currentView === 'branch' ? (
        <BranchView
          records={allAttendance}
          branches={branches}
        />
      ) : (
        <AttendanceTable
          records={filteredAttendance}
          canEditAttendance={canEditAttendance}
        />
      )}
    </div>
  );
}
