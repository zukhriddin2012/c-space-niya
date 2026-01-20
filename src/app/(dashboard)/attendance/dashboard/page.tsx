import { getSession } from '@/lib/auth-server';
import { redirect } from 'next/navigation';
import {
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle,
  Users,
  MapPin,
  TrendingUp,
} from 'lucide-react';
import { getBranches, getEmployees, getAttendanceByDate, getWeeklyAttendanceSummary } from '@/lib/db';
import AttendanceMap from '@/components/AttendanceMap';

// Get current date in Tashkent timezone (UTC+5)
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
  employeeDbId: string;
  branchId: string | null;
  checkOutTime: string | null;
  status: 'present' | 'late' | 'absent' | 'early_leave';
}

async function getAttendanceForDate(date: string): Promise<AttendanceRecord[]> {
  const [attendance, employees, branches] = await Promise.all([
    getAttendanceByDate(date),
    getEmployees(),
    getBranches(),
  ]);

  const branchMap = new Map(branches.map(b => [b.id, b.name]));

  // Deduplicate by employee_id
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

  const attendanceRecords: AttendanceRecord[] = Array.from(employeeAttendanceMap.values()).map((a: any) => ({
    id: a.id,
    employeeDbId: a.employee_id,
    branchId: a.check_in_branch_id,
    checkOutTime: a.check_out ? `${date}T${a.check_out}` : null,
    status: a.status as 'present' | 'late' | 'absent' | 'early_leave',
  }));

  const checkedInIds = new Set(employeeAttendanceMap.keys());
  const activeEmployees = employees.filter(e => e.status === 'active');
  const absentEmployees = activeEmployees
    .filter(e => !checkedInIds.has(e.id))
    .map(e => ({
      id: `absent-${e.id}`,
      employeeDbId: e.id,
      branchId: e.branch_id,
      checkOutTime: null,
      status: 'absent' as const,
    }));

  return [...attendanceRecords, ...absentEmployees];
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

export default async function AttendanceDashboardPage() {
  const user = await getSession();
  if (!user) redirect('/login');

  const isEmployee = user.role === 'employee';
  if (isEmployee) redirect('/attendance/sheet');

  const selectedDate = getTashkentDateString();

  const [allAttendance, branches] = await Promise.all([
    getAttendanceForDate(selectedDate),
    getBranches(),
  ]);

  const currentlyPresent = allAttendance.filter((a) =>
    (a.status === 'present' || a.status === 'late') && !a.checkOutTime
  ).length;

  const stats = {
    total: allAttendance.length,
    present: currentlyPresent,
    late: allAttendance.filter((a) => a.status === 'late').length,
    absent: allAttendance.filter((a) => a.status === 'absent').length,
    earlyLeave: allAttendance.filter((a) => a.status === 'early_leave').length,
  };

  const activeBranches = branches.filter(b => allAttendance.some(a => a.branchId === b.id));
  const weeklySummary = await getWeeklyAttendanceSummary(allAttendance.length);

  return (
    <div className="space-y-4 xl:space-y-6">
      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 xl:gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-3 xl:p-4">
          <div className="flex items-center gap-1.5 xl:gap-2 text-purple-600 mb-1.5 xl:mb-2">
            <Users size={18} />
            <span className="text-xs xl:text-sm font-medium">Total</span>
          </div>
          <p className="text-xl xl:text-2xl font-semibold text-gray-900">{stats.total}</p>
          <p className="text-xs text-gray-500 mt-0.5 xl:mt-1">employees</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-3 xl:p-4">
          <div className="flex items-center gap-1.5 xl:gap-2 text-green-600 mb-1.5 xl:mb-2">
            <CheckCircle size={18} />
            <span className="text-xs xl:text-sm font-medium">Present Now</span>
          </div>
          <p className="text-xl xl:text-2xl font-semibold text-gray-900">{stats.present}</p>
          <p className="text-xs text-green-600 mt-0.5 xl:mt-1">in office</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-3 xl:p-4">
          <div className="flex items-center gap-1.5 xl:gap-2 text-orange-600 mb-1.5 xl:mb-2">
            <AlertCircle size={18} />
            <span className="text-xs xl:text-sm font-medium">Late</span>
          </div>
          <p className="text-xl xl:text-2xl font-semibold text-gray-900">{stats.late}</p>
          <p className="text-xs text-orange-600 mt-0.5 xl:mt-1">after 9 AM</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-3 xl:p-4">
          <div className="flex items-center gap-1.5 xl:gap-2 text-red-600 mb-1.5 xl:mb-2">
            <XCircle size={18} />
            <span className="text-xs xl:text-sm font-medium">Absent</span>
          </div>
          <p className="text-xl xl:text-2xl font-semibold text-gray-900">{stats.absent}</p>
          <p className="text-xs text-red-600 mt-0.5 xl:mt-1">not checked in</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-3 xl:p-4">
          <div className="flex items-center gap-1.5 xl:gap-2 text-yellow-600 mb-1.5 xl:mb-2">
            <Clock size={18} />
            <span className="text-xs xl:text-sm font-medium">Early Leave</span>
          </div>
          <p className="text-xl xl:text-2xl font-semibold text-gray-900">{stats.earlyLeave}</p>
          <p className="text-xs text-yellow-600 mt-0.5 xl:mt-1">left early</p>
        </div>
      </div>

      {/* Map and Branch Summary - Side by Side on Desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 xl:gap-6">
        {/* Interactive Attendance Map */}
        {branches.length > 0 && (
          <div className="lg:col-span-2">
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
              height="300px"
              selectedDate={selectedDate}
            />
          </div>
        )}

        {/* Branch Attendance Cards */}
        {activeBranches.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-4 xl:p-5 flex flex-col" style={{ height: '300px' }}>
            <div className="flex items-center gap-2 mb-3 xl:mb-4 flex-shrink-0">
              <MapPin size={18} className="text-purple-600" />
              <h3 className="text-sm xl:text-base font-semibold text-gray-900">Branch Summary</h3>
            </div>
            <div className="space-y-2.5 xl:space-y-3 overflow-y-auto flex-1 pr-1">
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
      </div>

      {/* Weekly Summary Chart */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
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
            const isWeekend = index === 5 || index === 6;
            return (
              <div key={day.day} className="flex-1 flex flex-col items-center gap-1">
                <div className={`w-full flex flex-col-reverse h-24 rounded overflow-hidden ${isWeekend ? 'bg-gray-50' : 'bg-gray-100'}`}>
                  {!isWeekend && (
                    <>
                      <div className="bg-green-500 transition-all" style={{ height: `${presentHeight}%` }} />
                      <div className="bg-orange-400 transition-all" style={{ height: `${lateHeight}%` }} />
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
            <span className="text-xs text-gray-600">On Time</span>
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
    </div>
  );
}
