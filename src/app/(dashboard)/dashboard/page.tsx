import { getSession } from '@/lib/auth-server';
import { getRoleLabel } from '@/lib/auth';
import { redirect } from 'next/navigation';
import {
  Users,
  Clock,
  MapPin,
  AlertCircle,
  CheckCircle,
  UserCheck,
  Briefcase,
  TrendingUp,
  Building2,
  Calendar,
  ArrowRight,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import {
  getTodayAttendance,
  getBranches,
  getEmployees,
  getAttendanceStats,
  getEmployeeByEmail,
  getAttendanceByEmployee,
  getLeaveRequestsByEmployee,
  getEmployeeAttendanceSummary,
} from '@/lib/db';
import Link from 'next/link';

// Interfaces
interface Employee {
  id: string;
  employee_id: string;
  full_name: string;
  position: string;
  level: string;
  branch_id: string | null;
  salary: number | null;
  status: string;
  employment_type?: string;
  branches?: { name: string };
}

interface Branch {
  id: string;
  name: string;
}

interface RecentActivityItem {
  id: string;
  type: 'check_in' | 'check_out' | 'late';
  employee: string;
  branch: string;
  time: string;
}

interface BranchStats {
  id: string;
  name: string;
  employeeCount: number;
}

// Function to fetch recent activity from database
async function getRecentActivity(branchId?: string): Promise<RecentActivityItem[]> {
  const attendance = await getTodayAttendance();

  const activities: RecentActivityItem[] = [];

  attendance.forEach((record: any) => {
    // Filter by branch if branchId is provided
    if (branchId && record.employees?.branch_id !== branchId) {
      return;
    }

    const employeeName = record.employees?.full_name || 'Unknown';

    if (record.check_in) {
      const checkInBranch = record.check_in_branch?.name || '-';
      activities.push({
        id: `${record.id}-in`,
        type: record.status === 'late' ? 'late' : 'check_in',
        employee: employeeName,
        branch: checkInBranch,
        time: record.check_in,
      });
    }

    if (record.check_out) {
      const checkOutBranch = record.check_out_branch?.name || record.check_in_branch?.name || '-';
      activities.push({
        id: `${record.id}-out`,
        type: 'check_out',
        employee: employeeName,
        branch: checkOutBranch,
        time: record.check_out,
      });
    }
  });

  return activities
    .sort((a, b) => b.time.localeCompare(a.time))
    .slice(0, 6);
}

// Calculate dashboard stats from real database data
async function getDashboardStats(branchId?: string) {
  const [employees, branches] = await Promise.all([
    getEmployees(),
    getBranches(),
  ]);

  let activeEmployees = employees.filter((e: Employee) => e.status === 'active' || e.status === 'probation');

  // Filter by branch if branchId is provided (for branch managers)
  if (branchId) {
    activeEmployees = activeEmployees.filter((e: Employee) => e.branch_id === branchId);
  }

  // Employment type counts
  const fullTimeCount = activeEmployees.filter((e: Employee) => e.employment_type === 'full-time' || !e.employment_type).length;
  const partTimeCount = activeEmployees.filter((e: Employee) => e.employment_type === 'part-time').length;
  const internshipCount = activeEmployees.filter((e: Employee) => e.employment_type === 'internship').length;
  const probationTypeCount = activeEmployees.filter((e: Employee) => e.employment_type === 'probation').length;

  // Level counts
  const juniorCount = activeEmployees.filter((e: Employee) => e.level === 'junior').length;
  const middleCount = activeEmployees.filter((e: Employee) => e.level === 'middle').length;
  const seniorCount = activeEmployees.filter((e: Employee) => e.level === 'senior').length;
  const executiveCount = activeEmployees.filter((e: Employee) => e.level === 'executive').length;

  // Status counts
  const probationStatusCount = activeEmployees.filter((e: Employee) => e.status === 'probation').length;

  // Total salary budget
  const totalSalaryBudget = activeEmployees.reduce((sum: number, e: Employee) => sum + (e.salary || 0), 0);

  // Branch stats
  const branchStats: BranchStats[] = branches.map((branch: Branch) => ({
    id: branch.id,
    name: branch.name,
    employeeCount: activeEmployees.filter((e: Employee) => e.branch_id === branch.id).length,
  })).filter((b: BranchStats) => b.employeeCount > 0);

  return {
    totalEmployees: activeEmployees.length,
    fullTimeCount,
    partTimeCount,
    internshipCount,
    probationTypeCount,
    juniorCount,
    middleCount,
    seniorCount,
    executiveCount,
    probationStatusCount,
    totalSalaryBudget,
    totalBranches: branches.length,
    branchStats,
  };
}

function StatCard({
  title,
  value,
  icon: Icon,
  trend,
  color = 'purple',
  href,
}: {
  title: string;
  value: string | number;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  trend?: string;
  color?: 'purple' | 'green' | 'red' | 'blue' | 'orange';
  href?: string;
}) {
  const colorClasses = {
    purple: 'bg-purple-50 text-purple-600',
    green: 'bg-green-50 text-green-600',
    red: 'bg-red-50 text-red-600',
    blue: 'bg-blue-50 text-blue-600',
    orange: 'bg-orange-50 text-orange-600',
  };

  const content = (
    <div className="flex items-start justify-between">
      <div className="min-w-0 flex-1">
        <p className="text-xs lg:text-sm text-gray-500 truncate">{title}</p>
        <p className="text-lg lg:text-2xl font-semibold text-gray-900 mt-0.5 lg:mt-1">{value}</p>
        {trend && <p className="text-xs text-green-600 mt-0.5 lg:mt-1 hidden sm:block">{trend}</p>}
      </div>
      <div className={`p-1.5 lg:p-2.5 rounded-lg ${colorClasses[color]} flex-shrink-0 ml-2`}>
        <Icon size={16} className="lg:hidden" />
        <Icon size={20} className="hidden lg:block" />
      </div>
    </div>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="bg-white rounded-xl border border-gray-200 p-3 lg:p-5 hover:border-purple-300 hover:shadow-md transition-all block"
      >
        {content}
      </Link>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-3 lg:p-5">
      {content}
    </div>
  );
}

function BranchPresenceCard({
  branches,
  totalEmployees,
}: {
  branches: BranchStats[];
  totalEmployees: number;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center gap-2 mb-4">
        <Building2 size={20} className="text-purple-600" />
        <h3 className="text-lg font-semibold text-gray-900">Branch Staffing</h3>
      </div>
      <div className="space-y-3">
        {branches.map((branch) => {
          const percentage = totalEmployees > 0 ? Math.round((branch.employeeCount / totalEmployees) * 100) : 0;
          return (
            <div key={branch.id}>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-gray-700">{branch.name}</span>
                <span className="text-gray-500">
                  {branch.employeeCount} employees ({percentage}%)
                </span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-purple-500 rounded-full transition-all"
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          );
        })}
        {branches.length === 0 && (
          <p className="text-sm text-gray-500 text-center py-4">No branch data available</p>
        )}
      </div>
    </div>
  );
}

function RecentActivityCard({
  activities,
}: {
  activities: RecentActivityItem[];
}) {
  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'check_in':
        return <CheckCircle size={16} className="text-green-500" />;
      case 'check_out':
        return <Clock size={16} className="text-blue-500" />;
      case 'late':
        return <AlertCircle size={16} className="text-orange-500" />;
      default:
        return <Clock size={16} className="text-gray-500" />;
    }
  };

  const getActivityLabel = (type: string) => {
    switch (type) {
      case 'check_in':
        return 'checked in at';
      case 'check_out':
        return 'checked out from';
      case 'late':
        return 'arrived late at';
      default:
        return '';
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
      <div className="space-y-3">
        {activities.length > 0 ? (
          activities.map((activity) => (
            <div key={activity.id} className="flex items-start gap-3">
              <div className="mt-0.5">{getActivityIcon(activity.type)}</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-900">
                  <span className="font-medium">{activity.employee}</span>{' '}
                  <span className="text-gray-500">{getActivityLabel(activity.type)}</span>{' '}
                  <span className="text-gray-700">{activity.branch}</span>
                </p>
                <p className="text-xs text-gray-400 mt-0.5">{activity.time}</p>
              </div>
            </div>
          ))
        ) : (
          <p className="text-sm text-gray-500 text-center py-4">No activity today</p>
        )}
      </div>
    </div>
  );
}

function LevelDistributionCard({
  juniorCount,
  middleCount,
  seniorCount,
  executiveCount,
}: {
  juniorCount: number;
  middleCount: number;
  seniorCount: number;
  executiveCount: number;
}) {
  const levels = [
    { label: 'Junior', count: juniorCount, color: 'bg-blue-500' },
    { label: 'Middle', count: middleCount, color: 'bg-purple-500' },
    { label: 'Senior', count: seniorCount, color: 'bg-indigo-500' },
    { label: 'Executive', count: executiveCount, color: 'bg-pink-500' },
  ];

  const total = levels.reduce((sum, l) => sum + l.count, 0);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Employee Levels</h3>
      <div className="space-y-3">
        {levels.map((level) => {
          const percentage = total > 0 ? Math.round((level.count / total) * 100) : 0;
          return (
            <div key={level.label}>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-gray-700">{level.label}</span>
                <span className="text-gray-500">{level.count} ({percentage}%)</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full ${level.color} rounded-full transition-all`}
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Employee Personal Dashboard Component
async function EmployeeDashboard({ userEmail }: { userEmail: string }) {
  const employee = await getEmployeeByEmail(userEmail);

  if (!employee) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
        <p className="text-gray-500">Your employee profile is not linked. Please contact HR.</p>
      </div>
    );
  }

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const [recentAttendance, leaveRequests, monthlySummary] = await Promise.all([
    getAttendanceByEmployee(employee.id, 7),
    getLeaveRequestsByEmployee(employee.id),
    getEmployeeAttendanceSummary(employee.id, currentYear, currentMonth),
  ]);

  const pendingLeaves = leaveRequests.filter((l: any) => l.status === 'pending').length;
  const approvedLeaves = leaveRequests.filter((l: any) => l.status === 'approved').length;

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

  return (
    <div className="space-y-6">
      {/* Welcome Card */}
      <div className="bg-gradient-to-r from-purple-600 to-purple-700 rounded-xl p-6 text-white">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center text-2xl font-bold">
            {employee.full_name.charAt(0)}
          </div>
          <div>
            <h2 className="text-xl font-semibold">{employee.full_name}</h2>
            <p className="text-purple-200">{employee.position}</p>
            <p className="text-purple-200 text-sm">{employee.branches?.name || 'No Branch'}</p>
          </div>
        </div>
      </div>

      {/* Monthly Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
            recentAttendance.slice(0, 5).map((record: any) => (
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

      {/* Quick Links */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Link
          href="/my-portal"
          className="bg-white rounded-xl border border-gray-200 p-4 hover:border-purple-300 hover:bg-purple-50 transition-colors text-center"
        >
          <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-2">
            <Users size={20} className="text-purple-600" />
          </div>
          <p className="font-medium text-gray-900">My Portal</p>
        </Link>

        <Link
          href="/my-portal/attendance"
          className="bg-white rounded-xl border border-gray-200 p-4 hover:border-purple-300 hover:bg-purple-50 transition-colors text-center"
        >
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-2">
            <Clock size={20} className="text-blue-600" />
          </div>
          <p className="font-medium text-gray-900">Attendance</p>
        </Link>

        <Link
          href="/my-portal/leaves"
          className="bg-white rounded-xl border border-gray-200 p-4 hover:border-purple-300 hover:bg-purple-50 transition-colors text-center"
        >
          <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-2">
            <Calendar size={20} className="text-green-600" />
          </div>
          <p className="font-medium text-gray-900">Leave Requests</p>
        </Link>

        <Link
          href="/my-portal/payments"
          className="bg-white rounded-xl border border-gray-200 p-4 hover:border-purple-300 hover:bg-purple-50 transition-colors text-center"
        >
          <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center mx-auto mb-2">
            <TrendingUp size={20} className="text-orange-600" />
          </div>
          <p className="font-medium text-gray-900">Payments</p>
        </Link>
      </div>
    </div>
  );
}

export default async function DashboardPage() {
  const user = await getSession();

  if (!user) {
    redirect('/login');
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('uz-UZ').format(amount) + ' UZS';
  };

  // For regular employees, show personal dashboard
  if (user.role === 'employee') {
    return (
      <div>
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 mt-1">Welcome back, {user.name}!</p>
        </div>
        <EmployeeDashboard userEmail={user.email} />
      </div>
    );
  }

  // For branch managers, filter data to their branch
  const branchId = user.role === 'branch_manager' ? user.branchId : undefined;

  // Fetch all data from Supabase
  const [stats, attendanceStats, recentActivity] = await Promise.all([
    getDashboardStats(branchId),
    getAttendanceStats(),
    getRecentActivity(branchId),
  ]);

  const presentToday = attendanceStats.present;
  const lateToday = attendanceStats.late;
  const absentToday = attendanceStats.absent;

  return (
    <div>
      {/* Header */}
      <div className="mb-4 lg:mb-6">
        <h1 className="text-xl lg:text-2xl font-semibold text-gray-900">Dashboard</h1>
        <p className="text-sm lg:text-base text-gray-500 mt-1">
          Welcome back, {user.name}!
          <span className="hidden sm:inline"> Here&apos;s your overview as {getRoleLabel(user.role)}.</span>
          {user.role === 'branch_manager' && user.branchId && (
            <span className="text-purple-600"> (Branch View)</span>
          )}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-4 lg:mb-6">
        <StatCard
          title={user.role === 'branch_manager' ? 'Branch Employees' : 'Total Employees'}
          value={stats.totalEmployees}
          icon={Users}
          trend={`${stats.fullTimeCount} full-time, ${stats.partTimeCount} part-time`}
          color="purple"
          href="/employees"
        />
        <StatCard
          title="Present Today"
          value={presentToday}
          icon={UserCheck}
          color="green"
          href="/attendance"
        />
        <StatCard
          title="Late Today"
          value={lateToday}
          icon={AlertCircle}
          color="orange"
          href="/attendance"
        />
        {(user.role === 'general_manager' || user.role === 'ceo' || user.role === 'hr') && (
          <StatCard
            title="On Probation"
            value={stats.probationStatusCount}
            icon={Briefcase}
            color="blue"
            href="/employees?status=probation"
          />
        )}
        {user.role === 'branch_manager' && (
          <StatCard
            title="Absent Today"
            value={absentToday}
            icon={XCircle}
            color="red"
            href="/attendance"
          />
        )}
      </div>

      {/* Additional Stats for GM/CEO */}
      {(user.role === 'general_manager' || user.role === 'ceo') && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 lg:gap-4 mb-4 lg:mb-6">
          <StatCard
            title="Active Branches"
            value={stats.totalBranches}
            icon={MapPin}
            color="purple"
            href="/branches"
          />
          <StatCard
            title="Monthly Wage Budget"
            value={formatCurrency(stats.totalSalaryBudget)}
            icon={TrendingUp}
            color="green"
            href="/reports"
          />
          <StatCard
            title="Absent Today"
            value={absentToday}
            icon={AlertCircle}
            color="red"
            href="/attendance"
          />
        </div>
      )}

      {/* Main Content Grid */}
      {user.role !== 'branch_manager' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <BranchPresenceCard
            branches={stats.branchStats}
            totalEmployees={stats.totalEmployees}
          />
          <LevelDistributionCard
            juniorCount={stats.juniorCount}
            middleCount={stats.middleCount}
            seniorCount={stats.seniorCount}
            executiveCount={stats.executiveCount}
          />
        </div>
      )}

      {/* Branch Manager: Level Distribution and Recent Activity */}
      {user.role === 'branch_manager' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <LevelDistributionCard
            juniorCount={stats.juniorCount}
            middleCount={stats.middleCount}
            seniorCount={stats.seniorCount}
            executiveCount={stats.executiveCount}
          />
          <RecentActivityCard activities={recentActivity} />
        </div>
      )}

      {/* Recent Activity for non-branch managers */}
      {user.role !== 'branch_manager' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <RecentActivityCard activities={recentActivity} />
        </div>
      )}
    </div>
  );
}
