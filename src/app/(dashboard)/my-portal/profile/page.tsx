import { getSession } from '@/lib/auth-server';
import { redirect } from 'next/navigation';
import { getEmployeeByEmail, getEmployeeAttendanceSummary } from '@/lib/db';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Briefcase,
  Building2,
  Clock,
  ArrowLeft,
  Shield,
} from 'lucide-react';
import Link from 'next/link';

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('uz-UZ').format(amount) + ' UZS';
}

function getLevelBadgeColor(level: string): string {
  switch (level) {
    case 'junior':
      return 'bg-blue-100 text-blue-700';
    case 'middle':
      return 'bg-purple-100 text-purple-700';
    case 'senior':
      return 'bg-indigo-100 text-indigo-700';
    case 'executive':
      return 'bg-pink-100 text-pink-700';
    default:
      return 'bg-gray-100 text-gray-700';
  }
}

export default async function MyProfilePage() {
  const user = await getSession();

  if (!user) {
    redirect('/login');
  }

  const employee = await getEmployeeByEmail(user.email);

  if (!employee) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <User size={48} className="mx-auto text-gray-400 mb-4" />
          <h1 className="text-xl font-semibold text-gray-900 mb-2">
            Employee Profile Not Found
          </h1>
          <p className="text-gray-600">
            Your account is not linked to an employee profile. Please contact HR.
          </p>
        </div>
      </div>
    );
  }

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const monthlyStats = await getEmployeeAttendanceSummary(employee.id, currentYear, currentMonth);

  // Calculate tenure
  const hireDate = new Date(employee.hire_date);
  const today = new Date();
  const tenureMonths = Math.floor((today.getTime() - hireDate.getTime()) / (1000 * 60 * 60 * 24 * 30));
  const tenureYears = Math.floor(tenureMonths / 12);
  const remainingMonths = tenureMonths % 12;
  const tenureText = tenureYears > 0
    ? `${tenureYears} year${tenureYears > 1 ? 's' : ''} ${remainingMonths > 0 ? `${remainingMonths} month${remainingMonths > 1 ? 's' : ''}` : ''}`
    : `${remainingMonths} month${remainingMonths > 1 ? 's' : ''}`;

  return (
    <div className="max-w-4xl mx-auto space-y-4 lg:space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 lg:gap-4">
        <Link href="/my-portal" className="p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0">
          <ArrowLeft size={20} className="text-gray-600" />
        </Link>
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-gray-900">My Profile</h1>
          <p className="text-sm lg:text-base text-gray-600">View your employee information</p>
        </div>
      </div>

      {/* Profile Header Card */}
      <div className="bg-gradient-to-r from-purple-600 to-purple-700 rounded-xl p-4 lg:p-6 text-white">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 lg:gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 lg:w-24 lg:h-24 bg-white/20 rounded-full flex items-center justify-center text-2xl lg:text-4xl font-bold flex-shrink-0">
              {employee.full_name.charAt(0)}
            </div>
            <div className="sm:hidden min-w-0">
              <h2 className="text-lg font-bold truncate">{employee.full_name}</h2>
              <p className="text-purple-200 text-sm">{employee.position}</p>
              <p className="text-purple-200 text-xs mt-1">ID: {employee.employee_id}</p>
            </div>
          </div>
          <div className="flex-1 min-w-0 hidden sm:block">
            <h2 className="text-xl lg:text-2xl font-bold">{employee.full_name}</h2>
            <p className="text-purple-200 lg:text-lg">{employee.position}</p>
            <div className="flex flex-wrap items-center gap-2 lg:gap-4 mt-2 lg:mt-3">
              <span
                className={`px-2 lg:px-3 py-1 rounded-full text-xs lg:text-sm font-medium capitalize ${getLevelBadgeColor(
                  employee.level
                )}`}
              >
                {employee.level} Level
              </span>
              <span className="text-purple-200 flex items-center gap-1 text-sm">
                <MapPin size={14} className="lg:hidden" />
                <MapPin size={16} className="hidden lg:block" />
                {employee.branches?.name || 'No Branch'}
              </span>
            </div>
          </div>
          <div className="flex sm:hidden flex-wrap items-center gap-2 text-xs text-purple-200">
            <span className={`px-2 py-0.5 rounded-full font-medium capitalize ${getLevelBadgeColor(employee.level)}`}>
              {employee.level}
            </span>
            <span className="flex items-center gap-1">
              <MapPin size={12} />
              {employee.branches?.name || 'No Branch'}
            </span>
          </div>
          <div className="hidden sm:block text-right flex-shrink-0">
            <p className="text-purple-200 text-xs lg:text-sm">Employee ID</p>
            <p className="font-mono text-lg lg:text-xl font-bold">{employee.employee_id}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
        {/* Contact Information */}
        <div className="lg:col-span-2 space-y-4 lg:space-y-6">
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="p-3 lg:p-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900 text-sm lg:text-base">Contact Information</h3>
            </div>
            <div className="p-3 lg:p-4 space-y-3 lg:space-y-4">
              <div className="flex items-center gap-3 lg:gap-4">
                <div className="w-8 h-8 lg:w-10 lg:h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Mail size={16} className="lg:hidden text-blue-600" />
                  <Mail size={20} className="hidden lg:block text-blue-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs lg:text-sm text-gray-500">Email Address</p>
                  <p className="font-medium text-gray-900 text-sm lg:text-base truncate">{employee.email || 'Not set'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 lg:gap-4">
                <div className="w-8 h-8 lg:w-10 lg:h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Phone size={16} className="lg:hidden text-green-600" />
                  <Phone size={20} className="hidden lg:block text-green-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs lg:text-sm text-gray-500">Phone Number</p>
                  <p className="font-medium text-gray-900 text-sm lg:text-base">{employee.phone || 'Not set'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 lg:gap-4">
                <div className="w-8 h-8 lg:w-10 lg:h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Shield size={16} className="lg:hidden text-purple-600" />
                  <Shield size={20} className="hidden lg:block text-purple-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs lg:text-sm text-gray-500">Telegram ID</p>
                  <p className="font-medium text-gray-900 text-sm lg:text-base">{employee.telegram_id || 'Not linked'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Employment Details */}
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="p-3 lg:p-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900 text-sm lg:text-base">Employment Details</h3>
            </div>
            <div className="p-3 lg:p-4 grid grid-cols-2 gap-3 lg:gap-4">
              <div className="flex items-center gap-2 lg:gap-4">
                <div className="w-8 h-8 lg:w-10 lg:h-10 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Briefcase size={16} className="lg:hidden text-orange-600" />
                  <Briefcase size={20} className="hidden lg:block text-orange-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs lg:text-sm text-gray-500">Position</p>
                  <p className="font-medium text-gray-900 text-sm lg:text-base truncate">{employee.position}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 lg:gap-4">
                <div className="w-8 h-8 lg:w-10 lg:h-10 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Building2 size={16} className="lg:hidden text-indigo-600" />
                  <Building2 size={20} className="hidden lg:block text-indigo-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs lg:text-sm text-gray-500">Branch</p>
                  <p className="font-medium text-gray-900 text-sm lg:text-base truncate">{employee.branches?.name || 'No Branch'}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 lg:gap-4">
                <div className="w-8 h-8 lg:w-10 lg:h-10 bg-teal-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Calendar size={16} className="lg:hidden text-teal-600" />
                  <Calendar size={20} className="hidden lg:block text-teal-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs lg:text-sm text-gray-500">Hire Date</p>
                  <p className="font-medium text-gray-900 text-sm lg:text-base">{formatDate(employee.hire_date)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 lg:gap-4">
                <div className="w-8 h-8 lg:w-10 lg:h-10 bg-pink-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Clock size={16} className="lg:hidden text-pink-600" />
                  <Clock size={20} className="hidden lg:block text-pink-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs lg:text-sm text-gray-500">Tenure</p>
                  <p className="font-medium text-gray-900 text-sm lg:text-base">{tenureText}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Work Schedule */}
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="p-3 lg:p-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900 text-sm lg:text-base">Work Schedule</h3>
            </div>
            <div className="p-3 lg:p-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900 text-sm lg:text-base">Default Shift</p>
                  <p className="text-xs lg:text-sm text-gray-500 capitalize">
                    {employee.default_shift === 'day' ? 'Day Shift (9:00 - 18:00)' : 'Night Shift'}
                  </p>
                </div>
                <span
                  className={`px-2 lg:px-3 py-1 rounded-full text-xs lg:text-sm font-medium self-start sm:self-auto ${
                    employee.can_rotate
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {employee.can_rotate ? 'Can Rotate' : 'Fixed Schedule'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar Stats */}
        <div className="space-y-4 lg:space-y-6">
          {/* This Month Stats */}
          <div className="bg-white rounded-xl border border-gray-200 p-3 lg:p-4">
            <h3 className="font-semibold text-gray-900 mb-3 lg:mb-4 text-sm lg:text-base">This Month</h3>
            <div className="space-y-2 lg:space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600 text-sm">Present Days</span>
                <span className="font-semibold text-green-600">{monthlyStats.presentDays}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600 text-sm">Late Arrivals</span>
                <span className="font-semibold text-yellow-600">{monthlyStats.lateDays}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600 text-sm">Absent Days</span>
                <span className="font-semibold text-red-600">{monthlyStats.absentDays}</span>
              </div>
              <hr className="border-gray-100" />
              <div className="flex justify-between items-center">
                <span className="text-gray-600 text-sm">Total Hours</span>
                <span className="font-semibold text-blue-600">{monthlyStats.totalHours}h</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600 text-sm">Avg per Day</span>
                <span className="font-semibold text-purple-600">{monthlyStats.avgHoursPerDay}h</span>
              </div>
            </div>
          </div>

          {/* Status */}
          <div className="bg-white rounded-xl border border-gray-200 p-3 lg:p-4">
            <h3 className="font-semibold text-gray-900 mb-3 lg:mb-4 text-sm lg:text-base">Account Status</h3>
            <div className="space-y-2 lg:space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-600 text-sm">Employment</span>
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${
                    employee.status === 'active'
                      ? 'bg-green-100 text-green-700'
                      : employee.status === 'probation'
                      ? 'bg-yellow-100 text-yellow-700'
                      : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {employee.status}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600 text-sm">Telegram</span>
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium ${
                    employee.telegram_id
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {employee.telegram_id ? 'Linked' : 'Not Linked'}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div className="bg-white rounded-xl border border-gray-200 p-3 lg:p-4">
            <h3 className="font-semibold text-gray-900 mb-3 lg:mb-4 text-sm lg:text-base">Quick Links</h3>
            <div className="space-y-2">
              <Link
                href="/my-portal/attendance"
                className="block p-2 lg:p-3 bg-gray-50 hover:bg-gray-100 rounded-lg text-xs lg:text-sm font-medium text-gray-700 transition-colors"
              >
                View Attendance History →
              </Link>
              <Link
                href="/my-portal/leaves"
                className="block p-2 lg:p-3 bg-gray-50 hover:bg-gray-100 rounded-lg text-xs lg:text-sm font-medium text-gray-700 transition-colors"
              >
                Request Leave →
              </Link>
              <Link
                href="/my-portal/payslips"
                className="block p-2 lg:p-3 bg-gray-50 hover:bg-gray-100 rounded-lg text-xs lg:text-sm font-medium text-gray-700 transition-colors"
              >
                View Payslips →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
