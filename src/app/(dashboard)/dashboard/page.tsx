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
} from 'lucide-react';

// Demo data for the dashboard
const demoStats = {
  totalEmployees: 47,
  activeEmployees: 45,
  presentToday: 38,
  lateToday: 3,
  absentToday: 4,
  pendingPayroll: 12,
  totalBranches: 7,
  totalWageBudget: 125000000, // UZS
};

const demoBranches = [
  { id: '1', name: 'C-Space Airport', present: 8, total: 10 },
  { id: '2', name: 'C-Space Beruniy', present: 6, total: 7 },
  { id: '3', name: 'C-Space Chust', present: 5, total: 6 },
  { id: '4', name: 'C-Space Labzak', present: 4, total: 5 },
  { id: '5', name: 'C-Space Muqumiy', present: 7, total: 8 },
  { id: '6', name: 'C-Space Yunusabad', present: 5, total: 6 },
  { id: '7', name: 'C-Space Elbek', present: 3, total: 5 },
];

const recentActivity = [
  { id: '1', type: 'check_in', employee: 'Aziz Karimov', branch: 'C-Space Airport', time: '09:02' },
  { id: '2', type: 'check_in', employee: 'Dilnoza Rustamova', branch: 'C-Space Beruniy', time: '09:05' },
  { id: '3', type: 'late', employee: 'Bobur Aliyev', branch: 'C-Space Labzak', time: '09:18' },
  { id: '4', type: 'check_in', employee: 'Madina Tosheva', branch: 'C-Space Muqumiy', time: '09:00' },
  { id: '5', type: 'check_out', employee: 'Jasur Normatov', branch: 'C-Space Chust', time: '18:05' },
];

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
  branches: typeof demoBranches;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Branch Presence</h3>
      <div className="space-y-3">
        {branches.map((branch) => {
          const percentage = Math.round((branch.present / branch.total) * 100);
          return (
            <div key={branch.id}>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-gray-700">{branch.name}</span>
                <span className="text-gray-500">
                  {branch.present}/{branch.total}
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
  activities: typeof recentActivity;
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

export default async function DashboardPage() {
  const user = await getSession();

  if (!user) {
    redirect('/login');
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('uz-UZ').format(amount) + ' UZS';
  };

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
          value={demoStats.totalEmployees}
          icon={Users}
          trend="+2 this month"
          color="purple"
        />
        <StatCard
          title="Present Today"
          value={demoStats.presentToday}
          icon={UserCheck}
          color="green"
        />
        <StatCard
          title="Late Today"
          value={demoStats.lateToday}
          icon={AlertCircle}
          color="orange"
        />
        {(user.role === 'general_manager' || user.role === 'ceo' || user.role === 'hr') && (
          <StatCard
            title="Pending Payroll"
            value={demoStats.pendingPayroll}
            icon={Wallet}
            color="blue"
          />
        )}
      </div>

      {/* Additional Stats for GM/CEO */}
      {(user.role === 'general_manager' || user.role === 'ceo') && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <StatCard
            title="Active Branches"
            value={demoStats.totalBranches}
            icon={MapPin}
            color="purple"
          />
          <StatCard
            title="Monthly Wage Budget"
            value={formatCurrency(demoStats.totalWageBudget)}
            icon={TrendingUp}
            color="green"
          />
          <StatCard
            title="Absent Today"
            value={demoStats.absentToday}
            icon={AlertCircle}
            color="red"
          />
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <BranchPresenceCard branches={demoBranches} />
        <RecentActivityCard activities={recentActivity} />
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
