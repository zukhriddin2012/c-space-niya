import { getSession } from '@/lib/auth-server';
import { redirect } from 'next/navigation';
import {
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle,
  Download,
  MapPin,
  Users,
  TrendingUp,
  Moon,
} from 'lucide-react';
import { getBranches, getEmployees, getAttendanceByDate, getWeeklyAttendanceSummary } from '@/lib/db';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import AttendanceFilters from './AttendanceFilters';
import AttendanceMap from '@/components/AttendanceMap';
import ManualCheckoutButton from './ManualCheckoutButton';
import ReminderButton from './ReminderButton';

// Get current date in Tashkent timezone (UTC+5) - consistent with bot
function getTashkentDateString(): string {
  const now = new Date();
  const tashkentTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Tashkent' }));
  const year = tashkentTime.getFullYear();
  const month = String(tashkentTime.getMonth() + 1).padStart(2, '0');
  const day = String(tashkentTime.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

interface AttendanceRecord {
  id: string;
  attendanceDbId: string | null; // The actual database ID for API calls
  employeeDbId: string; // The employee's database UUID for API calls
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

interface Branch {
  id: string;
  name: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
}

// Fetch attendance data for a specific date
async function getAttendanceForDate(date: string): Promise<AttendanceRecord[]> {
  const [attendance, employees, branches] = await Promise.all([
    getAttendanceByDate(date),
    getEmployees(),
    getBranches(),
  ]);

  const branchMap = new Map(branches.map(b => [b.id, b.name]));
  const employeeMap = new Map(employees.map(e => [e.id, e]));

  // Create attendance records for employees who checked in
  const attendanceRecords: AttendanceRecord[] = attendance.map((a: any) => {
    const employee = employeeMap.get(a.employee_id) || a.employees;
    const recordDate = a.is_overnight ? a.overnight_from_date : date;
    return {
      id: a.id,
      attendanceDbId: a.id, // The actual database ID for API calls
      employeeDbId: a.employee_id, // The employee's database UUID
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

  // Add absent employees (those not in attendance)
  const checkedInIds = new Set(attendance.map((a: any) => a.employee_id));
  const absentEmployees = employees
    .filter(e => !checkedInIds.has(e.id))
    .map(e => ({
      id: `absent-${e.id}`,
      attendanceDbId: null, // No attendance record exists
      employeeDbId: e.id, // The employee's database UUID
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


function StatusBadge({ status, isOvernight }: { status: string; isOvernight?: boolean }) {
  const statusConfig: Record<
    string,
    { label: string; className: string; icon: React.ComponentType<{ size?: number }> }
  > = {
    present: {
      label: 'On Time',
      className: 'bg-green-50 text-green-700',
      icon: CheckCircle,
    },
    late: {
      label: 'Late',
      className: 'bg-orange-50 text-orange-700',
      icon: AlertCircle,
    },
    absent: {
      label: 'Absent',
      className: 'bg-red-50 text-red-700',
      icon: XCircle,
    },
    early_leave: {
      label: 'Early Leave',
      className: 'bg-yellow-50 text-yellow-700',
      icon: Clock,
    },
    overnight: {
      label: 'Overnight',
      className: 'bg-indigo-50 text-indigo-700',
      icon: Moon,
    },
  };

  // Show overnight badge for night shift workers from previous day
  const displayStatus = isOvernight ? 'overnight' : status;

  const config = statusConfig[displayStatus] || statusConfig.absent;
  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${config.className}`}
    >
      <Icon size={12} />
      {config.label}
    </span>
  );
}

function SourceBadge({ source }: { source: string | null }) {
  if (!source) return <span className="text-gray-400">-</span>;

  const sourceConfig: Record<string, { label: string; className: string }> = {
    telegram: { label: 'Telegram', className: 'bg-blue-50 text-blue-700' },
    web: { label: 'Web', className: 'bg-purple-50 text-purple-700' },
    manual: { label: 'Manual', className: 'bg-gray-50 text-gray-700' },
  };

  const config = sourceConfig[source] || sourceConfig.manual;

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${config.className}`}
    >
      {config.label}
    </span>
  );
}

function formatTime(dateString: string | null) {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function calculateHours(checkIn: string | null, checkOut: string | null) {
  if (!checkIn || !checkOut) return '-';
  const start = new Date(checkIn);
  const end = new Date(checkOut);
  const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
  return `${hours.toFixed(1)}h`;
}

function BranchAttendanceCard({
  branchId,
  branchName,
  attendance
}: {
  branchId: string;
  branchName: string;
  attendance: AttendanceRecord[];
}) {
  const branchAttendance = attendance.filter(a => a.branchId === branchId);
  const present = branchAttendance.filter(a => a.status === 'present' || a.status === 'late').length;
  const total = branchAttendance.length;
  const percentage = total > 0 ? Math.round((present / total) * 100) : 0;

  return (
    <div className="bg-gray-50 rounded-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-900">{branchName}</span>
        <span className="text-xs text-gray-500">{present}/{total}</span>
      </div>
      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${
            percentage >= 80 ? 'bg-green-500' : percentage >= 60 ? 'bg-yellow-500' : 'bg-red-500'
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

export default async function AttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; branch?: string; status?: string }>;
}) {
  const user = await getSession();

  if (!user) {
    redirect('/login');
  }

  // For employees, show only their own attendance
  const isEmployee = user.role === 'employee';

  // Check if user can edit attendance (for manual checkout)
  const canEditAttendance = hasPermission(user.role, PERMISSIONS.ATTENDANCE_EDIT);

  // Get filter params
  const params = await searchParams;
  // Use Tashkent timezone for default date - consistent with bot's getTodayKey()
  const selectedDate = params.date || getTashkentDateString();
  const selectedBranch = params.branch || '';
  const selectedStatus = params.status || '';

  // Fetch real data from Supabase
  const [allAttendance, branches] = await Promise.all([
    getAttendanceForDate(selectedDate),
    getBranches(),
  ]);

  // Apply filters
  let filteredAttendance = allAttendance;

  if (selectedBranch) {
    filteredAttendance = filteredAttendance.filter(a => a.branchId === selectedBranch);
  }

  if (selectedStatus) {
    filteredAttendance = filteredAttendance.filter(a => a.status === selectedStatus);
  }

  // Present = currently in office (checked in, not checked out yet) - includes both on-time and late arrivals
  const currentlyPresent = allAttendance.filter((a) =>
    (a.status === 'present' || a.status === 'late') && !a.checkOutTime
  ).length;

  const stats = {
    present: currentlyPresent,
    late: allAttendance.filter((a) => a.status === 'late').length,
    absent: allAttendance.filter((a) => a.status === 'absent').length,
    earlyLeave: allAttendance.filter((a) => a.status === 'early_leave').length,
  };

  const totalCheckedIn = allAttendance.filter((a) => a.status === 'present' || a.status === 'late' || a.status === 'early_leave').length;
  const attendanceRate = allAttendance.length > 0
    ? Math.round((totalCheckedIn / allAttendance.length) * 100)
    : 0;

  // Get branches with employees
  const activeBranches = branches.filter(b =>
    allAttendance.some(a => a.branchId === b.id)
  );

  const weeklySummary = await getWeeklyAttendanceSummary(allAttendance.length);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Attendance</h1>
          <p className="text-gray-500 mt-1">
            {isEmployee
              ? 'View your attendance history'
              : `Monitor and manage employee attendance across all branches`}
          </p>
        </div>
        {!isEmployee && (
          <button className="inline-flex items-center gap-2 px-4 py-2.5 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition-colors">
            <Download size={20} />
            Export Report
          </button>
        )}
      </div>

      {/* Stats Summary */}
      {!isEmployee && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-2 text-purple-600 mb-2">
              <Users size={20} />
              <span className="text-sm font-medium">Total</span>
            </div>
            <p className="text-2xl font-semibold text-gray-900">{allAttendance.length}</p>
            <p className="text-xs text-gray-500 mt-1">employees</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-2 text-green-600 mb-2">
              <CheckCircle size={20} />
              <span className="text-sm font-medium">Present Now</span>
            </div>
            <p className="text-2xl font-semibold text-gray-900">{stats.present}</p>
            <p className="text-xs text-green-600 mt-1">currently in office</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-2 text-orange-600 mb-2">
              <AlertCircle size={20} />
              <span className="text-sm font-medium">Late</span>
            </div>
            <p className="text-2xl font-semibold text-gray-900">{stats.late}</p>
            <p className="text-xs text-orange-600 mt-1">after 9:00 AM</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-2 text-red-600 mb-2">
              <XCircle size={20} />
              <span className="text-sm font-medium">Absent</span>
            </div>
            <p className="text-2xl font-semibold text-gray-900">{stats.absent}</p>
            <p className="text-xs text-red-600 mt-1">not checked in</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-2 text-yellow-600 mb-2">
              <Clock size={20} />
              <span className="text-sm font-medium">Early Leave</span>
            </div>
            <p className="text-2xl font-semibold text-gray-900">{stats.earlyLeave}</p>
            <p className="text-xs text-yellow-600 mt-1">left before 5 PM</p>
          </div>
        </div>
      )}

      {/* Interactive Attendance Map */}
      {!isEmployee && branches.length > 0 && (
        <div className="mb-6">
          <AttendanceMap
            branches={branches.map(branch => {
              const branchAttendance = allAttendance.filter(a => a.branchId === branch.id);
              return {
                id: branch.id,
                name: branch.name,
                address: branch.address,
                latitude: branch.latitude,
                longitude: branch.longitude,
                present: branchAttendance.filter(a => (a.status === 'present' || a.status === 'late') && !a.checkOutTime).length,
                late: branchAttendance.filter(a => a.status === 'late').length,
                absent: branchAttendance.filter(a => a.status === 'absent').length,
                earlyLeave: branchAttendance.filter(a => a.status === 'early_leave').length,
                total: branchAttendance.length,
              };
            })}
            height="380px"
            selectedDate={selectedDate}
          />
        </div>
      )}

      {/* Branch Attendance Cards */}
      {!isEmployee && activeBranches.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <MapPin size={20} className="text-purple-600" />
            <h3 className="font-semibold text-gray-900">Branch Attendance Summary</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {activeBranches.map(branch => (
              <BranchAttendanceCard
                key={branch.id}
                branchId={branch.id}
                branchName={branch.name}
                attendance={allAttendance}
              />
            ))}
          </div>
        </div>
      )}

      {/* Weekly Summary Chart */}
      {!isEmployee && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={20} className="text-purple-600" />
            <h3 className="font-semibold text-gray-900">This Week&apos;s Attendance</h3>
          </div>
          <div className="flex items-end gap-4 h-32">
            {weeklySummary.map((day, index) => {
              const safeTotal = day.total > 0 ? day.total : 1;
              const presentHeight = (day.present / safeTotal) * 100;
              const lateHeight = (day.late / safeTotal) * 100;
              const isToday = index === (new Date().getDay() === 0 ? 6 : new Date().getDay() - 1);
              const isWeekend = index === 5 || index === 6; // Sat = 5, Sun = 6 in this array
              return (
                <div key={day.day} className="flex-1 flex flex-col items-center gap-1">
                  <div className={`w-full flex flex-col-reverse h-24 rounded overflow-hidden ${isWeekend ? 'bg-gray-50' : 'bg-gray-100'}`}>
                    {!isWeekend && (
                      <>
                        <div
                          className="bg-green-500 transition-all"
                          style={{ height: `${presentHeight}%` }}
                        />
                        <div
                          className="bg-orange-400 transition-all"
                          style={{ height: `${lateHeight}%` }}
                        />
                      </>
                    )}
                  </div>
                  <span className={`text-xs ${isToday ? 'font-bold text-purple-600' : isWeekend ? 'text-gray-400' : 'text-gray-500'}`}>
                    {day.day}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="flex items-center gap-6 mt-4 justify-center">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded" />
              <span className="text-xs text-gray-600">Present</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-orange-400 rounded" />
              <span className="text-xs text-gray-600">Late</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-gray-100 rounded" />
              <span className="text-xs text-gray-600">Absent</span>
            </div>
          </div>
        </div>
      )}

      {/* Filters - Now with Apply button */}
      <AttendanceFilters
        branches={activeBranches.map(b => ({ id: b.id, name: b.name }))}
        isEmployee={isEmployee}
      />

      {/* Attendance Table - Desktop */}
      <div className="hidden md:block bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left px-4 lg:px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Employee
                </th>
                <th className="text-left px-4 lg:px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Branch
                </th>
                <th className="text-left px-4 lg:px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Check In
                </th>
                <th className="text-left px-4 lg:px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Check Out
                </th>
                <th className="text-left px-4 lg:px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Hours
                </th>
                <th className="text-left px-4 lg:px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                {canEditAttendance && (
                  <th className="text-left px-4 lg:px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredAttendance.map((record) => (
                <tr key={record.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 lg:px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-purple-700 text-sm font-medium">
                          {record.employeeName.charAt(0)}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 truncate">{record.employeeName}</p>
                        <p className="text-xs text-gray-500 truncate">{record.position}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 lg:px-6 py-4">
                    <div className="flex items-center gap-2">
                      <MapPin size={14} className="text-gray-400 flex-shrink-0" />
                      <span className="text-sm text-gray-900 truncate">{record.branchName}</span>
                    </div>
                  </td>
                  <td className="px-4 lg:px-6 py-4">
                    <span className={`text-sm ${record.status === 'late' && !record.isOvernight ? 'text-orange-600 font-medium' : 'text-gray-900'}`}>
                      {formatTime(record.checkInTime)}
                      {record.isOvernight && <span className="text-indigo-500 text-xs ml-1">(prev)</span>}
                    </span>
                  </td>
                  <td className="px-4 lg:px-6 py-4">
                    <span className={`text-sm ${record.status === 'early_leave' ? 'text-yellow-600 font-medium' : 'text-gray-900'}`}>
                      {formatTime(record.checkOutTime)}
                    </span>
                  </td>
                  <td className="px-4 lg:px-6 py-4 text-sm text-gray-900">
                    {record.totalHours ? `${record.totalHours}h` : calculateHours(record.checkInTime, record.checkOutTime)}
                  </td>
                  <td className="px-4 lg:px-6 py-4">
                    <StatusBadge status={record.status} isOvernight={record.isOvernight} />
                  </td>
                  {canEditAttendance && (
                    <td className="px-4 lg:px-6 py-4">
                      <div className="flex items-center gap-2">
                        {/* Show manual checkout button only if: checked in, not checked out, not absent */}
                        {record.attendanceDbId && record.checkInTime && !record.checkOutTime && record.status !== 'absent' && (
                          <ManualCheckoutButton
                            attendanceId={record.attendanceDbId}
                            employeeName={record.employeeName}
                            checkInTime={formatTime(record.checkInTime)}
                          />
                        )}
                        {/* Show check-in reminder for absent employees */}
                        {record.status === 'absent' && (
                          <ReminderButton
                            employeeId={record.employeeDbId}
                            employeeName={record.employeeName}
                            type="checkin"
                          />
                        )}
                        {/* Show check-out reminder for employees who checked in but not out */}
                        {record.checkInTime && !record.checkOutTime && record.status !== 'absent' && (
                          <ReminderButton
                            employeeId={record.employeeDbId}
                            employeeName={record.employeeName}
                            type="checkout"
                          />
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredAttendance.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No attendance records found for the selected filters.</p>
          </div>
        )}

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 lg:px-6 py-4 border-t border-gray-200 bg-gray-50">
          <p className="text-sm text-gray-500">
            Showing <span className="font-medium">1</span> to{' '}
            <span className="font-medium">{filteredAttendance.length}</span> of{' '}
            <span className="font-medium">{filteredAttendance.length}</span> records
          </p>
          <div className="flex gap-2">
            <button
              disabled
              className="px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-400 cursor-not-allowed"
            >
              Previous
            </button>
            <button
              disabled
              className="px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-400 cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Attendance Cards - Mobile */}
      <div className="md:hidden space-y-3">
        {filteredAttendance.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
            <p className="text-gray-500">No attendance records found for the selected filters.</p>
          </div>
        ) : (
          filteredAttendance.map((record) => (
            <div key={record.id} className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-purple-700 font-medium">
                      {record.employeeName.charAt(0)}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900">{record.employeeName}</p>
                    <p className="text-xs text-gray-500">{record.position}</p>
                  </div>
                </div>
                <StatusBadge status={record.status} isOvernight={record.isOvernight} />
              </div>

              <div className="flex items-center gap-2 text-sm text-gray-500 mb-3">
                <MapPin size={14} />
                <span>{record.branchName}</span>
                {record.isOvernight && record.overnightFromDate && (
                  <span className="text-indigo-600 text-xs">(from {record.overnightFromDate})</span>
                )}
              </div>

              <div className="grid grid-cols-3 gap-3 text-center bg-gray-50 rounded-lg p-3">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Check In</p>
                  <p className={`text-sm font-medium ${record.status === 'late' ? 'text-orange-600' : 'text-gray-900'}`}>
                    {formatTime(record.checkInTime)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Check Out</p>
                  <p className={`text-sm font-medium ${record.status === 'early_leave' ? 'text-yellow-600' : 'text-gray-900'}`}>
                    {formatTime(record.checkOutTime)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Hours</p>
                  <p className="text-sm font-medium text-gray-900">
                    {record.totalHours ? `${record.totalHours}h` : calculateHours(record.checkInTime, record.checkOutTime)}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}

        {/* Mobile Pagination */}
        {filteredAttendance.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-sm text-gray-500 text-center">
              Showing {filteredAttendance.length} records
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
