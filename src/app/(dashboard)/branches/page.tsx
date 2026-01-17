import { getSession } from '@/lib/auth-server';
import { hasPermission } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { Plus, MapPin, Users, CheckCircle, Clock, Wallet, Edit, Circle } from 'lucide-react';
import Link from 'next/link';
import { getBranches, getEmployees, getTodayAttendance } from '@/lib/db';
import BranchMap from '@/components/BranchMap';

interface BranchWithStats {
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
}

// Fetch branch data with employee counts
async function getBranchesWithStats(): Promise<BranchWithStats[]> {
  const [branches, employees, attendance] = await Promise.all([
    getBranches(),
    getEmployees(),
    getTodayAttendance(),
  ]);

  return branches.map(branch => {
    const branchEmployees = employees.filter(e => e.branch_id === branch.id);
    const salaryBudget = branchEmployees.reduce((sum, e) => sum + (e.salary || 0), 0);
    const presentToday = attendance.filter(a => a.check_in_branch_id === branch.id).length;

    return {
      ...branch,
      isActive: branchEmployees.length > 0,
      totalEmployees: branchEmployees.length,
      presentToday,
      salaryBudget,
    };
  });
}

function formatSalary(amount: number): string {
  if (amount === 0) return '-';
  return new Intl.NumberFormat('uz-UZ').format(amount) + ' UZS';
}

function BranchCard({
  branch,
  canManage,
  showSalary,
}: {
  branch: BranchWithStats;
  canManage: boolean;
  showSalary: boolean;
}) {
  const presencePercentage = branch.totalEmployees > 0
    ? Math.round((branch.presentToday / branch.totalEmployees) * 100)
    : 0;

  const hasGeofence = branch.latitude && branch.longitude;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
            <MapPin size={24} className="text-purple-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{branch.name}</h3>
            <p className="text-sm text-gray-500">{branch.address || 'No address'}</p>
          </div>
        </div>
        {branch.isActive ? (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-green-50 text-green-700 rounded-full text-xs font-medium">
            <CheckCircle size={12} />
            Active
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-50 text-gray-600 rounded-full text-xs font-medium">
            No Staff
          </span>
        )}
      </div>

      {/* Stats */}
      <div className={`grid ${showSalary ? 'grid-cols-3' : 'grid-cols-2'} gap-3 mb-4`}>
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
            <Users size={16} />
            <span>Staff</span>
          </div>
          <p className="text-lg font-semibold text-gray-900">
            {branch.totalEmployees}
          </p>
        </div>
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
            <Clock size={16} />
            <span>Present</span>
          </div>
          <p className="text-lg font-semibold text-gray-900">
            {branch.presentToday}
          </p>
        </div>
        {showSalary && (
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
              <Wallet size={16} />
              <span>Budget</span>
            </div>
            <p className="text-sm font-semibold text-gray-900">
              {formatSalary(branch.salaryBudget)}
            </p>
          </div>
        )}
      </div>

      {/* Presence Bar */}
      {branch.totalEmployees > 0 && (
        <div className="mb-4">
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="text-gray-500">Today&apos;s Presence</span>
            <span className="font-medium text-gray-900">{presencePercentage}%</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                presencePercentage >= 80
                  ? 'bg-green-500'
                  : presencePercentage >= 50
                  ? 'bg-yellow-500'
                  : 'bg-red-500'
              }`}
              style={{ width: `${presencePercentage}%` }}
            />
          </div>
        </div>
      )}

      {/* Geofence Info */}
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
        <Circle size={14} className={hasGeofence ? 'text-green-500' : 'text-gray-300'} />
        {hasGeofence ? (
          <span>Geofence: {branch.geofence_radius}m radius</span>
        ) : (
          <span className="text-orange-500">No geofence configured</span>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Link
          href={`/branches/${branch.id}`}
          className="flex-1 px-4 py-2 text-center text-sm font-medium text-purple-600 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
        >
          {canManage ? 'Edit Settings' : 'View Details'}
        </Link>
        {canManage && (
          <Link
            href={`/branches/${branch.id}`}
            className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
          >
            <Edit size={18} />
          </Link>
        )}
      </div>
    </div>
  );
}

export default async function BranchesPage() {
  const user = await getSession();

  if (!user) {
    redirect('/login');
  }

  // Check permission
  if (!hasPermission(user.role, 'manage_branches') && !hasPermission(user.role, 'view_presence')) {
    redirect('/dashboard');
  }

  const canManageBranches = hasPermission(user.role, 'manage_branches');
  const canViewSalaries = user.role === 'general_manager' || user.role === 'ceo';

  // Fetch real branch data from Supabase
  const branchesWithStats = await getBranchesWithStats();

  // Sort: branches with employees first, then by name
  const sortedBranches = [...branchesWithStats].sort((a, b) => {
    if (a.totalEmployees > 0 && b.totalEmployees === 0) return -1;
    if (a.totalEmployees === 0 && b.totalEmployees > 0) return 1;
    return a.name.localeCompare(b.name);
  });

  const activeBranches = sortedBranches.filter(b => b.totalEmployees > 0);
  const totalEmployees = sortedBranches.reduce((sum, b) => sum + b.totalEmployees, 0);
  const totalPresent = sortedBranches.reduce((sum, b) => sum + b.presentToday, 0);
  const totalSalaryBudget = sortedBranches.reduce((sum, b) => sum + b.salaryBudget, 0);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Branches</h1>
          <p className="text-gray-500 mt-1">
            Manage C-Space coworking locations and geofencing settings
          </p>
        </div>
        {canManageBranches && (
          <Link
            href="/branches/new"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors"
          >
            <Plus size={20} />
            Add Branch
          </Link>
        )}
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Total Branches</p>
          <p className="text-2xl font-semibold text-gray-900 mt-1">{sortedBranches.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm text-gray-500">With Staff</p>
          <p className="text-2xl font-semibold text-gray-900 mt-1">
            {activeBranches.length}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Total Staff</p>
          <p className="text-2xl font-semibold text-gray-900 mt-1">{totalEmployees}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Present Now</p>
          <p className="text-2xl font-semibold text-green-600 mt-1">{totalPresent}</p>
        </div>
        {canViewSalaries && (
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-sm text-gray-500">Monthly Budget</p>
            <p className="text-lg font-semibold text-gray-900 mt-1">{formatSalary(totalSalaryBudget)}</p>
          </div>
        )}
      </div>

      {/* Interactive Map */}
      <div className="mb-6">
        <BranchMap
          branches={sortedBranches.map(b => ({
            id: b.id,
            name: b.name,
            address: b.address,
            latitude: b.latitude,
            longitude: b.longitude,
            geofence_radius: b.geofence_radius,
            totalEmployees: b.totalEmployees,
            presentToday: b.presentToday,
          }))}
          height="450px"
        />
      </div>

      {/* Branch Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sortedBranches.map((branch) => (
          <BranchCard
            key={branch.id}
            branch={branch}
            canManage={canManageBranches}
            showSalary={canViewSalaries}
          />
        ))}
      </div>

      {sortedBranches.length === 0 && (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <MapPin size={48} className="mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No branches yet</h3>
          <p className="text-gray-500 mb-4">Get started by adding your first branch location.</p>
          {canManageBranches && (
            <Link
              href="/branches/new"
              className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors"
            >
              <Plus size={20} />
              Add Branch
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
