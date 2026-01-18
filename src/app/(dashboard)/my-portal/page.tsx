import { getSession } from '@/lib/auth-server';
import { redirect } from 'next/navigation';
import {
  getEmployeeByEmail,
  getAttendanceByEmployee,
  getLeaveRequestsByEmployee,
  getPayslipsByEmployee,
  getEmployeeAttendanceSummary,
} from '@/lib/db';
import {
  User,
  Clock,
  Calendar,
  Wallet,
  TrendingUp,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ArrowRight,
  FileText,
  Banknote,
} from 'lucide-react';
import Link from 'next/link';

function formatTime(timeString: string | null): string {
  if (!timeString) return '-';
  return new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('uz-UZ').format(amount) + ' UZS';
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'present':
      return 'bg-green-100 text-green-700';
    case 'late':
      return 'bg-yellow-100 text-yellow-700';
    case 'absent':
      return 'bg-red-100 text-red-700';
    case 'early_leave':
      return 'bg-orange-100 text-orange-700';
    default:
      return 'bg-gray-100 text-gray-700';
  }
}

function getLeaveStatusColor(status: string): string {
  switch (status) {
    case 'approved':
      return 'bg-green-100 text-green-700';
    case 'pending':
      return 'bg-yellow-100 text-yellow-700';
    case 'rejected':
      return 'bg-red-100 text-red-700';
    default:
      return 'bg-gray-100 text-gray-700';
  }
}

export default async function MyPortalPage() {
  const user = await getSession();

  if (!user) {
    redirect('/login');
  }

  // Get employee data linked to this user
  const employee = await getEmployeeByEmail(user.email);

  // If no employee linked, show a message
  if (!employee) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <User size={48} className="mx-auto text-gray-400 mb-4" />
          <h1 className="text-xl font-semibold text-gray-900 mb-2">
            Employee Profile Not Found
          </h1>
          <p className="text-gray-600">
            Your account is not linked to an employee profile. Please contact HR to set up your profile.
          </p>
        </div>
      </div>
    );
  }

  // Fetch employee data
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const [recentAttendance, leaveRequests, payslips, monthlySummary] = await Promise.all([
    getAttendanceByEmployee(employee.id, 7),
    getLeaveRequestsByEmployee(employee.id),
    getPayslipsByEmployee(employee.id),
    getEmployeeAttendanceSummary(employee.id, currentYear, currentMonth),
  ]);

  const pendingLeaves = leaveRequests.filter((l) => l.status === 'pending').length;
  const latestPayslip = payslips[0];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Portal</h1>
          <p className="text-gray-600">Welcome back, {employee.full_name}</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-500">Employee ID</p>
          <p className="font-mono font-medium text-gray-900">{employee.employee_id}</p>
        </div>
      </div>

      {/* Profile Card */}
      <div className="bg-gradient-to-r from-purple-600 to-purple-700 rounded-xl p-6 text-white">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center text-2xl font-bold">
            {employee.full_name.charAt(0)}
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-semibold">{employee.full_name}</h2>
            <p className="text-purple-200">{employee.position}</p>
            <div className="flex items-center gap-4 mt-2 text-sm text-purple-200">
              <span className="capitalize">{employee.level} Level</span>
              <span>•</span>
              <span>{employee.branches?.name || 'No Branch'}</span>
            </div>
          </div>
          <Link
            href="/my-portal/profile"
            className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors"
          >
            View Profile
          </Link>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle2 size={20} className="text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{monthlySummary.presentDays}</p>
              <p className="text-sm text-gray-500">Days Present</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
              <AlertCircle size={20} className="text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{monthlySummary.lateDays}</p>
              <p className="text-sm text-gray-500">Late Arrivals</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Clock size={20} className="text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{monthlySummary.totalHours}h</p>
              <p className="text-sm text-gray-500">Hours Worked</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <Calendar size={20} className="text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{pendingLeaves}</p>
              <p className="text-sm text-gray-500">Pending Leaves</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Attendance */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Recent Attendance</h3>
            <Link
              href="/my-portal/attendance"
              className="text-sm text-purple-600 hover:text-purple-700 flex items-center gap-1"
            >
              View All <ArrowRight size={14} />
            </Link>
          </div>
          <div className="divide-y divide-gray-100">
            {recentAttendance.length === 0 ? (
              <div className="p-6 text-center text-gray-500">No attendance records found</div>
            ) : (
              recentAttendance.slice(0, 5).map((record) => (
                <div key={record.id} className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{formatDate(record.date)}</p>
                    <p className="text-sm text-gray-500">
                      {formatTime(record.check_in)} - {formatTime(record.check_out)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-600">
                      {record.total_hours ? `${record.total_hours.toFixed(1)}h` : '-'}
                    </span>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${getStatusColor(
                        record.status
                      )}`}
                    >
                      {record.status.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Leave Requests */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Leave Requests</h3>
            <Link
              href="/my-portal/leaves"
              className="text-sm text-purple-600 hover:text-purple-700 flex items-center gap-1"
            >
              Request Leave <ArrowRight size={14} />
            </Link>
          </div>
          <div className="divide-y divide-gray-100">
            {leaveRequests.length === 0 ? (
              <div className="p-6 text-center text-gray-500">No leave requests</div>
            ) : (
              leaveRequests.slice(0, 4).map((leave) => (
                <div key={leave.id} className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">
                      {formatDate(leave.start_date)} - {formatDate(leave.end_date)}
                    </p>
                    <p className="text-sm text-gray-500">{leave.reason || 'No reason provided'}</p>
                  </div>
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${getLeaveStatusColor(
                      leave.status
                    )}`}
                  >
                    {leave.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Payment History Quick Access */}
      <div className="bg-gradient-to-r from-orange-50 to-green-50 rounded-xl border border-orange-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex -space-x-2">
              <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center border-2 border-white">
                <Banknote size={18} className="text-orange-600" />
              </div>
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center border-2 border-white">
                <Wallet size={18} className="text-green-600" />
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Payment History</h3>
              <p className="text-sm text-gray-600">View your advance and wage payments</p>
            </div>
          </div>
          <Link
            href="/my-portal/payments"
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
          >
            View Payments <ArrowRight size={14} />
          </Link>
        </div>
      </div>

      {/* Latest Payslip */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Latest Payslip</h3>
          <Link
            href="/my-portal/payslips"
            className="text-sm text-purple-600 hover:text-purple-700 flex items-center gap-1"
          >
            View All Payslips <ArrowRight size={14} />
          </Link>
        </div>
        {latestPayslip ? (
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-sm text-gray-500">
                  {new Date(latestPayslip.year, latestPayslip.month - 1).toLocaleDateString('en-US', {
                    month: 'long',
                    year: 'numeric',
                  })}
                </p>
                <p className="text-3xl font-bold text-gray-900">
                  {formatCurrency(latestPayslip.net_salary)}
                </p>
              </div>
              <span
                className={`px-3 py-1 rounded-full text-sm font-medium ${
                  latestPayslip.status === 'paid'
                    ? 'bg-green-100 text-green-700'
                    : latestPayslip.status === 'approved'
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-gray-100 text-gray-700'
                }`}
              >
                {latestPayslip.status.charAt(0).toUpperCase() + latestPayslip.status.slice(1)}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">Monthly Salary</p>
                <p className="font-medium text-gray-900">{formatCurrency(latestPayslip.base_salary)}</p>
              </div>
              {latestPayslip.bonuses > 0 && (
                <div className="p-3 bg-green-50 rounded-lg">
                  <p className="text-sm text-gray-500">Bonus</p>
                  <p className="font-medium text-green-600">+{formatCurrency(latestPayslip.bonuses)}</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="p-6 text-center text-gray-500">No payslips available</div>
        )}
      </div>
    </div>
  );
}
