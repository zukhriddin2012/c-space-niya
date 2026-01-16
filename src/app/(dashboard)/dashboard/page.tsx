import { getSession } from '@/lib/auth-server';
import { getRoleLabel } from '@/lib/auth';
import { redirect } from 'next/navigation';
import {
  Users,
  Clock,
  MapPin,
  Wallet,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  UserCheck,
  Briefcase,
} from 'lucide-react';
import {
  EMPLOYEES,
  BRANCHES,
  getActiveEmployeesCount,
  getTotalSalaryBudget,
  getEmployeesByBranch,
} from '@/lib/employee-data';
import { getTodayAttendance, getBranches, getEmployees, getAttendanceStats } from '@/lib/db';

// Calculate real stats from employee data
const realStats = {
  totalEmployees: getActiveEmployeesCount(),
  fullTimeEmployees: EMPLOYEES.filter(e => e.employmentType === 'full_time' && e.status !== 'terminated').length,
  partTimeEmployees: EMPLOYEES.filter(e => e.employmentType === 'part_time' && e.status !== 'terminated').length,
  totalBranches: BRANCHES.length,
  totalWageBudget: getTotalSalaryBudget(),
  juniorCount: EMPLOYEES.filter(e => e.level === 'junior' && e.status !== 'terminated').length,
  middleCount: EMPLOYEES.filter(e => e.level === 'middle' && e.status !== 'terminated').length,
  seniorCount: EMPLOYEES.filter(e => e.level === 'senior' && e.status !== 'terminated').length,
  executiveCount: EMPLOYEES.filter(e => e.level === 'executive' && e.status !== 'terminated').length,
  probationCount: EMPLOYEES.filter(e => e.status === 'probation').length,
};

// Real branch data with employee counts
const branchPresenceData = BRANCHES.map(branch => {
  const employees = getEmployeesByBranch(branch.id);
  // Simulate ~80% present today
  const presentCount = Math.floor(employees.length * 0.8);
  return {
    id: branch.id,
    name: branch.name,
    present: presentCount,
    total: employees.length,
  };
}).filter(b => b.total > 0);

// Recent activity interface
interface RecentActivityItem {
  id: string;
  type: 'check_in' | 'check_out' | 'late';
  employee: string;
  branch: string;
  time: string;
}

// Function to fetch recent activity from database
async function getRecentActivity(): Promise<RecentActivityItem[]> {
  const attendance = await getTodayAttendance();

  // Convert attendance records to activity items
  const activities: RecentActivityItem[] = [];

  attendance.forEach((record: any) => {
    const employeeName = record.employees?.full_name || 'Unknown';

    // Add check-in activity
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

    // Add check-out activity
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

  // Sort by time descending and take first 6
  return activities
    .sort((a, b) => b.time.localeCompare(a.time))
    .slice(0, 6);
}

function StatCard({
  title,
  value,
  icon: Icon,
  trend,
  color = 'purple',
}: {
  title: string;
  value: string | number;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  trend?: string;
  color?: 'purple' | 'green' | 'red' | 'blue' | 'orange';
}) {
  const colorClasses = {
    purple: 'bg-purple-50 text-purple-600',
    green: 'bg-green-50 text-green-600',
    red: 'bg-red-50 text-red-600',
    blue: 'bg-blue-50 text-blue-600',
    orange: 'bg-orange-50 text-orange-600',
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <p className="text-2xl font-semibold text-gray-900 mt-1">{value}</p>
          {trend && <p className="text-xs text-green-600 mt-1">{trend}</p>}
        </div>
        <div className={`p-2.5 rounded-lg ${colorClasses[color]}`}>
          <Icon size={20} />
        </div>
      </div>
    </div>
  );
}

function BranchPresenceCard({
  branches,
}: {
  branches: typeof branchPresenceData;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Branch Staffing</h3>
      <div className="space-y-3">
        {branches.map((branch) => {
          const percentage = branch.total > 0 ? Math.round((branch.present / branch.total) * 100) : 0;
          return (
            <div key={branch.id}>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-gray-700">{branch.name}</span>
                <span className="text-gray-500">
                  {branch.total} employees
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
        {activities.map((activity) => (
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
        ))}
      </div>
    </div>
  );
}

function LevelDistributionCard() {
  const levels = [
    { label: 'Junior', count: realStats.juniorCount, color: 'bg-blue-500' },
    { label: 'Middle', count: realStats.middleCount, color: 'bg-purple-500' },
    { label: 'Senior', count: realStats.seniorCount, color: 'bg-indigo-500' },
    { label: 'Executive', count: realStats.executiveCount, color: 'bg-pink-500' },
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

export default async function DashboardPage() {
  const user = await getSession();

  if (!user) {
    redirect('/login');
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('uz-UZ').format(amount) + ' UZS';
  };

  // Fetch real attendance data from Supabase
  const [attendanceStats, recentActivity] = await Promise.all([
    getAttendanceStats(),
    getRecentActivity(),
  ]);

  // Use real stats from database
  const presentToday = attendanceStats.present;
  const lateToday = attendanceStats.late;
  const absentToday = attendanceStats.absent;

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">
          Welcome back, {user.name}! Here&apos;s your overview as {getRoleLabel(user.role)}.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="Total Employees"
          value={realStats.totalEmployees}
          icon={Users}
          trend={`${realStats.fullTimeEmployees} full-time, ${realStats.partTimeEmployees} part-time`}
          color="purple"
        />
        <StatCard
          title="Present Today"
          value={presentToday}
          icon={UserCheck}
          color="green"
        />
        <StatCard
          title="Late Today"
          value={lateToday}
          icon={AlertCircle}
          color="orange"
        />
        {(user.role === 'general_manager' || user.role === 'ceo' || user.role === 'hr') && (
          <StatCard
            title="On Probation"
            value={realStats.probationCount}
            icon={Briefcase}
            color="blue"
          />
        )}
      </div>

      {/* Additional Stats for GM/CEO */}
      {(user.role === 'general_manager' || user.role === 'ceo') && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <StatCard
            title="Active Branches"
            value={realStats.totalBranches}
            icon={MapPin}
            color="purple"
          />
          <StatCard
            title="Monthly Wage Budget"
            value={formatCurrency(realStats.totalWageBudget)}
            icon={TrendingUp}
            color="green"
          />
          <StatCard
            title="Absent Today"
            value={absentToday}
            icon={AlertCircle}
            color="red"
          />
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <BranchPresenceCard branches={branchPresenceData} />
        <LevelDistributionCard />
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RecentActivityCard activities={recentActivity} />

        {/* Top Salaries Card for GM/CEO */}
        {(user.role === 'general_manager' || user.role === 'ceo') && (
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Positions by Salary</h3>
            <div className="space-y-3">
              {EMPLOYEES
                .filter(e => e.status !== 'terminated')
                .sort((a, b) => b.baseSalary - a.baseSalary)
                .slice(0, 5)
                .map((emp, index) => (
                  <div key={emp.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center text-sm font-medium text-purple-700">
                        {index + 1}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{emp.fullName}</p>
                        <p className="text-xs text-gray-500">{emp.position}</p>
                      </div>
                    </div>
                    <p className="text-sm font-medium text-gray-900">
                      {formatCurrency(emp.baseSalary)}
                    </p>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>

      {/* Employee Self-Service View */}
      {user.role === 'employee' && (
        <div className="mt-6">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-4">
              <button className="flex items-center justify-center gap-2 p-4 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition-colors">
                <Clock size={20} />
                <span className="font-medium">Check In</span>
              </button>
              <button className="flex items-center justify-center gap-2 p-4 bg-gray-50 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors">
                <Clock size={20} />
                <span className="font-medium">Check Out</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
