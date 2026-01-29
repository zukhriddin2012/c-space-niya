import { getSession } from '@/lib/auth-server';
import { redirect } from 'next/navigation';
import { Download } from 'lucide-react';
import { getBranches, getEmployees, getAttendanceByDate, getCheckoutRemindersByAttendanceIds, CheckoutReminder } from '@/lib/db';
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

interface AttendanceSession {
  id: string;
  checkIn: string | null;
  checkOut: string | null;
  branchName: string;
  totalHours: number | null;
  status: 'present' | 'late' | 'early_leave';
  isActive: boolean;
  source: 'telegram' | 'web' | 'manual' | null;
}

interface ReminderInfo {
  status: 'pending' | 'sent' | 'scheduled' | 'responded' | 'completed' | 'auto_completed';
  sentAt: string | null;
  responseType: string | null;
  responseAt: string | null;
  nextReminder: string | null;
  ipVerified: boolean | null;
  reminderCount: number;
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
  shiftType?: 'day' | 'night'; // Based on check-in time: <= 15:30 = day, > 15:30 = night
  // Multi-session support
  sessions: AttendanceSession[];
  sessionCount: number;
  totalSessionHours: number;
  hasActiveSession: boolean;
  // Reminder info
  reminder?: ReminderInfo;
}

// Fetch attendance data for a specific date (uses pre-fetched branches/employees)
// Groups multiple sessions per employee
async function getAttendanceForDate(
  date: string,
  employees: Awaited<ReturnType<typeof getEmployees>>,
  branches: Awaited<ReturnType<typeof getBranches>>
): Promise<AttendanceRecord[]> {
  // Fetch attendance first
  const attendance = await getAttendanceByDate(date);

  // Collect all attendance IDs (including overnight records which have different dates)
  // This ensures we get reminders for overnight records displayed on today's page
  const allAttendanceIds = attendance.map(a => a.id);
  const remindersMap = await getCheckoutRemindersByAttendanceIds(allAttendanceIds);

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
      source: s.verification_type === 'ip' ? 'web' as const : s.verification_type === 'remote' ? 'web' as const : 'telegram' as const,
      verificationType: s.verification_type as 'ip' | 'gps' | 'remote' | null,
    }));

    // Use the latest session for main display, but include all sessions
    const recordDate = latestSession.is_overnight ? latestSession.overnight_from_date : date;

    // Get reminder info for the active session (or latest session)
    const attendanceIdForReminder = activeSession?.id || latestSession.id;
    const reminders = remindersMap.get(attendanceIdForReminder) || [];
    let reminderInfo: ReminderInfo | undefined;

    if (reminders.length > 0) {
      // Get the latest reminder
      const latestReminder = reminders[0]; // Already sorted by created_at desc
      // Find next scheduled reminder
      const scheduledReminder = reminders.find(r => r.status === 'scheduled');

      reminderInfo = {
        status: latestReminder.status as ReminderInfo['status'],
        sentAt: latestReminder.reminder_sent_at,  // Use correct column name
        responseType: latestReminder.response_type,
        responseAt: latestReminder.response_received_at,
        nextReminder: scheduledReminder?.scheduled_for || null,
        ipVerified: latestReminder.ip_verified,
        reminderCount: reminders.filter(r => r.status === 'sent' || r.status === 'responded').length,
      };
    }

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
      source: latestSession.verification_type === 'ip' ? 'web' as const : latestSession.verification_type === 'remote' ? 'web' as const : 'telegram' as const,
      verificationType: latestSession.verification_type as 'ip' | 'gps' | 'remote' | null,
      totalHours: latestSession.total_hours,
      isOvernight: latestSession.is_overnight || false,
      overnightFromDate: latestSession.overnight_from_date,
      // Determine shift type based on check-in time: <= 15:30 = day shift, > 15:30 = night shift
      shiftType: latestSession.check_in && latestSession.check_in.substring(0, 5) <= '15:30' ? 'day' : 'night',
      // Multi-session data
      sessions: sessionsList,
      sessionCount: sessions.length,
      totalSessionHours: Math.round(totalSessionHours * 10) / 10,
      hasActiveSession: !!activeSession,
      // Reminder info
      reminder: reminderInfo,
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
