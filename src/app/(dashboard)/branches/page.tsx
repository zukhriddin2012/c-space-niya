import { getSession } from '@/lib/auth-server';
import { hasPermission } from '@/lib/auth';
import { PERMISSIONS } from '@/lib/permissions';
import { redirect } from 'next/navigation';
import { getBranches, getEmployees, getTodayAttendance } from '@/lib/db';
import BranchesClient from './BranchesClient';
import { unstable_cache } from 'next/cache';

export interface BranchWithStats {
  id: string;
  name: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  geofence_radius: number;
  isActive: boolean;
  totalEmployees: number;
  presentToday: number;
  salaryBudget: number;
  // New branch configuration fields
  operational_status: 'under_construction' | 'operational' | 'rented' | 'facility_management' | 'headquarters';
  has_night_shift: boolean;
  smart_lock_enabled: boolean;
  branch_class: 'A+' | 'A' | 'B+' | 'B' | 'C+' | 'C';
  community_manager_name?: string;
}

// Cache branches for 5 minutes
const getCachedBranches = unstable_cache(
  async () => getBranches(),
  ['branches'],
  { revalidate: 300 }
);

// Cache employees for 1 minute
const getCachedEmployees = unstable_cache(
  async () => getEmployees(),
  ['employees'],
  { revalidate: 60 }
);

// Fetch branch data with employee counts - optimized with pre-computed maps
async function getBranchesWithStats(): Promise<BranchWithStats[]> {
  const [branches, employees, attendance] = await Promise.all([
    getCachedBranches(),
    getCachedEmployees(),
    getTodayAttendance(),
  ]);

  // Pre-compute employee counts and salary by branch (O(n) instead of O(n*m))
  const branchStats = new Map<string, { count: number; salary: number }>();
  for (const e of employees) {
    if (e.branch_id) {
      const existing = branchStats.get(e.branch_id) || { count: 0, salary: 0 };
      existing.count++;
      existing.salary += e.salary || 0;
      branchStats.set(e.branch_id, existing);
    }
  }

  // Pre-compute present count by branch - count UNIQUE employees, not check-in records
  // An employee with multiple sessions should only be counted once
  const presentByBranch = new Map<string, Set<string>>();
  for (const a of attendance) {
    if (a.check_in_branch_id && a.employee_id) {
      if (!presentByBranch.has(a.check_in_branch_id)) {
        presentByBranch.set(a.check_in_branch_id, new Set());
      }
      presentByBranch.get(a.check_in_branch_id)!.add(a.employee_id);
    }
  }

  return branches.map(branch => {
    const stats = branchStats.get(branch.id) || { count: 0, salary: 0 };
    // Find community manager name if assigned
    const cmName = branch.community_manager_id
      ? employees.find(e => e.id === branch.community_manager_id)?.full_name
      : undefined;
    return {
      ...branch,
      isActive: stats.count > 0,
      totalEmployees: stats.count,
      presentToday: presentByBranch.get(branch.id)?.size || 0,
      salaryBudget: stats.salary,
      // New fields with defaults for backwards compatibility
      operational_status: branch.operational_status || 'operational',
      has_night_shift: branch.has_night_shift || false,
      smart_lock_enabled: branch.smart_lock_enabled || false,
      branch_class: branch.branch_class || 'B',
      community_manager_name: cmName,
    };
  });
}

export default async function BranchesPage() {
  const user = await getSession();

  if (!user) {
    redirect('/login');
  }

  // Check permission
  if (!hasPermission(user.role, PERMISSIONS.BRANCHES_EDIT) && !hasPermission(user.role, PERMISSIONS.ATTENDANCE_VIEW)) {
    redirect('/dashboard');
  }

  const canManageBranches = hasPermission(user.role, PERMISSIONS.BRANCHES_EDIT);
  const canViewSalaries = user.role === 'general_manager' || user.role === 'ceo';

  // Fetch real branch data from Supabase
  const branchesWithStats = await getBranchesWithStats();

  // Sort: branches with employees first, then by name
  const sortedBranches = [...branchesWithStats].sort((a, b) => {
    if (a.totalEmployees > 0 && b.totalEmployees === 0) return -1;
    if (a.totalEmployees === 0 && b.totalEmployees > 0) return 1;
    return a.name.localeCompare(b.name);
  });

  return (
    <BranchesClient
      branches={sortedBranches}
      canManageBranches={canManageBranches}
      canViewSalaries={canViewSalaries}
    />
  );
}
