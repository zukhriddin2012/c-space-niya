import { getSession } from '@/lib/auth-server';
import { hasPermission } from '@/lib/auth';
import { redirect, notFound } from 'next/navigation';
import { ArrowLeft, User, Briefcase, MapPin, Clock, Phone, Mail, Calendar, CheckCircle, AlertCircle, XCircle } from 'lucide-react';
import Link from 'next/link';
import { getEmployeeById, getBranches, getAttendanceByEmployeeAndMonth } from '@/lib/db';

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ year?: string; month?: string }>;
}

function formatSalary(amount: number): string {
  if (!amount || amount === 0) return '-';
  return new Intl.NumberFormat('uz-UZ').format(amount) + ' UZS';
}

function formatDate(dateString: string | null): string {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatTime(timeString: string | null): string {
  if (!timeString) return '-';
  return timeString.substring(0, 5);
}

function StatusBadge({ status }: { status: string }) {
  const statusConfig: Record<string, { label: string; className: string; icon: React.ComponentType<{ size?: number }> }> = {
    present: { label: 'Present', className: 'bg-green-50 text-green-700', icon: CheckCircle },
    late: { label: 'Late', className: 'bg-orange-50 text-orange-700', icon: AlertCircle },
    absent: { label: 'Absent', className: 'bg-red-50 text-red-700', icon: XCircle },
    early_leave: { label: 'Early Leave', className: 'bg-yellow-50 text-yellow-700', icon: Clock },
  };

  const config = statusConfig[status] || statusConfig.absent;
  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${config.className}`}>
      <Icon size={12} />
      {config.label}
    </span>
  );
}

function EmployeeStatusBadge({ status }: { status: string }) {
  const statusStyles: Record<string, string> = {
    active: 'bg-green-50 text-green-700',
    inactive: 'bg-gray-50 text-gray-700',
    terminated: 'bg-red-50 text-red-700',
    probation: 'bg-yellow-50 text-yellow-700',
  };

  const statusLabels: Record<string, string> = {
    active: 'Active',
    inactive: 'Inactive',
    terminated: 'Terminated',
    probation: 'Probation',
  };

  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${statusStyles[status] || statusStyles.inactive}`}>
      {statusLabels[status] || status}
    </span>
  );
}

function LevelBadge({ level }: { level: string }) {
  const levelStyles: Record<string, string> = {
    junior: 'bg-blue-50 text-blue-700',
    middle: 'bg-purple-50 text-purple-700',
    senior: 'bg-indigo-50 text-indigo-700',
    executive: 'bg-pink-50 text-pink-700',
  };

  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${levelStyles[level] || levelStyles.junior}`}>
      {level.charAt(0).toUpperCase() + level.slice(1)}
    </span>
  );
}

export default async function EmployeeDetailPage({ params, searchParams }: PageProps) {
  const user = await getSession();

  if (!user) {
    redirect('/login');
  }

  // Check permission
  if (!hasPermission(user.role, 'view_all_employees')) {
    redirect('/dashboard');
  }

  const canViewSalary = user.role === 'general_manager' || user.role === 'ceo';

  // Get params
  const { id } = await params;
  const queryParams = await searchParams;

  // Get current year and month for default
  const now = new Date();
  const selectedYear = queryParams.year ? parseInt(queryParams.year) : now.getFullYear();
  const selectedMonth = queryParams.month ? parseInt(queryParams.month) : now.getMonth() + 1;

  // Fetch employee data
  const employee = await getEmployeeById(id);

  if (!employee) {
    notFound();
  }

  // Fetch branches and attendance data
  const [branches, monthlyAttendance] = await Promise.all([
    getBranches(),
    getAttendanceByEmployeeAndMonth(id, selectedYear, selectedMonth),
  ]);

  // Create branch map
  const branchMap = new Map(branches.map(b => [b.id, b.name]));

  // Calculate monthly statistics
  const totalWorkHours = monthlyAttendance.reduce((sum, a) => sum + (a.total_hours || 0), 0);
  const daysPresent = monthlyAttendance.filter(a => a.status === 'present' || a.status === 'late' || a.status === 'early_leave').length;
  const daysLate = monthlyAttendance.filter(a => a.status === 'late').length;
  const daysEarlyLeave = monthlyAttendance.filter(a => a.status === 'early_leave').length;

  // Get list of months for selector
  const months = [
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' },
  ];

  const years = [2024, 2025, 2026];

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link
          href="/employees"
          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Employee Details</h1>
          <p className="text-gray-500 mt-1">View employee information and attendance history</p>
        </div>
      </div>

      {/* Employee Profile Card */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <div className="flex items-start gap-6">
          <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center">
            <span className="text-purple-700 font-semibold text-2xl">
              {employee.full_name.charAt(0)}
            </span>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-xl font-semibold text-gray-900">{employee.full_name}</h2>
              <EmployeeStatusBadge status={employee.status} />
            </div>
            <p className="text-gray-500 mb-4">{employee.employee_id}</p>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="flex items-center gap-2">
                <Briefcase size={16} className="text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">Position</p>
                  <p className="font-medium text-gray-900">{employee.position}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <User size={16} className="text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">Level</p>
                  <LevelBadge level={employee.level || 'junior'} />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <MapPin size={16} className="text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">Branch</p>
                  <p className="font-medium text-gray-900">
                    {employee.branches?.name || branchMap.get(employee.branch_id || '') || '-'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Calendar size={16} className="text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">Hire Date</p>
                  <p className="font-medium text-gray-900">{formatDate(employee.hire_date)}</p>
                </div>
              </div>
            </div>

            {/* Contact Info */}
            <div className="flex gap-6 mt-4 pt-4 border-t border-gray-100">
              {employee.phone && (
                <div className="flex items-center gap-2">
                  <Phone size={16} className="text-gray-400" />
                  <span className="text-gray-600">{employee.phone}</span>
                </div>
              )}
              {employee.email && (
                <div className="flex items-center gap-2">
                  <Mail size={16} className="text-gray-400" />
                  <span className="text-gray-600">{employee.email}</span>
                </div>
              )}
              {canViewSalary && (employee.salary ?? 0) > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-gray-500">Salary:</span>
                  <span className="font-medium text-gray-900">{formatSalary(employee.salary)}/month</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Monthly Work Hours Section */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Clock size={20} className="text-purple-600" />
            Monthly Work Hours
          </h3>

          {/* Month/Year Selector */}
          <form className="flex gap-2">
            <select
              name="month"
              defaultValue={selectedMonth}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
            >
              {months.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
            <select
              name="year"
              defaultValue={selectedYear}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
            >
              {years.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <button
              type="submit"
              className="px-4 py-1.5 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700 transition-colors"
            >
              View
            </button>
          </form>
        </div>

        {/* Monthly Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-purple-50 rounded-lg p-4">
            <p className="text-sm text-purple-600 mb-1">Total Hours</p>
            <p className="text-2xl font-semibold text-purple-700">{Math.round(totalWorkHours * 10) / 10}h</p>
          </div>
          <div className="bg-green-50 rounded-lg p-4">
            <p className="text-sm text-green-600 mb-1">Days Present</p>
            <p className="text-2xl font-semibold text-green-700">{daysPresent}</p>
          </div>
          <div className="bg-orange-50 rounded-lg p-4">
            <p className="text-sm text-orange-600 mb-1">Days Late</p>
            <p className="text-2xl font-semibold text-orange-700">{daysLate}</p>
          </div>
          <div className="bg-yellow-50 rounded-lg p-4">
            <p className="text-sm text-yellow-600 mb-1">Early Leaves</p>
            <p className="text-2xl font-semibold text-yellow-700">{daysEarlyLeave}</p>
          </div>
        </div>

        {/* Attendance History Table */}
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Check In</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Check Out</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Branch</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Hours</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {monthlyAttendance.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    No attendance records for {months.find(m => m.value === selectedMonth)?.label} {selectedYear}
                  </td>
                </tr>
              ) : (
                monthlyAttendance.map((record) => (
                  <tr key={record.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {new Date(record.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">{formatTime(record.check_in)}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{formatTime(record.check_out)}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {record.check_in_branch?.name || branchMap.get(record.check_in_branch_id) || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 text-right font-medium">
                      {record.total_hours ? `${Math.round(record.total_hours * 10) / 10}h` : '-'}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={record.status} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
