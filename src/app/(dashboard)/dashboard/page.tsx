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
  MessageSquare,
  Inbox,
  FileText,
  ClipboardCheck,
  UserPlus,
  Calculator,
  Scale,
  Wallet,
  BarChart3,
} from 'lucide-react';
import {
  GeneralManagerDashboard as GMDashboardClient,
  CEODashboard as CEODashboardClient,
  HRDashboard as HRDashboardClient,
  EmployeeDashboard as EmployeeDashboardClient,
  RecruiterDashboard as RecruiterDashboardClient,
  ChiefAccountantDashboard as ChiefAccountantDashboardClient,
  AccountantDashboard as AccountantDashboardClient,
  LegalManagerDashboard as LegalManagerDashboardClient,
  BranchManagerDashboard as BranchManagerDashboardClient,
} from './DashboardClient';
import {
  getTodayAttendance,
  getBranches,
  getEmployees,
  getAttendanceStats,
  getEmployeeByEmail,
  getAttendanceByEmployee,
  getLeaveRequestsByEmployee,
  getEmployeeAttendanceSummary,
  getUnreadFeedbackCount,
  getPendingApprovalsForGM,
  getAccountingDashboardStats,
  getPendingPaymentRequestsForApproval,
  getMyPaymentRequestStats,
  getMyRecentPaymentRequests,
  getHRDashboardStats,
  getRecruiterDashboardStats,
  getBranchAttendanceToday,
  getPendingHRApprovals,
  getBranchAttendanceSummaryForGM,
  getCandidateStats,
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

// Note: UI Components are now in DashboardClient.tsx with proper i18n support

export default async function DashboardPage() {
  const user = await getSession();

  if (!user) {
    redirect('/login');
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('uz-UZ').format(amount) + ' UZS';
  };

  // Role-specific dashboards
  switch (user.role) {
    case 'employee': {
      const employee = await getEmployeeByEmail(user.email);
      if (!employee) {
        return (
          <EmployeeDashboardClient
            employee={null}
            monthlySummary={{ presentDays: 0, lateDays: 0, totalHours: 0 }}
            pendingLeaves={0}
            recentAttendance={[]}
            myPaymentStats={{ pending: 0 }}
          />
        );
      }
      const currentYear = new Date().getFullYear();
      const currentMonth = new Date().getMonth() + 1;
      const [recentAttendance, leaveRequests, monthlySummary, myPaymentStats] = await Promise.all([
        getAttendanceByEmployee(employee.id, 7),
        getLeaveRequestsByEmployee(employee.id),
        getEmployeeAttendanceSummary(employee.id, currentYear, currentMonth),
        getMyPaymentRequestStats(employee.id),
      ]);
      const pendingLeaves = leaveRequests.filter((l: any) => l.status === 'pending').length;
      return (
        <EmployeeDashboardClient
          employee={employee}
          monthlySummary={monthlySummary}
          pendingLeaves={pendingLeaves}
          recentAttendance={recentAttendance}
          myPaymentStats={myPaymentStats}
        />
      );
    }

    case 'ceo': {
      const [stats, pendingApprovals, unreadFeedbackCount] = await Promise.all([
        getDashboardStats(),
        getPendingApprovalsForGM(),
        getUnreadFeedbackCount(),
      ]);
      return (
        <CEODashboardClient
          userName={user.name}
          stats={stats}
          pendingApprovals={pendingApprovals}
          unreadFeedbackCount={unreadFeedbackCount}
        />
      );
    }

    case 'hr': {
      const [hrStats, candidateStats, recentActivity] = await Promise.all([
        getHRDashboardStats(),
        getCandidateStats(),
        getRecentActivity(),
      ]);
      return (
        <HRDashboardClient
          userName={user.name}
          hrStats={hrStats}
          candidateStats={candidateStats}
          recentActivity={recentActivity}
        />
      );
    }

    case 'recruiter': {
      const recruiterStats = await getRecruiterDashboardStats();
      return (
        <RecruiterDashboardClient
          userName={user.name}
          recruiterStats={recruiterStats}
        />
      );
    }

    case 'chief_accountant': {
      const [accountingStats, pendingRequestsRaw] = await Promise.all([
        getAccountingDashboardStats(true),
        getPendingPaymentRequestsForApproval(5),
      ]);
      // Map null to undefined for description to match component props
      const pendingRequests = pendingRequestsRaw.map(r => ({
        ...r,
        description: r.description ?? undefined,
      }));
      return (
        <ChiefAccountantDashboardClient
          userName={user.name}
          accountingStats={accountingStats}
          pendingRequests={pendingRequests}
        />
      );
    }

    case 'accountant': {
      const accountingStats = await getAccountingDashboardStats(false);
      return (
        <AccountantDashboardClient
          userName={user.name}
          accountingStats={accountingStats}
        />
      );
    }

    case 'legal_manager': {
      const myPaymentStats = user.employeeId ? await getMyPaymentRequestStats(user.employeeId) : { myRequests: 0, pending: 0, approved: 0 };
      const myRecentRequestsRaw = user.employeeId ? await getMyRecentPaymentRequests(user.employeeId, 3) : [];
      // Map null to undefined for description to match component props
      const myRecentRequests = myRecentRequestsRaw.map(r => ({
        ...r,
        description: r.description ?? undefined,
      }));
      return (
        <LegalManagerDashboardClient
          userName={user.name}
          myPaymentStats={myPaymentStats}
          myRecentRequests={myRecentRequests}
        />
      );
    }

    case 'branch_manager': {
      let branchName = '';
      const branchId = user.branchId || '';
      if (branchId) {
        const branches = await getBranches();
        const branch = branches.find((b: Branch) => b.id === branchId);
        branchName = branch?.name || '';
      }
      const [stats, branchAttendance, recentActivity] = await Promise.all([
        getDashboardStats(branchId),
        getBranchAttendanceToday(branchId),
        getRecentActivity(branchId),
      ]);
      return (
        <BranchManagerDashboardClient
          userName={user.name}
          branchName={branchName}
          stats={stats}
          branchAttendance={branchAttendance}
          recentActivity={recentActivity}
        />
      );
    }

    case 'general_manager':
    default:
      // General Manager gets the full dashboard
      const branchId = undefined;

      // Fetch all data from Supabase
      const [stats, attendanceStats, recentActivity, unreadFeedbackCount, pendingApprovals, pendingHRApprovals, branchAttendance] = await Promise.all([
        getDashboardStats(branchId),
        getAttendanceStats(),
        getRecentActivity(branchId),
        getUnreadFeedbackCount(),
        getPendingApprovalsForGM(),
        getPendingHRApprovals(3),
        getBranchAttendanceSummaryForGM(),
      ]);

      return (
        <GMDashboardClient
          userName={user.name}
          role={user.role}
          stats={stats}
          attendanceStats={attendanceStats}
          recentActivity={recentActivity}
          unreadFeedbackCount={unreadFeedbackCount}
          pendingApprovals={pendingApprovals}
          pendingHRApprovals={pendingHRApprovals}
          branchAttendance={branchAttendance}
        />
      );
  }
}
