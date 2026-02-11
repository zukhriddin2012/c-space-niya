'use client';

import { useTranslation } from '@/contexts/LanguageContext';
import { getRoleLabel } from '@/lib/auth';
import type { UserRole } from '@/types';
import Link from 'next/link';
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
  MessageSquare,
  Inbox,
  FileText,
  ClipboardCheck,
  UserPlus,
  Calculator,
  Wallet,
  BarChart3,
} from 'lucide-react';

// ============= TYPES =============
interface BranchStats {
  id: string;
  name: string;
  employeeCount: number;
}

interface RecentActivityItem {
  id: string;
  type: 'check_in' | 'check_out' | 'late';
  employee: string;
  branch: string;
  time: string;
}

// ============= STAT CARD =============
export function StatCard({
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
  color?: 'purple' | 'green' | 'red' | 'blue' | 'orange' | 'amber';
  href?: string;
}) {
  const colorClasses = {
    purple: 'bg-purple-50 text-purple-600',
    green: 'bg-green-50 text-green-600',
    red: 'bg-red-50 text-red-600',
    blue: 'bg-blue-50 text-blue-600',
    orange: 'bg-orange-50 text-orange-600',
    amber: 'bg-amber-50 text-amber-600',
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

// ============= BRANCH PRESENCE CARD =============
export function BranchPresenceCard({
  branches,
  totalEmployees,
}: {
  branches: BranchStats[];
  totalEmployees: number;
}) {
  const { t } = useTranslation();

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center gap-2 mb-4">
        <Building2 size={20} className="text-purple-600" />
        <h3 className="text-lg font-semibold text-gray-900">{t.dashboard.branchStaffing}</h3>
      </div>
      <div className="space-y-3">
        {branches.map((branch) => {
          const percentage = totalEmployees > 0 ? Math.round((branch.employeeCount / totalEmployees) * 100) : 0;
          return (
            <div key={branch.id}>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-gray-700">{branch.name}</span>
                <span className="text-gray-500">
                  {branch.employeeCount} {t.dashboard.employees} ({percentage}%)
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
          <p className="text-sm text-gray-500 text-center py-4">{t.dashboard.noBranchData}</p>
        )}
      </div>
    </div>
  );
}

// ============= RECENT ACTIVITY CARD =============
export function RecentActivityCard({
  activities,
}: {
  activities: RecentActivityItem[];
}) {
  const { t } = useTranslation();

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
        return t.dashboard.checkedInAt;
      case 'check_out':
        return t.dashboard.checkedOutFrom;
      case 'late':
        return t.dashboard.arrivedLateAt;
      default:
        return '';
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{t.dashboard.recentActivity}</h3>
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
          <p className="text-sm text-gray-500 text-center py-4">{t.dashboard.noActivityToday}</p>
        )}
      </div>
    </div>
  );
}

// ============= LEVEL DISTRIBUTION CARD =============
export function LevelDistributionCard({
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
  const { t } = useTranslation();

  const levels = [
    { label: t.dashboard.junior, count: juniorCount, color: 'bg-blue-500' },
    { label: t.dashboard.middle, count: middleCount, color: 'bg-purple-500' },
    { label: t.dashboard.senior, count: seniorCount, color: 'bg-indigo-500' },
    { label: t.dashboard.executive, count: executiveCount, color: 'bg-pink-500' },
  ];

  const total = levels.reduce((sum, l) => sum + l.count, 0);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{t.dashboard.employeeLevels}</h3>
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

// ============= DASHBOARD HEADER =============
export function DashboardHeader({
  userName,
  role,
  title,
  subtitle,
}: {
  userName: string;
  role: UserRole;
  title?: string;
  subtitle?: string;
}) {
  const { t } = useTranslation();

  return (
    <div className="mb-4 lg:mb-6">
      <h1 className="text-xl lg:text-2xl font-semibold text-gray-900">
        {title || t.dashboard.overview}
      </h1>
      <p className="text-sm lg:text-base text-gray-500 mt-1">
        {t.dashboard.welcome}, {userName}!
        {subtitle ? (
          <span className="hidden sm:inline"> {subtitle}</span>
        ) : (
          <span className="hidden sm:inline"> {t.dashboard.heresYourOverview} {getRoleLabel(role)}.</span>
        )}
      </p>
    </div>
  );
}

// ============= GENERAL MANAGER DASHBOARD =============
interface GeneralManagerDashboardProps {
  userName: string;
  role: UserRole;
  stats: {
    totalEmployees: number;
    fullTimeCount: number;
    partTimeCount: number;
    juniorCount: number;
    middleCount: number;
    seniorCount: number;
    executiveCount: number;
    probationStatusCount: number;
    totalSalaryBudget: number;
    totalBranches: number;
    branchStats: BranchStats[];
  };
  attendanceStats: {
    present: number;
    late: number;
    absent: number;
  };
  recentActivity: RecentActivityItem[];
  unreadFeedbackCount: number;
  pendingApprovals: {
    total: number;
    paymentRequests: number;
    terminations: number;
    wageChanges: number;
  };
  pendingHRApprovals: {
    terminations: Array<{ id: string; employee_name: string }>;
    wageChanges: Array<{ id: string; employee_name: string; change_percentage: number }>;
  };
  branchAttendance: Array<{ id: string; name: string; present: number; total: number }>;
}

export function GeneralManagerDashboard({
  userName,
  role,
  stats,
  attendanceStats,
  recentActivity,
  unreadFeedbackCount,
  pendingApprovals,
  pendingHRApprovals,
  branchAttendance,
}: GeneralManagerDashboardProps) {
  const { t } = useTranslation();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('uz-UZ').format(amount) + ' UZS';
  };

  return (
    <div>
      <DashboardHeader userName={userName} role={role} />

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-4 lg:mb-6">
        <StatCard
          title={t.dashboard.totalEmployees}
          value={stats.totalEmployees}
          icon={Users}
          trend={`${stats.fullTimeCount} ${t.dashboard.fullTime}, ${stats.partTimeCount} ${t.dashboard.partTime}`}
          color="purple"
          href="/employees"
        />
        <StatCard
          title={t.dashboard.presentToday}
          value={attendanceStats.present}
          icon={UserCheck}
          color="green"
          href="/attendance"
        />
        <StatCard
          title={t.dashboard.pendingApprovals}
          value={pendingApprovals.total}
          icon={ClipboardCheck}
          color="amber"
          href="/approvals"
        />
        <StatCard
          title={t.dashboard.activeCandidates}
          value={stats.probationStatusCount}
          icon={UserPlus}
          color="purple"
          href="/recruitment"
        />
      </div>

      {/* Additional Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 lg:gap-4 mb-4 lg:mb-6">
        <StatCard
          title={t.dashboard.activeBranches}
          value={stats.totalBranches}
          icon={MapPin}
          color="purple"
          href="/branches"
        />
        <StatCard
          title={t.dashboard.monthlyWageBudget}
          value={formatCurrency(stats.totalSalaryBudget)}
          icon={TrendingUp}
          color="green"
          href="/reports"
        />
        <StatCard
          title={t.dashboard.absentToday}
          value={attendanceStats.absent}
          icon={AlertCircle}
          color="red"
          href="/attendance"
        />
        <StatCard
          title={t.dashboard.unreadFeedback}
          value={unreadFeedbackCount}
          icon={Inbox}
          color="blue"
          href="/feedback/review"
        />
      </div>

      {/* Pending Approvals Section */}
      {(pendingHRApprovals.terminations.length > 0 || pendingHRApprovals.wageChanges.length > 0 || pendingApprovals.paymentRequests > 0) && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle size={20} className="text-amber-600" />
            <h3 className="text-lg font-semibold text-gray-900">{t.dashboard.pendingApprovals}</h3>
          </div>
          <div className="space-y-2">
            {pendingHRApprovals.terminations.map((item) => (
              <div key={item.id} className="flex justify-between items-center p-3 bg-amber-50 rounded-lg">
                <span className="text-sm text-gray-700">{t.dashboard.terminationRequest} - {item.employee_name}</span>
                <span className="text-sm text-amber-600 font-medium">{t.dashboard.awaiting}</span>
              </div>
            ))}
            {pendingHRApprovals.wageChanges.map((item) => (
              <div key={item.id} className="flex justify-between items-center p-3 bg-amber-50 rounded-lg">
                <span className="text-sm text-gray-700">{t.dashboard.wageChange} - {item.employee_name} (+{item.change_percentage}%)</span>
                <span className="text-sm text-amber-600 font-medium">{t.dashboard.awaiting}</span>
              </div>
            ))}
            {pendingApprovals.paymentRequests > 0 && (
              <Link href="/accounting/approvals" className="flex justify-between items-center p-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
                <span className="text-sm text-gray-700">{t.dashboard.paymentRequests} ({pendingApprovals.paymentRequests})</span>
                <span className="text-sm text-blue-600 font-medium">{t.dashboard.review}</span>
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Branch Attendance */}
      {branchAttendance.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <MapPin size={20} className="text-purple-600" />
            <h3 className="text-lg font-semibold text-gray-900">{t.dashboard.branchAttendance}</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {branchAttendance.map((branch) => (
              <div key={branch.id} className="p-3 bg-gray-50 rounded-lg">
                <div className="font-medium text-gray-900">{branch.name}</div>
                <div className={`text-sm ${branch.present === branch.total ? 'text-green-600' : 'text-amber-600'}`}>
                  {branch.present}/{branch.total} {t.attendance.present.toLowerCase()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Content Grid */}
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

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RecentActivityCard activities={recentActivity} />
      </div>
    </div>
  );
}

// ============= CEO DASHBOARD =============
interface CEODashboardProps {
  userName: string;
  stats: {
    totalEmployees: number;
    fullTimeCount: number;
    totalSalaryBudget: number;
    totalBranches: number;
    probationStatusCount: number;
  };
  pendingApprovals: {
    total: number;
    paymentRequests: number;
    terminations: number;
    wageChanges: number;
  };
  unreadFeedbackCount: number;
}

export function CEODashboard({
  userName,
  stats,
  pendingApprovals,
  unreadFeedbackCount,
}: CEODashboardProps) {
  const { t } = useTranslation();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('uz-UZ').format(amount) + ' UZS';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-4 lg:mb-6">
        <h1 className="text-xl lg:text-2xl font-semibold text-gray-900">{t.dashboard.executiveDashboard}</h1>
        <p className="text-sm lg:text-base text-gray-500 mt-1">
          {t.dashboard.welcome}, {userName}! {t.dashboard.companyOverview}
        </p>
      </div>

      {/* Key Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-4">
        <StatCard
          title={t.dashboard.totalEmployees}
          value={stats.totalEmployees}
          icon={Users}
          trend={`${stats.fullTimeCount} ${t.dashboard.fullTime}`}
          color="purple"
          href="/employees"
        />
        <StatCard
          title={t.dashboard.monthlyPayroll}
          value={formatCurrency(stats.totalSalaryBudget)}
          icon={Wallet}
          color="green"
          href="/payroll"
        />
        <StatCard
          title={t.dashboard.pendingApprovals}
          value={pendingApprovals.total}
          icon={ClipboardCheck}
          color="amber"
          href="/approvals"
        />
      </div>

      {/* Key Metrics */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 size={20} className="text-purple-600" />
          <h3 className="text-lg font-semibold text-gray-900">{t.dashboard.keyMetrics}</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-gray-500">{t.dashboard.activeBranches}</p>
            <p className="text-xl font-semibold text-gray-900">{stats.totalBranches}</p>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-gray-500">{t.dashboard.onProbation}</p>
            <p className="text-xl font-semibold text-amber-600">{stats.probationStatusCount}</p>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-gray-500">{t.dashboard.unreadFeedback}</p>
            <p className="text-xl font-semibold text-blue-600">{unreadFeedbackCount}</p>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-gray-500">{t.dashboard.pendingRequests}</p>
            <p className="text-xl font-semibold text-purple-600">{pendingApprovals.terminations + pendingApprovals.wageChanges}</p>
          </div>
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Link
          href="/reports"
          className="bg-white rounded-xl border border-gray-200 p-4 hover:border-purple-300 hover:bg-purple-50 transition-colors text-center"
        >
          <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-2">
            <BarChart3 size={20} className="text-purple-600" />
          </div>
          <p className="font-medium text-gray-900">{t.dashboard.reports}</p>
        </Link>

        <Link
          href="/feedback/review"
          className="bg-white rounded-xl border border-gray-200 p-4 hover:border-blue-300 hover:bg-blue-50 transition-colors text-center"
        >
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-2">
            <Inbox size={20} className="text-blue-600" />
          </div>
          <p className="font-medium text-gray-900">{t.dashboard.feedbackInbox}</p>
          {unreadFeedbackCount > 0 && (
            <span className="text-xs text-blue-600">{unreadFeedbackCount} {t.common.unread}</span>
          )}
        </Link>

        <Link
          href="/accounting/approvals"
          className="bg-white rounded-xl border border-gray-200 p-4 hover:border-amber-300 hover:bg-amber-50 transition-colors text-center"
        >
          <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center mx-auto mb-2">
            <ClipboardCheck size={20} className="text-amber-600" />
          </div>
          <p className="font-medium text-gray-900">{t.nav.approvals}</p>
          {pendingApprovals.paymentRequests > 0 && (
            <span className="text-xs text-amber-600">{pendingApprovals.paymentRequests} {t.common.pending}</span>
          )}
        </Link>

        <Link
          href="/employees"
          className="bg-white rounded-xl border border-gray-200 p-4 hover:border-green-300 hover:bg-green-50 transition-colors text-center"
        >
          <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-2">
            <Users size={20} className="text-green-600" />
          </div>
          <p className="font-medium text-gray-900">{t.nav.employees}</p>
        </Link>
      </div>
    </div>
  );
}

// ============= HR DASHBOARD =============
interface HRDashboardProps {
  userName: string;
  hrStats: {
    totalEmployees: number;
    onProbation: number;
    activeCandidates: number;
    absentToday: number;
  };
  candidateStats: {
    byStage?: Record<string, number>;
  };
  recentActivity: RecentActivityItem[];
}

export function HRDashboard({
  userName,
  hrStats,
  candidateStats,
  recentActivity,
}: HRDashboardProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-4 lg:mb-6">
        <h1 className="text-xl lg:text-2xl font-semibold text-gray-900">{t.dashboard.hrDashboard}</h1>
        <p className="text-sm lg:text-base text-gray-500 mt-1">
          {t.dashboard.welcome}, {userName}! {t.dashboard.manageOperations}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        <StatCard
          title={t.dashboard.totalEmployees}
          value={hrStats.totalEmployees}
          icon={Users}
          color="purple"
          href="/employees"
        />
        <StatCard
          title={t.dashboard.onProbation}
          value={hrStats.onProbation}
          icon={Briefcase}
          color="amber"
          href="/employees?status=probation"
        />
        <StatCard
          title={t.dashboard.activeCandidates}
          value={hrStats.activeCandidates}
          icon={UserPlus}
          color="purple"
          href="/recruitment"
        />
        <StatCard
          title={t.dashboard.absentToday}
          value={hrStats.absentToday}
          icon={XCircle}
          color="red"
          href="/attendance"
        />
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recruitment Pipeline */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <UserPlus size={20} className="text-purple-600" />
              <h3 className="font-semibold text-gray-900">{t.dashboard.recruitmentPipeline}</h3>
            </div>
            <Link href="/recruitment" className="text-sm text-purple-600 hover:text-purple-700 flex items-center gap-1">
              {t.dashboard.viewAll} <ArrowRight size={14} />
            </Link>
          </div>
          <div className="space-y-3">
            {candidateStats.byStage && Object.entries(candidateStats.byStage).map(([stage, count]) => (
              <div key={stage} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                <span className="text-sm text-gray-700 capitalize">{stage.replace('_', ' ')}</span>
                <span className="font-medium text-gray-900">{count as number}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <RecentActivityCard activities={recentActivity} />
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Link
          href="/employees/new"
          className="bg-white rounded-xl border border-gray-200 p-4 hover:border-purple-300 hover:bg-purple-50 transition-colors text-center"
        >
          <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-2">
            <UserPlus size={20} className="text-purple-600" />
          </div>
          <p className="font-medium text-gray-900">{t.dashboard.addEmployee}</p>
        </Link>

        <Link
          href="/recruitment/board"
          className="bg-white rounded-xl border border-gray-200 p-4 hover:border-blue-300 hover:bg-blue-50 transition-colors text-center"
        >
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-2">
            <UserPlus size={20} className="text-blue-600" />
          </div>
          <p className="font-medium text-gray-900">{t.dashboard.recruitmentBoard}</p>
        </Link>

        <Link
          href="/attendance"
          className="bg-white rounded-xl border border-gray-200 p-4 hover:border-green-300 hover:bg-green-50 transition-colors text-center"
        >
          <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-2">
            <Clock size={20} className="text-green-600" />
          </div>
          <p className="font-medium text-gray-900">{t.nav.attendance}</p>
        </Link>

        <Link
          href="/payroll"
          className="bg-white rounded-xl border border-gray-200 p-4 hover:border-orange-300 hover:bg-orange-50 transition-colors text-center"
        >
          <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center mx-auto mb-2">
            <Wallet size={20} className="text-orange-600" />
          </div>
          <p className="font-medium text-gray-900">{t.nav.payroll}</p>
        </Link>
      </div>
    </div>
  );
}

// ============= EMPLOYEE DASHBOARD =============
interface EmployeeDashboardProps {
  employee: {
    full_name: string;
    position: string;
    branches?: { name: string };
  } | null;
  monthlySummary: {
    presentDays: number;
    lateDays: number;
    totalHours: number;
  };
  pendingLeaves: number;
  recentAttendance: Array<{
    id: string;
    date: string;
    check_in: string | null;
    check_out: string | null;
    total_hours: number | null;
    status: string;
  }>;
  myPaymentStats: {
    pending: number;
  };
}

export function EmployeeDashboard({
  employee,
  monthlySummary,
  pendingLeaves,
  recentAttendance,
  myPaymentStats,
}: EmployeeDashboardProps) {
  const { t } = useTranslation();

  if (!employee) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
        <p className="text-gray-500">{t.dashboard.profileNotLinked}</p>
      </div>
    );
  }

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
            <p className="text-purple-200 text-sm">{employee.branches?.name || t.common.noBranch}</p>
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
              <p className="text-sm text-gray-500">{t.dashboard.daysPresent}</p>
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
              <p className="text-sm text-gray-500">{t.dashboard.lateArrivals}</p>
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
              <p className="text-sm text-gray-500">{t.dashboard.hoursWorked}</p>
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
              <p className="text-sm text-gray-500">{t.dashboard.pendingLeaves}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Attendance */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">{t.dashboard.recentAttendance}</h3>
          <Link
            href="/my-portal/attendance"
            className="text-sm text-purple-600 hover:text-purple-700 flex items-center gap-1"
          >
            {t.dashboard.viewAll} <ArrowRight size={14} />
          </Link>
        </div>
        <div className="divide-y divide-gray-100">
          {recentAttendance.length === 0 ? (
            <div className="p-6 text-center text-gray-500">{t.dashboard.noAttendanceRecords}</div>
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

      {/* Quick Links */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Link
          href="/my-portal"
          className="bg-white rounded-xl border border-gray-200 p-4 hover:border-purple-300 hover:bg-purple-50 transition-colors text-center"
        >
          <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-2">
            <Users size={20} className="text-purple-600" />
          </div>
          <p className="font-medium text-gray-900">{t.dashboard.myPortal}</p>
        </Link>

        <Link
          href="/my-portal/attendance"
          className="bg-white rounded-xl border border-gray-200 p-4 hover:border-blue-300 hover:bg-blue-50 transition-colors text-center"
        >
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-2">
            <Clock size={20} className="text-blue-600" />
          </div>
          <p className="font-medium text-gray-900">{t.nav.attendance}</p>
        </Link>

        <Link
          href="/my-portal/leaves"
          className="bg-white rounded-xl border border-gray-200 p-4 hover:border-green-300 hover:bg-green-50 transition-colors text-center"
        >
          <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-2">
            <Calendar size={20} className="text-green-600" />
          </div>
          <p className="font-medium text-gray-900">{t.dashboard.leaveRequests}</p>
        </Link>

        <Link
          href="/accounting/my-requests"
          className="bg-white rounded-xl border border-gray-200 p-4 hover:border-orange-300 hover:bg-orange-50 transition-colors text-center"
        >
          <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center mx-auto mb-2">
            <FileText size={20} className="text-orange-600" />
          </div>
          <p className="font-medium text-gray-900">{t.dashboard.myRequests}</p>
          {myPaymentStats.pending > 0 && (
            <span className="text-xs text-amber-600">{myPaymentStats.pending} {t.common.pending}</span>
          )}
        </Link>

        <Link
          href="/feedback"
          className="bg-white rounded-xl border border-gray-200 p-4 hover:border-indigo-300 hover:bg-indigo-50 transition-colors text-center"
        >
          <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center mx-auto mb-2">
            <MessageSquare size={20} className="text-indigo-600" />
          </div>
          <p className="font-medium text-gray-900">{t.dashboard.giveFeedback}</p>
        </Link>
      </div>
    </div>
  );
}

// ============= RECRUITER DASHBOARD =============
interface RecruiterDashboardProps {
  userName: string;
  recruiterStats: {
    totalCandidates: number;
    screening: number;
    interview: number;
    underReview: number;
    probation: number;
    hiredThisMonth: number;
  };
}

export function RecruiterDashboard({
  userName,
  recruiterStats,
}: RecruiterDashboardProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-4 lg:mb-6">
        <h1 className="text-xl lg:text-2xl font-semibold text-gray-900">{t.dashboard.recruitmentDashboard}</h1>
        <p className="text-sm lg:text-base text-gray-500 mt-1">
          {t.dashboard.welcome}, {userName}! {t.dashboard.manageCandidates}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        <StatCard
          title={t.dashboard.totalCandidates}
          value={recruiterStats.totalCandidates}
          icon={Users}
          color="purple"
          href="/recruitment"
        />
        <StatCard
          title={t.dashboard.interviewStage}
          value={recruiterStats.interview}
          icon={UserCheck}
          color="blue"
          href="/recruitment/board"
        />
        <StatCard
          title={t.dashboard.underReview}
          value={recruiterStats.underReview}
          icon={ClipboardCheck}
          color="amber"
          href="/recruitment/board"
        />
        <StatCard
          title={t.dashboard.hiredThisMonth}
          value={recruiterStats.hiredThisMonth}
          icon={CheckCircle2}
          color="green"
        />
      </div>

      {/* Pipeline Overview */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <UserPlus size={20} className="text-purple-600" />
            <h3 className="font-semibold text-gray-900">{t.dashboard.pipelineOverview}</h3>
          </div>
          <Link href="/recruitment/board" className="text-sm text-purple-600 hover:text-purple-700 flex items-center gap-1">
            {t.dashboard.openBoard} <ArrowRight size={14} />
          </Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="p-3 bg-gray-50 rounded-lg text-center">
            <p className="text-2xl font-bold text-gray-900">{recruiterStats.screening}</p>
            <p className="text-sm text-gray-500">{t.dashboard.screening}</p>
          </div>
          <div className="p-3 bg-blue-50 rounded-lg text-center">
            <p className="text-2xl font-bold text-blue-600">{recruiterStats.interview}</p>
            <p className="text-sm text-gray-500">{t.dashboard.interview}</p>
          </div>
          <div className="p-3 bg-amber-50 rounded-lg text-center">
            <p className="text-2xl font-bold text-amber-600">{recruiterStats.underReview}</p>
            <p className="text-sm text-gray-500">{t.dashboard.underReview}</p>
          </div>
          <div className="p-3 bg-purple-50 rounded-lg text-center">
            <p className="text-2xl font-bold text-purple-600">{recruiterStats.probation}</p>
            <p className="text-sm text-gray-500">{t.dashboard.probation}</p>
          </div>
          <div className="p-3 bg-green-50 rounded-lg text-center">
            <p className="text-2xl font-bold text-green-600">{recruiterStats.hiredThisMonth}</p>
            <p className="text-sm text-gray-500">{t.dashboard.hired}</p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Link
          href="/recruitment/board"
          className="bg-white rounded-xl border border-gray-200 p-4 hover:border-purple-300 hover:bg-purple-50 transition-colors text-center"
        >
          <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-2">
            <UserPlus size={20} className="text-purple-600" />
          </div>
          <p className="font-medium text-gray-900">{t.dashboard.kanbanBoard}</p>
        </Link>

        <Link
          href="/recruitment/table"
          className="bg-white rounded-xl border border-gray-200 p-4 hover:border-blue-300 hover:bg-blue-50 transition-colors text-center"
        >
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-2">
            <FileText size={20} className="text-blue-600" />
          </div>
          <p className="font-medium text-gray-900">{t.dashboard.tableView}</p>
        </Link>

        <Link
          href="/feedback"
          className="bg-white rounded-xl border border-gray-200 p-4 hover:border-green-300 hover:bg-green-50 transition-colors text-center"
        >
          <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-2">
            <MessageSquare size={20} className="text-green-600" />
          </div>
          <p className="font-medium text-gray-900">{t.dashboard.giveFeedback}</p>
        </Link>
      </div>
    </div>
  );
}

// ============= CHIEF ACCOUNTANT DASHBOARD =============
interface ChiefAccountantDashboardProps {
  userName: string;
  accountingStats: {
    pendingRequests: number;
    awaitingApproval: number;
    processedToday: number;
    totalThisMonth: number;
  };
  pendingRequests: Array<{
    id: string;
    description?: string;
    request_type: string;
    total_amount: number;
  }>;
}

export function ChiefAccountantDashboard({
  userName,
  accountingStats,
  pendingRequests,
}: ChiefAccountantDashboardProps) {
  const { t } = useTranslation();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('uz-UZ').format(amount) + ' UZS';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-4 lg:mb-6">
        <h1 className="text-xl lg:text-2xl font-semibold text-gray-900">{t.dashboard.accountingDashboard}</h1>
        <p className="text-sm lg:text-base text-gray-500 mt-1">
          {t.dashboard.welcome}, {userName}! {t.dashboard.managePaymentRequests}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        <StatCard
          title={t.dashboard.pendingRequests}
          value={accountingStats.pendingRequests}
          icon={FileText}
          color="amber"
          href="/accounting/requests"
        />
        <StatCard
          title={t.dashboard.awaitingMyApproval}
          value={accountingStats.awaitingApproval}
          icon={ClipboardCheck}
          color="purple"
          href="/accounting/approvals"
        />
        <StatCard
          title={t.dashboard.processedToday}
          value={accountingStats.processedToday}
          icon={CheckCircle2}
          color="green"
        />
        <StatCard
          title={t.dashboard.totalThisMonth}
          value={accountingStats.totalThisMonth}
          icon={Calculator}
          color="blue"
        />
      </div>

      {/* Pending Approvals */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <ClipboardCheck size={20} className="text-purple-600" />
            <h3 className="font-semibold text-gray-900">{t.dashboard.pendingApprovals}</h3>
          </div>
          <Link href="/accounting/approvals" className="text-sm text-purple-600 hover:text-purple-700 flex items-center gap-1">
            {t.dashboard.viewAll} <ArrowRight size={14} />
          </Link>
        </div>
        <div className="space-y-2">
          {pendingRequests.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">{t.dashboard.noPendingApprovals}</p>
          ) : (
            pendingRequests.map((request) => (
              <div key={request.id} className="flex justify-between items-center p-3 bg-amber-50 rounded-lg">
                <div>
                  <span className="font-medium text-gray-900">{request.request_type.toUpperCase()}-{request.id.slice(0, 8).toUpperCase()}</span>
                  <span className="text-sm text-gray-500 ml-2">- {request.description || request.request_type}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-medium text-gray-900">{formatCurrency(request.total_amount)}</span>
                  <Link
                    href={`/accounting/requests/${request.id}`}
                    className="px-3 py-1 bg-purple-600 text-white rounded text-sm hover:bg-purple-700"
                  >
                    {t.dashboard.review}
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Link
          href="/accounting/requests"
          className="bg-white rounded-xl border border-gray-200 p-4 hover:border-purple-300 hover:bg-purple-50 transition-colors text-center"
        >
          <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-2">
            <FileText size={20} className="text-purple-600" />
          </div>
          <p className="font-medium text-gray-900">{t.dashboard.allRequests}</p>
        </Link>

        <Link
          href="/accounting/approvals"
          className="bg-white rounded-xl border border-gray-200 p-4 hover:border-amber-300 hover:bg-amber-50 transition-colors text-center"
        >
          <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center mx-auto mb-2">
            <ClipboardCheck size={20} className="text-amber-600" />
          </div>
          <p className="font-medium text-gray-900">{t.nav.approvals}</p>
        </Link>

        <Link
          href="/accounting/my-requests"
          className="bg-white rounded-xl border border-gray-200 p-4 hover:border-blue-300 hover:bg-blue-50 transition-colors text-center"
        >
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-2">
            <FileText size={20} className="text-blue-600" />
          </div>
          <p className="font-medium text-gray-900">{t.dashboard.myRequests}</p>
        </Link>
      </div>
    </div>
  );
}

// ============= ACCOUNTANT DASHBOARD =============
interface AccountantDashboardProps {
  userName: string;
  accountingStats: {
    pendingRequests: number;
    inProgress: number;
    processedToday: number;
  };
}

export function AccountantDashboard({
  userName,
  accountingStats,
}: AccountantDashboardProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-4 lg:mb-6">
        <h1 className="text-xl lg:text-2xl font-semibold text-gray-900">{t.dashboard.accountantDashboard}</h1>
        <p className="text-sm lg:text-base text-gray-500 mt-1">
          {t.dashboard.welcome}, {userName}! {t.dashboard.processPaymentRequests}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 lg:gap-4">
        <StatCard
          title={t.dashboard.toProcess}
          value={accountingStats.pendingRequests}
          icon={FileText}
          color="amber"
          href="/accounting/requests"
        />
        <StatCard
          title={t.dashboard.inProgress}
          value={accountingStats.inProgress}
          icon={Clock}
          color="blue"
        />
        <StatCard
          title={t.dashboard.completedToday}
          value={accountingStats.processedToday}
          icon={CheckCircle2}
          color="green"
        />
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Link
          href="/accounting/requests"
          className="bg-white rounded-xl border border-gray-200 p-4 hover:border-purple-300 hover:bg-purple-50 transition-colors text-center"
        >
          <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-2">
            <FileText size={20} className="text-purple-600" />
          </div>
          <p className="font-medium text-gray-900">{t.dashboard.allRequests}</p>
        </Link>

        <Link
          href="/accounting/my-requests"
          className="bg-white rounded-xl border border-gray-200 p-4 hover:border-blue-300 hover:bg-blue-50 transition-colors text-center"
        >
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-2">
            <FileText size={20} className="text-blue-600" />
          </div>
          <p className="font-medium text-gray-900">{t.dashboard.myRequests}</p>
        </Link>

        <Link
          href="/feedback"
          className="bg-white rounded-xl border border-gray-200 p-4 hover:border-green-300 hover:bg-green-50 transition-colors text-center"
        >
          <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-2">
            <MessageSquare size={20} className="text-green-600" />
          </div>
          <p className="font-medium text-gray-900">{t.dashboard.giveFeedback}</p>
        </Link>
      </div>
    </div>
  );
}

// ============= LEGAL MANAGER DASHBOARD =============
interface LegalManagerDashboardProps {
  userName: string;
  myPaymentStats: {
    myRequests: number;
    pending: number;
  };
  myRecentRequests: Array<{
    id: string;
    description?: string;
    request_type: string;
    status: string;
  }>;
}

export function LegalManagerDashboard({
  userName,
  myPaymentStats,
  myRecentRequests,
}: LegalManagerDashboardProps) {
  const { t } = useTranslation();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
      case 'paid':
        return 'bg-green-100 text-green-700';
      case 'submitted':
      case 'pending_review':
        return 'bg-amber-100 text-amber-700';
      case 'rejected':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-4 lg:mb-6">
        <h1 className="text-xl lg:text-2xl font-semibold text-gray-900">{t.dashboard.legalDashboard}</h1>
        <p className="text-sm lg:text-base text-gray-500 mt-1">
          {t.dashboard.welcome}, {userName}!
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 lg:gap-4">
        <StatCard
          title={t.dashboard.myRequests}
          value={myPaymentStats.myRequests}
          icon={FileText}
          color="purple"
          href="/accounting/my-requests"
        />
        <StatCard
          title={t.accounting.pending}
          value={myPaymentStats.pending}
          icon={Clock}
          color="amber"
          href="/accounting/my-requests"
        />
      </div>

      {/* Recent Requests */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <FileText size={20} className="text-purple-600" />
            <h3 className="font-semibold text-gray-900">{t.dashboard.myRecentRequests}</h3>
          </div>
          <Link href="/accounting/my-requests" className="text-sm text-purple-600 hover:text-purple-700 flex items-center gap-1">
            {t.dashboard.viewAll} <ArrowRight size={14} />
          </Link>
        </div>
        <div className="space-y-2">
          {myRecentRequests.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">{t.dashboard.noRecentRequests}</p>
          ) : (
            myRecentRequests.map((request) => (
              <div key={request.id} className={`flex justify-between items-center p-3 rounded-lg ${getStatusColor(request.status).replace('text-', 'bg-').replace('-700', '-50')}`}>
                <span className="text-sm text-gray-700">{request.description || request.request_type}</span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${getStatusColor(request.status)}`}>
                  {request.status.replace('_', ' ')}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-2 gap-4">
        <Link
          href="/accounting/my-requests"
          className="bg-white rounded-xl border border-gray-200 p-4 hover:border-purple-300 hover:bg-purple-50 transition-colors text-center"
        >
          <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-2">
            <FileText size={20} className="text-purple-600" />
          </div>
          <p className="font-medium text-gray-900">{t.dashboard.myRequests}</p>
        </Link>

        <Link
          href="/feedback"
          className="bg-white rounded-xl border border-gray-200 p-4 hover:border-green-300 hover:bg-green-50 transition-colors text-center"
        >
          <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-2">
            <MessageSquare size={20} className="text-green-600" />
          </div>
          <p className="font-medium text-gray-900">{t.dashboard.giveFeedback}</p>
        </Link>
      </div>
    </div>
  );
}

// ============= BRANCH MANAGER DASHBOARD =============
interface BranchManagerDashboardProps {
  userName: string;
  branchName?: string;
  stats: {
    juniorCount: number;
    middleCount: number;
    seniorCount: number;
    executiveCount: number;
  };
  branchAttendance: {
    total: number;
    present: number;
    absent: number;
    late: number;
    absentEmployees: Array<{ id: string; full_name: string }>;
    lateEmployees: Array<{ id: string; full_name: string; check_in: string }>;
  };
  recentActivity: RecentActivityItem[];
}

export function BranchManagerDashboard({
  userName,
  branchName,
  stats,
  branchAttendance,
  recentActivity,
}: BranchManagerDashboardProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-4 lg:mb-6">
        <h1 className="text-xl lg:text-2xl font-semibold text-gray-900">{t.dashboard.branchDashboard}</h1>
        <p className="text-sm lg:text-base text-gray-500 mt-1">
          {t.dashboard.welcome}, {userName}!
          {branchName && <span className="text-purple-600"> {branchName}</span>}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 lg:gap-4">
        <StatCard
          title={t.dashboard.branchEmployees}
          value={branchAttendance.total}
          icon={Users}
          color="purple"
          href="/employees"
        />
        <StatCard
          title={t.dashboard.presentToday}
          value={branchAttendance.present}
          icon={UserCheck}
          color="green"
          href="/attendance"
        />
        <StatCard
          title={t.dashboard.absentLate}
          value={branchAttendance.absent + branchAttendance.late}
          icon={XCircle}
          color="red"
          href="/attendance"
        />
      </div>

      {/* Today's Attendance Issues */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Clock size={20} className="text-purple-600" />
            <h3 className="font-semibold text-gray-900">{t.dashboard.todaysAttendance}</h3>
          </div>
          <Link href="/attendance" className="text-sm text-purple-600 hover:text-purple-700 flex items-center gap-1">
            {t.dashboard.viewAll} <ArrowRight size={14} />
          </Link>
        </div>
        <div className="space-y-2">
          {branchAttendance.absentEmployees.length === 0 && branchAttendance.lateEmployees.length === 0 ? (
            <p className="text-sm text-green-600 text-center py-4">{t.dashboard.allPresentOnTime}</p>
          ) : (
            <>
              {branchAttendance.absentEmployees.map((emp) => (
                <div key={emp.id} className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
                  <span className="text-sm text-gray-900">{emp.full_name}</span>
                  <span className="text-sm text-red-600 font-medium">{t.dashboard.absent}</span>
                </div>
              ))}
              {branchAttendance.lateEmployees.map((emp) => (
                <div key={emp.id} className="flex justify-between items-center p-3 bg-amber-50 rounded-lg">
                  <span className="text-sm text-gray-900">{emp.full_name}</span>
                  <span className="text-sm text-amber-600 font-medium">{t.dashboard.late} ({emp.check_in})</span>
                </div>
              ))}
            </>
          )}
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <LevelDistributionCard
          juniorCount={stats.juniorCount}
          middleCount={stats.middleCount}
          seniorCount={stats.seniorCount}
          executiveCount={stats.executiveCount}
        />
        <RecentActivityCard activities={recentActivity} />
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Link
          href="/employees"
          className="bg-white rounded-xl border border-gray-200 p-4 hover:border-purple-300 hover:bg-purple-50 transition-colors text-center"
        >
          <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-2">
            <Users size={20} className="text-purple-600" />
          </div>
          <p className="font-medium text-gray-900">{t.nav.employees}</p>
        </Link>

        <Link
          href="/attendance"
          className="bg-white rounded-xl border border-gray-200 p-4 hover:border-blue-300 hover:bg-blue-50 transition-colors text-center"
        >
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-2">
            <Clock size={20} className="text-blue-600" />
          </div>
          <p className="font-medium text-gray-900">{t.nav.attendance}</p>
        </Link>

        <Link
          href="/feedback"
          className="bg-white rounded-xl border border-gray-200 p-4 hover:border-green-300 hover:bg-green-50 transition-colors text-center"
        >
          <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-2">
            <MessageSquare size={20} className="text-green-600" />
          </div>
          <p className="font-medium text-gray-900">{t.dashboard.giveFeedback}</p>
        </Link>
      </div>
    </div>
  );
}
